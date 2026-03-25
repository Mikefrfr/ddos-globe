from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://mikefrfr.github.io/ddos-globe/"],  # Your GitHub Pages URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("ABUSEIPDB_API_KEY")
if not API_KEY:
    raise ValueError("ABUSEIPDB_API_KEY not set in .env file")

IP2LOCATION_KEY = os.getenv("IP2LOCATION_API_KEY")

#map category IDs to readable names
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
        ]
    }

@app.get("/api/live-attacks")
async def get_live_attacks(limit: int = 20):
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
        
        # Get city location IP using IP-API
        for ip_data in data.get("data", []):
            ip = ip_data.get("ipAddress")
            
            try:

                geo_response = requests.get(f"http://ip-api.com/json/{ip}", timeout=2)
                geo_data = geo_response.json()
                
                if geo_data.get("status") == "success":
                    lat = geo_data.get("lat")
                    lon = geo_data.get("lon")
                    
                    if lat and lon:
                        # Check if coordinates within valid ranges
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
                            print(f"Added: {geo_data.get('city')} ({lat}, {lon})")
                        else:
                            print(f"Invalid coordinates for {ip}: ({lat}, {lon})")
                    else:
                        print(f"No coordinates for {ip}")
                        
            except Exception as e:
                print(f"Error geolocating {ip}: {e}")
                continue
        
        print(f"Total attacks with valid coordinates: {len(attacks)}")
        
        return {
            "success": True,
            "attacks": attacks,
            "total": len(attacks)
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}
    
# To check a specific ip using abuseIPDB and ip-api data
@app.get("/api/check-ip")
async def check_ip(ip: str):
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
        
        # Get city-level location from ip-api
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)