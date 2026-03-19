// === REMBOT Skater — Main Entry Point ===

import * as THREE from 'three';
import { EffectComposer, RenderPass, BloomEffect, EffectPass, SMAAEffect } from 'postprocessing';
import { COLORS, LIGHTING, POST, CAMERA as CAM_CONFIG } from './config.js';
import { initInput, pollCameraToggle, pollHudToggle } from './input.js';
// import { initAudio } from './audio.js';
import { createCamera, updateCamera, onResize, toggleCameraMode, getCamera } from './camera.js';
import { createHUD, toggleHUD } from './hud.js';
import { buildLevel } from './level.js';
import { createPlayer, updatePlayer, getPlayerState } from './player.js';
import { showCharacterSelect } from './characterSelect.js';

let renderer, scene, camera, composer;
let clock;

async function init(character) {
  // === Renderer ===
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  // === Scene ===
  scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.skyTop);

  // Fog
  scene.fog = new THREE.FogExp2(COLORS.fog, 0.018);

  // === Sky Gradient ===
  createSky();

  // === Camera ===
  camera = createCamera();

  // === Lighting ===
  setupLighting();

  // === Level ===
  buildLevel(scene);

  // === Player ===
  await createPlayer(scene, character.modelPath, character.texturePath);

  // === Post-Processing ===
  setupPostProcessing();

  // === Input & Audio ===
  initInput();
  // initAudio();

  // === Debug HUD ===
  createHUD();

  // === Events ===
  window.addEventListener('resize', handleResize);

  // === Timer ===
  clock = new THREE.Timer();

  // === Start ===
  animate();
}

function createSky() {
  const skyGeo = new THREE.SphereGeometry(90, 32, 15);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x1a0a2a) },
      horizonColor: { value: new THREE.Color(0x6a2a8a) },
      bottomColor: { value: new THREE.Color(0x2a1040) },
      offset: { value: 10 },
      exponent: { value: 0.6 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        if (h > 0.0) {
          gl_FragColor = vec4(mix(horizonColor, topColor, pow(max(h, 0.0), exponent)), 1.0);
        } else {
          gl_FragColor = vec4(mix(horizonColor, bottomColor, pow(max(-h, 0.0), 0.4)), 1.0);
        }
      }
    `,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // Subtle horizon glow (sunset remnant)
  const glowGeo = new THREE.PlaneGeometry(200, 30);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x6a2a8a,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.set(0, 5, -80);
  scene.add(glow);
}

function setupLighting() {
  // Ambient
  const ambient = new THREE.AmbientLight(LIGHTING.ambientColor, LIGHTING.ambientIntensity);
  scene.add(ambient);

  // Main directional light (sun)
  const dirLight = new THREE.DirectionalLight(LIGHTING.dirColor, LIGHTING.dirIntensity);
  dirLight.position.set(...LIGHTING.dirPosition);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = LIGHTING.shadowMapSize;
  dirLight.shadow.mapSize.height = LIGHTING.shadowMapSize;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 60;
  dirLight.shadow.camera.left = -25;
  dirLight.shadow.camera.right = 25;
  dirLight.shadow.camera.top = 25;
  dirLight.shadow.camera.bottom = -25;
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);

  // Rim light (purple from behind)
  const rimLight = new THREE.DirectionalLight(LIGHTING.rimColor, LIGHTING.rimIntensity);
  rimLight.position.set(...LIGHTING.rimPosition);
  scene.add(rimLight);

  // Subtle hemisphere light for fill
  const hemiLight = new THREE.HemisphereLight(0x334466, 0x111122, 0.2);
  scene.add(hemiLight);
}

function setupPostProcessing() {
  composer = new EffectComposer(renderer);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Bloom for neon elements
  const bloom = new BloomEffect({
    intensity: POST.bloomIntensity,
    luminanceThreshold: POST.bloomThreshold,
    luminanceSmoothing: 0.08,
    mipmapBlur: true,
    radius: POST.bloomRadius,
  });

  // SMAA anti-aliasing
  const smaa = new SMAAEffect();

  const effectPass = new EffectPass(camera, bloom, smaa);
  composer.addPass(effectPass);
}

function handleResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  composer.setSize(w, h);
  onResize();
}

function animate(timestamp) {
  requestAnimationFrame(animate);

  clock.update(timestamp);
  const dt = Math.min(clock.getDelta(), 0.05); // Cap delta to prevent spiral of death

  // Update game systems
  updatePlayer(dt);

  // Camera toggle (C key / PS5 Share)
  if (pollCameraToggle()) toggleCameraMode();

  // HUD toggle (backtick / PS5 touchpad)
  if (pollHudToggle()) toggleHUD();

  // Update camera
  const state = getPlayerState();
  updateCamera(state.position, state.heading, state.speed, state.isAirborne, dt);

  // Render
  composer.render();
}

// === GO ===
async function start() {
  const character = await showCharacterSelect();
  await init(character);
}
start().catch(console.error);
