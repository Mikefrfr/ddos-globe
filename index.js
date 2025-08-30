import * as THREE from "three";
import Globe from "three-globe";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import getStarfield from "./src/getStarfield.js";

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Scene & Camera ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 0, 400);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xf6ff14, 0.9);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xf6ff14, 0.8);
directionalLight.position.set(200, 200, 200);
scene.add(directionalLight);

const stars = getStarfield({ numStars: 1000});
scene.add(stars);

// --- Globe ---
const globe = new Globe()
  // .globeImageUrl("//unpkg.com/three-globe/example/img/earth-night.jpg")
  // .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
  .hexPolygonResolution(3)
  .hexPolygonMargin(0.6)
  .hexPolygonColor(() => "#f6ff14")
  .showAtmosphere(true)
  .atmosphereColor("#f6ff14")
  .atmosphereAltitude(0.1)
  // .hexPolygonAltitude(0.01);

scene.add(globe);

// --- Load GeoJSON data ---
fetch("./geojson/custom.geo.json")
  .then((res) => res.json())
  .then((data) => {
    globe.hexPolygonsData(data.features);
  })
  .catch((err) => console.error("GeoJSON load error:", err));

// --- Animation loop ---
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// --- Resize handling ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
