// === Camera System ===

import * as THREE from 'three';
import { CAMERA } from './config.js';

let camera;
let currentPos = new THREE.Vector3();
let currentLookAt = new THREE.Vector3();
let initialized = false;

export function createCamera() {
  camera = new THREE.PerspectiveCamera(
    CAMERA.fov,
    window.innerWidth / window.innerHeight,
    CAMERA.near,
    CAMERA.far
  );
  camera.position.set(0, CAMERA.height, CAMERA.distance);
  currentPos.copy(camera.position);
  currentLookAt.set(0, 0.5, 0);
  return camera;
}

export function updateCamera(playerPos, playerHeading, speed, isAirborne, dt) {
  if (!camera) return;

  if (!initialized) {
    // Snap camera to position on first frame
    initialized = true;
    const behind = new THREE.Vector3(
      -Math.sin(playerHeading) * CAMERA.distance,
      CAMERA.height,
      -Math.cos(playerHeading) * CAMERA.distance
    );
    currentPos.copy(playerPos).add(behind);
    camera.position.copy(currentPos);
    camera.lookAt(playerPos.x, playerPos.y + 0.8, playerPos.z);
    return;
  }

  // Speed-based zoom out
  const speedZoom = speed * CAMERA.speedZoomOut;
  const dist = CAMERA.distance + speedZoom;

  const height = CAMERA.height;

  // Target position: behind and above player
  const targetPos = new THREE.Vector3(
    playerPos.x - Math.sin(playerHeading) * dist,
    playerPos.y + height,
    playerPos.z - Math.cos(playerHeading) * dist
  );

  // Smooth lerp to target
  const lerpFactor = 1 - Math.exp(-CAMERA.lerpSpeed * dt);
  currentPos.lerp(targetPos, lerpFactor);
  camera.position.copy(currentPos);

  // Look at point ahead of player
  const lookTarget = new THREE.Vector3(
    playerPos.x + Math.sin(playerHeading) * CAMERA.lookAhead,
    playerPos.y + 0.8,
    playerPos.z + Math.cos(playerHeading) * CAMERA.lookAhead
  );
  currentLookAt.lerp(lookTarget, lerpFactor);
  camera.lookAt(currentLookAt);
}

export function onResize() {
  if (!camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
