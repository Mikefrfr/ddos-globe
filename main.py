from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("ABUSEIPDB_API_KEY")
if not API_KEY:
    raise ValueError("ABUSEIPDB_API_KEY not set in .env file")

IP2LOCATION_KEY = os.getenv("IP2LOCATION_API_KEY")

# Helper function to map category IDs to readable names
def get_attack_category(categories):
    category_map = {
        4: "DDoS",
        9: "Open Proxy",
        11: "Email Spam",
        14: "Port Scan",
        15: "Hacking",
        16: "SQL Injection",
        18: "Brute-Force",
        19: "Bad Web Bot",
        21: "Web App Attack",
        22: "SSH Attack"
    }
    
    if not categories:
        return "Unknown Attack"
    
    for cat_id in categories:
        if cat_id in category_map:
            return category_map[cat_id]
    return "Malicious Activity"

@app.get("/")
async def root():
    return {
        "message": "Threat Intelligence Globe API",
        "endpoints": [
            "/api/live-attacks",
            "/api/check-ip",
            "/api/globe-data"
        ]
    }

@app.get("/api/live-attacks")
async def get_live_attacks(limit: int = 20):
    """Fetch real attack data with city locations from AbuseIPDB"""
    try:
        # Fetch blacklist from AbuseIPDB
        response = requests.get(
            "https://api.abuseipdb.com/api/v2/blacklist",
            headers={"Key": API_KEY, "Accept": "application/json"},
            params={"confidenceMinimum": 80, "limit": limit}
        )
        
        if response.status_code != 200:
            return {"success": False, "error": f"Failed to fetch from AbuseIPDB: {response.status_code}"}
        
        data = response.json()
        attacks = []
        
        # Get city location for each IP using IP-API
        for ip_data in data.get("data", []):
            ip = ip_data.get("ipAddress")
            
            try:
                # Get geolocation data
                geo_response = requests.get(f"http://ip-api.com/json/{ip}", timeout=2)
                geo_data = geo_response.json()
                
                if geo_data.get("status") == "success":
                    lat = geo_data.get("lat")
                    lon = geo_data.get("lon")
                    
                    # Validate coordinates
                    if lat and lon:
                        # Check if coordinates are within valid ranges
                        if -90 <= lat <= 90 and -180 <= lon <= 180:
                            attacks.append({
                                "ip": ip,
                                "city": geo_data.get("city", "Unknown"),
                                "lat": lat,
                                "lon": lon,
                                "country": geo_data.get("countryCode"),
                                "confidence": ip_data.get("abuseConfidenceScore", 0),
                                "attackType": get_attack_category(ip_data.get("categories", [])),
                                "isp": geo_data.get("isp", "Unknown")
                            })
                            print(f"✅ Added: {geo_data.get('city')} ({lat}, {lon})")
                        else:
                            print(f"⚠️ Invalid coordinates for {ip}: ({lat}, {lon})")
                    else:
                        print(f"⚠️ No coordinates for {ip}")
                        
            except Exception as e:
                print(f"Error geolocating {ip}: {e}")
                continue
        
        print(f"📊 Total attacks with valid coordinates: {len(attacks)}")
        
        return {
            "success": True,
            "attacks": attacks,
            "total": len(attacks)
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/check-ip")
async def check_ip(ip: str):
    """Check a specific IP against AbuseIPDB and get city-level location from ip-api.com"""
    try:
        import re
        ip_pattern = r'^(\d{1,3}\.){3}\d{1,3}$'
        if not re.match(ip_pattern, ip):
            return {
                "success": False,
                "error": "Invalid IP address format"
            }
        
        # Call AbuseIPDB API for threat data
        abuse_response = requests.get(
            "https://api.abuseipdb.com/api/v2/check",
            headers={
                "Key": API_KEY,
                "Accept": "application/json"
            },
            params={
                "ipAddress": ip,
                "maxAgeInDays": 90,
                "verbose": True
            }
        )
        
        if abuse_response.status_code != 200:
            return {"success": False, "error": f"AbuseIPDB Error: {abuse_response.status_code}"}
        
        abuse_data = abuse_response.json()
        report_data = abuse_data.get("data", {})
        
        # Get city-level location from ip-api.com (no API key required)
        lat = None
        lon = None
        city = None
        country = report_data.get("countryName")
        
        try:
            geo_response = requests.get(
                f"http://ip-api.com/json/{ip}",
                params={
                    "fields": "status,country,city,lat,lon,isp"
                },
                timeout=3
            )
            
            if geo_response.status_code == 200:
                geo_data = geo_response.json()
                if geo_data.get("status") == "success":
                    lat = geo_data.get("lat")
                    lon = geo_data.get("lon")
                    city = geo_data.get("city")
                    country = geo_data.get("country") or country
        except Exception as e:
            print(f"ip-api.com error: {e}")
        
        return {
            "success": True,
            "data": {
                **report_data,
                "latitude": lat,
                "longitude": lon,
                "cityName": city or report_data.get("countryName"),
                "countryName": country
            }
        }
            
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/globe-data")
async def get_globe_data():
    """Get AbuseIPDB data formatted for the globe"""
    try:
        response = requests.get(
            "https://api.abuseipdb.com/api/v2/blacklist",
            headers={"Key": API_KEY, "Accept": "application/json"},
            params={"confidenceMinimum": 80, "limit": 10000}
        )
        
        if response.status_code != 200:
            return {"error": "Failed to fetch data"}
        
        data = response.json()
        
        # Aggregate by country
        from collections import defaultdict
        country_stats = defaultdict(lambda: {"total_ips": 0, "confidence_sum": 0})
        
        for ip in data.get("data", []):
            country = ip.get("countryCode")
            if country and country != "UNKNOWN":
                country_stats[country]["total_ips"] += 1
                country_stats[country]["confidence_sum"] += ip.get("abuseConfidenceScore", 0)
        
        # Calculate averages and find max for coloring
        max_ips = 0
        result = {}
        
        for country, stats in country_stats.items():
            avg_confidence = stats["confidence_sum"] / stats["total_ips"]
            result[country] = {
                "total_ips": stats["total_ips"],
                "avg_confidence": round(avg_confidence, 1)
            }
            if stats["total_ips"] > max_ips:
                max_ips = stats["total_ips"]
        
        return {
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
            "max_ips": max_ips,
            "countries": result
        }
        
    except Exception as e:
        return {"error": str(e)}
    
@app.get("/api/check-ip")
async def check_ip(ip: str):
    """Check a specific IP against AbuseIPDB"""
    try:
        # Validate IP format (basic check)
        import re
        ip_pattern = r'^(\d{1,3}\.){3}\d{1,3}$'
        if not re.match(ip_pattern, ip):
            return {
                "success": False,
                "error": "Invalid IP address format"
            }
        
        # Call AbuseIPDB API
        response = requests.get(
            "https://api.abuseipdb.com/api/v2/check",
            headers={
                "Key": API_KEY,
                "Accept": "application/json"
            },
            params={
                "ipAddress": ip,
                "maxAgeInDays": 90,
                "verbose": True
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            return {
                "success": True,
                "data": data.get("data", {})
            }
        elif response.status_code == 429:
            return {
                "success": False,
                "error": "Rate limit exceeded. Please try again later."
            }
        else:
            return {
                "success": False,
                "error": f"API Error: {response.status_code}",
                "details": response.text
            }
            
    except requests.exceptions.Timeout:
        return {"success": False, "error": "Request timeout. Please try again."}
    except requests.exceptions.ConnectionError:
        return {"success": False, "error": "Cannot connect to AbuseIPDB. Check your internet."}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)