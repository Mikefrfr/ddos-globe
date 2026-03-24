import * as THREE from "three";
import Globe from "three-globe";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import getStarfield from "./src/getStarfield.js";

const tooltip = document.getElementById('globe-tooltip');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 0, 400);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xf6ff14, 0.9));
const directionalLight = new THREE.DirectionalLight(0xf6ff14, 0.8);
directionalLight.position.set(200, 200, 200);
scene.add(directionalLight);

const stars = getStarfield({ numStars: 1000});
scene.add(stars);

const titleCanvas = document.createElement('canvas');
titleCanvas.width = 1024;
titleCanvas.height = 256;

const titleTexture = new THREE.CanvasTexture(titleCanvas);
const titleMaterial = new THREE.SpriteMaterial({ map: titleTexture, transparent: true });
const titleSprite = new THREE.Sprite(titleMaterial);
titleSprite.scale.set(12, 3, 1);
titleSprite.position.set(0, 280, 0);
scene.add(titleSprite);

//Mock traffic data 
const mockTrafficData = {
  'USA': { traffic: 850, name: 'United States' },
  'CHN': { traffic: 920, name: 'China' },
  'IND': { traffic: 780, name: 'India' },
  'BRA': { traffic: 450, name: 'Brazil' },
  'RUS': { traffic: 380, name: 'Russia' },
  'GBR': { traffic: 420, name: 'United Kingdom' },
  'FRA': { traffic: 390, name: 'France' },
  'DEU': { traffic: 410, name: 'Germany' },
  'JPN': { traffic: 520, name: 'Japan' },
  'KOR': { traffic: 340, name: 'South Korea' },
  'AUS': { traffic: 280, name: 'Australia' },
  'CAN': { traffic: 360, name: 'Canada' },
  'MEX': { traffic: 220, name: 'Mexico' },
  'ZAF': { traffic: 150, name: 'South Africa' },
  'EGY': { traffic: 180, name: 'Egypt' },
  'SAU': { traffic: 200, name: 'Saudi Arabia' },
  'ARG': { traffic: 140, name: 'Argentina' },
  'IDN': { traffic: 290, name: 'Indonesia' },
  'PAK': { traffic: 210, name: 'Pakistan' },
  'NGA': { traffic: 170, name: 'Nigeria' }
};

// Function to get color based on traffic value
function getTrafficColor(traffic) {
  if (!traffic) return '#dddddd';

  const normalizedTraffic = Math.min(traffic / 1000, 1);

  const greenValue = Math.floor(255 * (1 - normalizedTraffic));
  
  return `rgb(255, ${greenValue}, 0)`;
}

// Globe with traffic-based colors
const globe = new Globe()
  .hexPolygonResolution(3)
  .hexPolygonMargin(0.2)
  .hexPolygonColor(({ properties }) => {
    const countryCode = properties.ISO_A3 || properties.iso_a3 || properties.adm0_a3;
    const trafficData = mockTrafficData[countryCode];
    return getTrafficColor(trafficData?.traffic);
  })
  .showAtmosphere(true)
  .atmosphereColor("#f6ff14")
  .atmosphereAltitude(0.1);

scene.add(globe);

// Load GeoJSON
fetch("./geojson/custom.geo.json")
  .then((res) => res.json())
  .then((data) => {
    globe.hexPolygonsData(data.features);
  });

//Pulsing Markers
let attackMarkers = [];
let pulseTime = 0;

// Mock attack locations
const mockAttacks = [
  { lat: 40.7128, lon: -74.0060, confidence: 95, ip: "185.130.5.253", type: "DDoS", country: "USA" },
  { lat: 39.9042, lon: 116.4074, confidence: 92, ip: "103.45.67.89", type: "Port Scan", country: "CHN" },
  { lat: 55.7558, lon: 37.6173, confidence: 88, ip: "185.130.5.254", type: "Brute-Force", country: "RUS" },
  { lat: 51.5074, lon: -0.1278, confidence: 85, ip: "45.33.22.11", type: "Web Attack", country: "GBR" },
  { lat: 48.8566, lon: 2.3522, confidence: 82, ip: "89.45.67.123", type: "SQL Injection", country: "FRA" },
  { lat: 52.5200, lon: 13.4050, confidence: 79, ip: "46.28.45.67", type: "Spam", country: "DEU" },
  { lat: 35.6762, lon: 139.6503, confidence: 91, ip: "210.48.33.22", type: "DDoS", country: "JPN" },
  { lat: 37.5665, lon: 126.9780, confidence: 76, ip: "115.85.44.33", type: "Port Scan", country: "KOR" },
  { lat: -33.8688, lon: 151.2093, confidence: 84, ip: "101.45.67.89", type: "Brute-Force", country: "AUS" },
  { lat: 43.6532, lon: -79.3832, confidence: 81, ip: "99.88.77.66", type: "Web Attack", country: "CAN" }
];

function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = lon * Math.PI / 180;
  const x = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.cos(theta);
  return new THREE.Vector3(x, y, z);
}

// Function to create a pulsing marker
function createPulsingMarker(lat, lon, confidence, ip, attackType, city) {
  const radius = 101.5;
  const position = latLonToVector3(lat, lon, radius);
  
  let color;
  if (confidence >= 90) {
    color = 0xff0000;
  } else if (confidence >= 70) {
    color = 0xff6600;
  } else {
    color = 0xffaa00;
  }
  
  //group to hold all marker elements
  const group = new THREE.Group();
  group.position.copy(position);
  
  //cone
  const coneGeometry = new THREE.ConeGeometry(0.4, 1.2, 8);
  const coneMaterial = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 0.3
  });
  const cone = new THREE.Mesh(coneGeometry, coneMaterial);
  cone.position.y = -0.8;
  group.add(cone);
  
  //sphere
  const sphereGeometry = new THREE.SphereGeometry(0.6, 16, 16);
  const sphereMaterial = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 0.5
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.y = -0.2;
  group.add(sphere);
  
  //pulsing ring
  const ringGeometry = new THREE.RingGeometry(0.8, 1.6, 32);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.y = 0.01;
  ring.lookAt(0, 0, 0);
  group.add(ring);
  
  const light = new THREE.PointLight(color, 0.5, 30);
  light.position.y = 0.2;
  group.add(light);
  
  //data tooltip
  group.userData = {
    type: "attack",
    ip: ip,
    confidence: confidence,
    attackType: attackType,
    city: city,
    light: light,
    ring: ring
  };

    //marker point outward from the globe's center
  group.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    position.clone().normalize()
  ));
  
  return group;
  
}

async function loadAttackMarkers() {
  try {
    const response = await fetch('/api/live-attacks?limit=20');
    const data = await response.json();
    
    if (data.success && data.attacks.length > 0) {
      // Remove old markers
      attackMarkers.forEach(marker => scene.remove(marker));
      attackMarkers = [];
      
      // Add new markers
      data.attacks.forEach(attack => {
        // Only add if valid coordinates
        if (attack.lat && attack.lon) {
          const marker = createPulsingMarker(
            attack.lat,
            attack.lon,
            attack.confidence,
            attack.ip,
            attack.attackType,
            attack.city
          );
          scene.add(marker);
          attackMarkers.push(marker);
        }
      });
      
      console.log(`Added ${attackMarkers.length} real attack markers from AbuseIPDB`);
      console.log(`Locations: ${attackMarkers.length} cities with active threats`);
    } else {
      console.log('No real attack data available, using mock data');
      loadMockAttackMarkers();
    }
  } catch (error) {
    console.error('Error fetching attack data:', error);
    loadMockAttackMarkers();
  }
}

function loadMockAttackMarkers() {
  // Remove old markers
  attackMarkers.forEach(marker => scene.remove(marker));
  attackMarkers = [];
  
  mockAttacks.forEach(attack => {
    const marker = createPulsingMarker(
      attack.lat, 
      attack.lon, 
      attack.confidence, 
      attack.ip, 
      attack.type,
      attack.city
    );
    scene.add(marker);
    attackMarkers.push(marker);
  });
  
  console.log(`Using ${attackMarkers.length} mock attack markers (fallback mode)`);
}

loadAttackMarkers();

let tempMarker = null;

// Function to validate IP address
function isValidIP(ip) {
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipPattern.test(ip)) return false;
  
  const octets = ip.split('.');
  return octets.every(octet => {
    const num = parseInt(octet, 10);
    return num >= 0 && num <= 255;
  });
}



// Function to add temporary marker
function addTemporaryMarker(lat, lon, ip, city, country) {
  if (tempMarker) {
    scene.remove(tempMarker);
  }
  
  const radius = 101.5;
  const position = latLonToVector3(lat, lon, radius);
  
  const color = 0x00ffff;
  
  // Create a group
  const group = new THREE.Group();
  group.position.copy(position);
  
  //cone
  const coneGeometry = new THREE.ConeGeometry(0.4, 1.2, 8);
  const coneMaterial = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 0.3
  });
  const cone = new THREE.Mesh(coneGeometry, coneMaterial);
  cone.position.y = -0.8;
  group.add(cone);
  
  //sphere
  const sphereGeometry = new THREE.SphereGeometry(0.6, 16, 16);
  const sphereMaterial = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 0.5
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.y = -0.2;
  group.add(sphere);
  
  //pulsing ring
  const ringGeometry = new THREE.RingGeometry(0.8, 1.6, 32);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.y = 0.01;
  ring.lookAt(0, 0, 0);
  group.add(ring);
  
  const light = new THREE.PointLight(color, 0.5, 30);
  light.position.y = 0.2;
  group.add(light);
  
  //data tooltip
  group.userData = {
    type: "temp",
    ip: ip,
    city: city,
    country: country,
    lat: lat,
    lon: lon,
    light: light,
    ring: ring
  };
  
  // Make the marker point outward from the globe's center
  group.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    position.clone().normalize()
  ));
  
  scene.add(group);
  tempMarker = group;
  
  // Add pulse animation
  let pulseTime = 0;
  function animateTempMarker() {
    if (!tempMarker || tempMarker !== group) return;
    pulseTime += 0.05;
    const data = tempMarker.userData;
    if (data && data.ring) {
      const scale = 1 + Math.sin(pulseTime) * 0.6;
      data.ring.scale.set(scale, scale, 1);
      data.ring.material.opacity = 0.5 + Math.sin(pulseTime) * 0.4;
      if (data.light) {
        data.light.intensity = 0.5 + Math.sin(pulseTime) * 0.3;
      }
      const sphere = tempMarker.children.find(child => child.geometry && child.geometry.type === 'SphereGeometry');
      if (sphere) {
        const sphereScale = 1 + Math.sin(pulseTime) * 0.2;
        sphere.scale.set(sphereScale, sphereScale, sphereScale);
      }
    }
    requestAnimationFrame(animateTempMarker);
  }
  animateTempMarker();

  return group;
}

// Function to remove temporary marker
function removeTemporaryMarker() {
  if (tempMarker) {
    scene.remove(tempMarker);
    tempMarker = null;
  }
}

// Function to fly to location
function flyToLocation(lat, lon, name) {
  // Convert lat/lon to a position in 3D space at camera distance
  const distance = camera.position.length();
  const targetPosition = latLonToVector3(lat, lon, distance);
  
  // Animate camera rotation
  const startPosition = camera.position.clone();
  const startTime = performance.now();
  const duration = 800;
  
  function animateCamera(now) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    
    // Smooth easing
    const ease = 1 - Math.pow(1 - t, 3);
    
    // Interpolate camera position
    camera.position.lerpVectors(startPosition, targetPosition, ease);
    
    // Keep looking at globe center
    controls.target.set(0, 0, 0);
    controls.update();
    
    if (t < 1) {
      requestAnimationFrame(animateCamera);
    }
  }
  
  requestAnimationFrame(animateCamera);
  
  // Show tooltip message
  const tooltip = document.getElementById('globe-tooltip');
  tooltip.innerHTML = `🎯 Rotating to ${name}`;
  tooltip.style.display = 'block';
  setTimeout(() => {
    tooltip.style.display = 'none';
  }, 2000);
}

// Function to check if IP is private
function isPrivateIP(ip) {
  const parts = ip.split('.');
  const first = parseInt(parts[0]);
  const second = parseInt(parts[1]);
  
  // Private IP ranges
  if (first === 10) return true;                    // 10.0.0.0 - 10.255.255.255
  if (first === 127) return true;                  // 127.0.0.0 - 127.255.255.255 (loopback)
  if (first === 169 && second === 254) return true; // 169.254.0.0 - 169.254.255.255 (APIPA)
  if (first === 172 && second >= 16 && second <= 31) return true; // 172.16.0.0 - 172.31.255.255
  if (first === 192 && second === 168) return true; // 192.168.0.0 - 192.168.255.255
  
  return false;
}

// Function to search IP
async function searchIP(ip) {
  const resultDiv = document.getElementById('ip-search-result');
  
  // Validate IP
  if (!ip || !isValidIP(ip)) {
    resultDiv.style.display = 'block';
    resultDiv.style.border = '1px solid #ff4444';
    resultDiv.innerHTML = `
      <span style="color: #ff4444;">❌ Invalid IP address format</span><br>
      <span style="color: #f6ff14; font-size: 10px;">Please use format: 192.168.1.1</span>
    `;
    return;
  }

  // After this line:
if (!ip || !isValidIP(ip)) {
  // ... existing code
}

// Add this check:
if (isPrivateIP(ip)) {
  resultDiv.style.display = 'block';
  resultDiv.style.border = '1px solid #ffaa44';
  resultDiv.innerHTML = `
    <div style="color: #ffaa44; font-weight: bold; margin-bottom: 8px;">
      PRIVATE IP ADDRESS
    </div>
    <div style="border-top: 1px solid #333; margin: 8px 0;"></div>
    <div><span style="color: #f6ff14;">IP:</span> <span style="color: #fff;">${ip}</span></div>
    <div><span style="color: #f6ff14;">Type:</span> <span style="color: #ffaa44;">Private / Local Network</span></div>
    <div><span style="color: #f6ff14;">Info:</span> <span style="color: #fff;">This IP is not routable on the internet. Only accessible within local network.</span></div>
  `;
  showResult();
  return;
}
  
  // Remove existing temp marker
  removeTemporaryMarker();
  
  // Show loading
  resultDiv.style.display = 'block';
  resultDiv.style.border = '1px solid #f6ff14';
  resultDiv.innerHTML = `
    <span style="color: #f6ff14;">Searching AbuseIPDB...</span>
    <div style="margin-top: 5px;">
      <span style="color: #ffaa44;">IP: ${ip}</span>
    </div>
  `;
  
  try {
    // Call backend API
    const response = await fetch('/api/check-ip?ip=' + ip);
    const data = await response.json();
    
    if (data.success && data.data) {
      const report = data.data;
      const confidence = report.abuseConfidenceScore;
      const totalReports = report.totalReports;

      const lat = report.latitude;
      const lon = report.longitude;
      const city = report.cityName || 'Unknown';
      const country = report.countryName || report.countryCode || 'Unknown';
      
      let borderColor, statusColor, statusText;
      if (confidence >= 80) {
        borderColor = '#ff4444';
        statusColor = '#ff4444';
        statusText = '⚠️ HIGH THREAT';
      } else if (confidence >= 50) {
        borderColor = '#ffaa44';
        statusColor = '#ffaa44';
        statusText = '⚠️ MEDIUM THREAT';
      } else if (totalReports > 0) {
        borderColor = '#ffaa44';
        statusColor = '#ffaa44';
        statusText = 'REPORTS: ';
      } else {
        borderColor = '#44ff44';
        statusColor = '#44ff44';
        statusText = 'CLEAN';
      }
      
      resultDiv.style.border = `1px solid ${borderColor}`;
      
      // result HTML
      let html = `
        <div style="color: ${statusColor}; font-weight: bold; margin-bottom: 8px;">
          ${statusText}
        </div>
        <div style="border-top: 1px solid #333; margin: 8px 0;background: rgba(0, 0, 0, 0);"></div>
        <div><span style="color: #f6ff14;">IP:</span> <span style="color: #fff;">${report.ipAddress}</span></div>
        <div><span style="color: #f6ff14;">Confidence:</span> <span style="color: #fff;">${confidence}%</span></div>
        <div><span style="color: #f6ff14;">Total Reports:</span> <span style="color: #fff;">${totalReports}</span></div>
        <div><span style="color: #f6ff14;">Country:</span> <span style="color: #fff;">${country}</span></div>
        <div><span style="color: #f6ff14;">ISP:</span> <span style="color: #fff;">${report.isp || 'Unknown'}</span></div>
      `;
      
      if (report.lastReportedAt) {
        const lastReported = new Date(report.lastReportedAt).toLocaleString();
        html += `<div><span style="color: #f6ff14;">Last Reported:</span> <span style="color: #fff;">${lastReported}</span></div>`;
      }
      
      // Add marker if coordinates available
      if (lat && lon) {
        addTemporaryMarker(lat, lon, ip, city, country);
        html += `
          <div style="border-top: 1px solid #00ffff; margin: 8px 0;background: rgba(0, 0, 0, 0);"></div>
          <div style="color: #00ffff;"> Marker added on globe!</div>
          <div><span style="color: #f6ff14;"> Location:</span> <span style="color: #fff;">${city}, ${country}</span></div>
          <div><span style="color: #f6ff14;"> Coordinates:</span> <span style="color: #fff;">${lat.toFixed(2)}, ${lon.toFixed(2)}</span></div>
          <button id="fly-to-searched-btn" style="
            background: #00ffff;
            color: black;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            margin-top: 10px;
            cursor: pointer;
            font-weight: bold;
            font-size: 12px;
            width: 100%;
          ">Fly to Location</button>
        `;
      } else {
        html += `
          <div style="border-top: 1px solid #ffaa44; margin: 8px 0;background: rgba(0, 0, 0, 0);"></div>
          <div style="color: #ffaa44;">⚠️ No location data available for this IP</div>
        `;
      }
      
      resultDiv.innerHTML = html;
      
      // Add fly to location button handler
      if (lat && lon) {
        setTimeout(() => {
          const flyBtn = document.getElementById('fly-to-searched-btn');
          if (flyBtn) {
            flyBtn.onclick = () => {
              flyToLocation(lat, lon, city);
            };
          }
        }, 100);
      }
      
    } else {
      resultDiv.style.border = '1px solid #ff4444';
      resultDiv.innerHTML = `
        <span style="color: #ff4444;">❌ ${data.error || 'Could not check IP. Please try again.'}</span>
      `;
    }
    
    
  } catch (error) {
    resultDiv.style.border = '1px solid #ff4444';
    resultDiv.style.background = 'rgba(0, 0, 0, 0)';
    resultDiv.innerHTML = `
      <span style="color: #ff4444;">❌ Connection Error</span><br>
      <span style="color: #f6ff14; font-size: 10px;">${error.message}</span><br>
    `;
  }
}
// Function to clear search
function clearSearch() {
  document.getElementById('ip-search-input').value = '';

  const resultDiv = document.getElementById('ip-search-result');
  resultDiv.style.display = 'none';
  resultDiv.innerHTML = '';

  removeTemporaryMarker();
  
}

// Add event listeners
document.getElementById('ip-search-btn').addEventListener('click', () => {
  const ip = document.getElementById('ip-search-input').value.trim();
  searchIP(ip);
});

document.getElementById('ip-search-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const ip = e.target.value.trim();
    searchIP(ip);
  }
});

document.getElementById('ip-clear-btn').addEventListener('click', () => {
  clearSearch();
});

//Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('mousemove', (event) => {
  // Update mouse coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Move Tooltip UI
  tooltip.style.left = `${event.clientX + 15}px`;
  tooltip.style.top = `${event.clientY + 15}px`;
});

//Animation
function animate() {
  requestAnimationFrame(animate);
  
  // Animate pulsing pins and rings
  pulseTime += 0.05;
  attackMarkers.forEach(marker => {
    const data = marker.userData;
    if (data && data.ring) {
      // Pulse the ring size
      const scale = 1 + Math.sin(pulseTime) * 0.6;
      data.ring.scale.set(scale, scale, 1);
      data.ring.material.opacity = 0.5 + Math.sin(pulseTime) * 0.4;
      
      // Pulse the light intensity
      if (data.light) {
        data.light.intensity = 0.5 + Math.sin(pulseTime) * 0.3;
      }
      
      // Pulse the sphere
      const sphere = marker.children.find(child => child.geometry && child.geometry.type === 'SphereGeometry');
      if (sphere) {
        const sphereScale = 1 + Math.sin(pulseTime) * 0.2;
        sphere.scale.set(sphereScale, sphereScale, sphereScale);
      }
    }
  });

  // Raycast Check for both globe and markers
  raycaster.setFromCamera(mouse, camera);

  let allMarkers = [...attackMarkers];
    if (tempMarker) {
      allMarkers.push(tempMarker);
  }
  
  const markerIntersects = raycaster.intersectObjects(allMarkers, true);
  
  if (markerIntersects.length > 0) {
    // Find the group parent
    let markerGroup = markerIntersects[0].object;
    while (markerGroup && !markerGroup.userData?.type) {
      markerGroup = markerGroup.parent;
    }
    
    if (markerGroup && markerGroup.userData?.type === "attack") {
      const data = markerGroup.userData;
      tooltip.innerHTML = `
        <strong>⚠️ LIVE THREAT</strong><br>
        ${data.city}<br>
        IP: ${data.ip}<br>
        Type: ${data.attackType}<br>
        Confidence: ${data.confidence}%<br>
        Active Now
      `;
      tooltip.style.display = 'block';
    } 
    else if (markerGroup && markerGroup.userData?.type === "temp") {
      const data = markerGroup.userData;
      tooltip.innerHTML = `
        <strong>SEARCHED IP</strong><br>
        ${data.city}, ${data.country}<br>
        IP: ${data.ip}<br>
        Type: Temporary Marker<br>
        Click Clear to remove
      `;
      tooltip.style.display = 'block';
    }
    else {
      tooltip.style.display = 'none';
    }
  } else {
    // Check globe polygons
    const intersects = raycaster.intersectObjects(globe.children, true);
    if (intersects.length > 0) {
      const hit = intersects.find(i => i.object.__data);
      if (hit) {
        const d = hit.object.__data;
        const countryCode = d.properties.ISO_A3 || d.properties.iso_a3 || d.properties.adm0_a3;
        const trafficData = mockTrafficData[countryCode];
        const trafficDisplay = trafficData ? `${trafficData.traffic} Mbps` : 'No data';
        tooltip.innerHTML = `<strong>${d.properties.NAME || d.properties.name || d.properties.admin || "Unknown"}</strong><br>Traffic: ${trafficDisplay}`;
        tooltip.style.display = 'block';
      } else {
        tooltip.style.display = 'none';
      }
    } else {
      tooltip.style.display = 'none';
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});