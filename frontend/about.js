import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import getStarfield from "./src/getStarfield.js";

// Create scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Create camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 0, 400);

// Create renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add stars
const stars = getStarfield({ numStars: 1000 });
scene.add(stars);

// Store mouse position
let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;

// Mouse move event
document.addEventListener('mousemove', (event) => {
  // Normalize mouse coordinates to range -1 to 1
  mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  mouseY = (event.clientY / window.innerHeight) * 2 - 1;
  
  // Invert for opposite direction effect
  targetX = mouseX * 0.5;
  targetY = mouseY * 0.5;
});

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Animation
function animate() {
  requestAnimationFrame(animate);
  
  // Smooth star movement
  stars.rotation.y += (targetX - stars.rotation.y) * 0.05;
  stars.rotation.x += (targetY - stars.rotation.x) * 0.05;
  
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});