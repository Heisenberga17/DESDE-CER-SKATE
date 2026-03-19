// === Camera System ===
// Right stick controls orbit around player. Camera auto-returns behind player when stick is released.

import * as THREE from 'three';
import { CAMERA } from './config.js';

let camera;
let currentPos = new THREE.Vector3();
let currentLookAt = new THREE.Vector3();
let initialized = false;
let cameraMode = 'behind'; // 'behind' | 'side'

// Orbit state — driven by right stick
let orbitYaw = 0;     // horizontal offset from player heading (radians)
let orbitPitch = 0;   // vertical offset (radians, positive = look up)

const ORBIT_SPEED = 3.0;        // radians/sec at full stick deflection
const PITCH_SPEED = 2.0;
const PITCH_MIN = -0.3;         // look down limit
const PITCH_MAX = 1.2;          // look up limit
const RETURN_SPEED = 3.0;       // how fast yaw returns to 0 when stick released

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

export function updateCamera(playerPos, playerHeading, speed, isAirborne, dt, cameraInput) {
  if (!camera) return;

  // Update orbit angles from right stick
  if (cameraInput) {
    const rx = cameraInput.x; // right stick horizontal
    const ry = cameraInput.y; // right stick vertical

    if (Math.abs(rx) > 0.01) {
      orbitYaw -= rx * ORBIT_SPEED * dt;
    } else {
      // Auto-return yaw to center when stick released
      orbitYaw *= Math.exp(-RETURN_SPEED * dt);
      if (Math.abs(orbitYaw) < 0.01) orbitYaw = 0;
    }

    if (Math.abs(ry) > 0.01) {
      orbitPitch -= ry * PITCH_SPEED * dt;
      orbitPitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, orbitPitch));
    } else {
      // Auto-return pitch to default
      orbitPitch *= Math.exp(-RETURN_SPEED * dt);
      if (Math.abs(orbitPitch) < 0.01) orbitPitch = 0;
    }
  }

  if (!initialized) {
    initialized = true;
    const camAngle = playerHeading + orbitYaw;
    const behind = new THREE.Vector3(
      -Math.sin(camAngle) * CAMERA.distance,
      CAMERA.height,
      -Math.cos(camAngle) * CAMERA.distance
    );
    currentPos.copy(playerPos).add(behind);
    camera.position.copy(currentPos);
    camera.lookAt(playerPos.x, playerPos.y + 0.8, playerPos.z);
    return;
  }

  const lerpFactor = 1 - Math.exp(-CAMERA.lerpSpeed * dt);

  let targetPos, lookTarget;

  if (cameraMode === 'side') {
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
    // Default behind camera with orbit offset
    const camAngle = playerHeading + orbitYaw;
    const speedZoom = speed * CAMERA.speedZoomOut;
    const dist = CAMERA.distance + speedZoom;

    const heightOffset = CAMERA.height + Math.sin(orbitPitch) * dist * 0.5;

    targetPos = new THREE.Vector3(
      playerPos.x - Math.sin(camAngle) * dist * Math.cos(orbitPitch),
      playerPos.y + heightOffset,
      playerPos.z - Math.cos(camAngle) * dist * Math.cos(orbitPitch)
    );
    lookTarget = new THREE.Vector3(
      playerPos.x + Math.sin(camAngle) * CAMERA.lookAhead,
      playerPos.y + 0.8,
      playerPos.z + Math.cos(camAngle) * CAMERA.lookAhead
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
