// === Camera System ===

import * as THREE from 'three';
import { CAMERA } from './config.js';

let camera;
let currentPos = new THREE.Vector3();
let currentLookAt = new THREE.Vector3();
let initialized = false;
let cameraMode = 'behind'; // 'behind' | 'side'

export function toggleCameraMode() {
  cameraMode = cameraMode === 'behind' ? 'side' : 'behind';
}

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

  const lerpFactor = 1 - Math.exp(-CAMERA.lerpSpeed * dt);

  let targetPos, lookTarget;

  if (cameraMode === 'side') {
    // Side-face camera: positioned to the right of the player, looking at their head
    const rightX = Math.cos(playerHeading);
    const rightZ = -Math.sin(playerHeading);
    const fwdX = Math.sin(playerHeading);
    const fwdZ = Math.cos(playerHeading);

    targetPos = new THREE.Vector3(
      playerPos.x + rightX * CAMERA.sideRight + fwdX * CAMERA.sideFwd,
      playerPos.y + CAMERA.sideHeight,
      playerPos.z + rightZ * CAMERA.sideRight + fwdZ * CAMERA.sideFwd
    );
    lookTarget = new THREE.Vector3(
      playerPos.x,
      playerPos.y + CAMERA.sideLookHeight,
      playerPos.z
    );
  } else {
    // Default behind camera
    const speedZoom = speed * CAMERA.speedZoomOut;
    const dist = CAMERA.distance + speedZoom;

    targetPos = new THREE.Vector3(
      playerPos.x - Math.sin(playerHeading) * dist,
      playerPos.y + CAMERA.height,
      playerPos.z - Math.cos(playerHeading) * dist
    );
    lookTarget = new THREE.Vector3(
      playerPos.x + Math.sin(playerHeading) * CAMERA.lookAhead,
      playerPos.y + 0.8,
      playerPos.z + Math.cos(playerHeading) * CAMERA.lookAhead
    );
  }

  // Smooth lerp to target
  currentPos.lerp(targetPos, lerpFactor);
  camera.position.copy(currentPos);

  currentLookAt.lerp(lookTarget, lerpFactor);
  camera.lookAt(currentLookAt);
}

export function getCamera() {
  return camera;
}

export function onResize() {
  if (!camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
