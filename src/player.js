// === Player Controller ===

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { PLAYER, BOARD, GRIND } from './config.js';
import { createSkateboard, updateWheelSpin } from './skateboard.js';
import { getInput } from './input.js';
import { rails, obstacles } from './level.js';
import { createTrickState, startTrick, updateTrick, cancelTrick, TrickType } from './tricks.js';

// Audio stubs (disabled for now)
const playOllie = () => {};
const playLanding = () => {};
const updateRollSound = () => {};
const startGrindSound = () => {};
const stopGrindSound = () => {};
const stopRollSound = () => {};

let playerGroup;    // Root group (moves through world)
let skaterGroup;    // Contains model + board (tilts/leans)
let boardGroup;     // Just the board (for trick rotations)
let modelMesh;
let skateboard;

let mixer = null;
let skateAction = null;

// Physics
let heading = 0;
let speed = 0;
let velocityY = 0;
let isAirborne = false;
let wasAirborne = false;
let jumpHeld = false;

// Animation
let crouchAmount = 0;
let landingBounce = 0;
let trickState;

// Grinding
let grinding = false;
let grindRail = null;
let grindProgress = 0;
let grindDirection = 1;

const SPAWN = new THREE.Vector3(0, 0, 12);
const SPAWN_HEADING = 0;

// Temp vectors to avoid per-frame allocation
const _playerMin = new THREE.Vector3();
const _playerMax = new THREE.Vector3();
const _obsCenter = new THREE.Vector3();
const _pushDir = new THREE.Vector3();

export async function createPlayer(scene, modelPath, texturePath) {
  playerGroup = new THREE.Group();
  playerGroup.position.copy(SPAWN);
  scene.add(playerGroup);

  skaterGroup = new THREE.Group();
  playerGroup.add(skaterGroup);

  boardGroup = new THREE.Group();
  skaterGroup.add(boardGroup);

  // Skateboard (async — loads GLB)
  skateboard = await createSkateboard();
  boardGroup.add(skateboard.group);

  // Load character model
  const loader = new FBXLoader();
  const fbxPath = modelPath || '/REMBOT_humanoid_v2.fbx';

  let fbx = null;
  try {
    fbx = await new Promise((resolve, reject) => {
      loader.load(
        fbxPath,
        (object) => resolve(object),
        undefined,
        (error) => reject(error)
      );
    });
  } catch (err) {
    console.warn('FBX load failed:', err);
  }

  if (fbx) {
    console.warn('FBX loaded OK:', fbxPath);

    // Scale to fit: target ~1.5m tall standing on board
    fbx.updateMatrixWorld(true);
    const rawBox = new THREE.Box3().setFromObject(fbx);
    const rawHeight = rawBox.max.y - rawBox.min.y;
    const targetHeight = 1.5;
    const s = targetHeight / rawHeight;
    fbx.scale.setScalar(s);

    // Re-measure after scale
    fbx.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(fbx);
    console.warn('FBX scaled height:', (box.max.y - box.min.y).toFixed(3));

    // Face forward (away from camera)
    fbx.rotation.y = 0;

    // Re-measure after rotation
    fbx.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(fbx);

    // Feet on deck
    const deckTop = BOARD.boardY + BOARD.deckHeight;
    fbx.position.y += deckTop - box2.min.y + 0.06;

    // Load texture and apply to all meshes
    let texture = null;
    if (texturePath) {
      try {
        const texLoader = new THREE.TextureLoader();
        texture = await texLoader.loadAsync(texturePath);
        texture.colorSpace = THREE.SRGBColorSpace;
      } catch (e) {
        console.warn('Texture load failed:', texturePath, e);
      }
    }

    fbx.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.8,
          metalness: 0.1,
        });
        child.material.needsUpdate = true;
        child.castShadow = true;
        child.receiveShadow = true;
        modelMesh = child;
      }
    });

    skaterGroup.add(fbx);

    // Play embedded animation — strip root motion so character stays on board
    if (fbx.animations.length > 0) {
      const clip = fbx.animations[0];
      // Remove the hips position track (root motion) to keep character on the board
      clip.tracks = clip.tracks.filter(t => t.name !== 'mixamorigHips.position');
      mixer = new THREE.AnimationMixer(fbx);
      skateAction = mixer.clipAction(clip);
      skateAction.play();
    }
  } else {
    console.warn('Using fallback capsule for player');
    const geo = new THREE.CapsuleGeometry(0.25, 1.0, 8, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xaaaabb, metalness: 0.6, roughness: 0.25,
      emissive: 0x222233, emissiveIntensity: 0.15,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = BOARD.boardY + BOARD.deckHeight + 0.75;
    mesh.castShadow = true;
    skaterGroup.add(mesh);
  }

  trickState = createTrickState();
  return playerGroup;
}

export function getPlayerState() {
  return {
    position: playerGroup ? playerGroup.position : new THREE.Vector3(),
    heading,
    speed,
    isAirborne,
  };
}

export function updatePlayer(dt) {
  if (!playerGroup) return;
  if (mixer) mixer.update(dt);
  const input = getInput();

  // === Reset ===
  if (input.reset) {
    playerGroup.position.copy(SPAWN);
    heading = SPAWN_HEADING;
    speed = 0;
    velocityY = 0;
    isAirborne = false;
    grinding = false;
    stopGrindSound();
    cancelTrick(trickState, boardGroup);
    return;
  }

  // === Grinding ===
  if (grinding && grindRail) {
    updateGrinding(dt, input);
    updateVisuals(dt, input);
    return;
  }

  // === Steering ===
  const turnSpeed = isAirborne ? PLAYER.airTurnSpeed : PLAYER.turnSpeed;
  if (input.left) heading += turnSpeed * dt;
  if (input.right) heading -= turnSpeed * dt;

  // === Acceleration / Braking ===
  if (!isAirborne) {
    if (input.forward) speed += PLAYER.acceleration * dt;
    if (input.brake) speed -= PLAYER.brakeForce * dt;
    speed -= speed * PLAYER.friction * dt;
    if (Math.abs(speed) < 0.01) speed = 0;
  }
  speed = Math.min(Math.max(speed, 0), PLAYER.maxSpeed);

  // === Movement ===
  const prevX = playerGroup.position.x;
  const prevZ = playerGroup.position.z;

  playerGroup.position.x += Math.sin(heading) * speed * dt;
  playerGroup.position.z += Math.cos(heading) * speed * dt;

  // === Solid Obstacle Collisions (push out) ===
  if (!isAirborne) {
    resolveCollisions(prevX, prevZ);
  }

  // === Jump ===
  if (input.jump && !isAirborne && !jumpHeld) {
    velocityY = PLAYER.jumpForce;
    isAirborne = true;
    crouchAmount = 0;
    playOllie();
  }
  jumpHeld = input.jump;

  // === Gravity ===
  if (isAirborne) {
    velocityY -= PLAYER.gravity * dt;
    playerGroup.position.y += velocityY * dt;

    // Get floor height (could be a ramp surface or ground)
    let floorY = PLAYER.groundY;
    for (const ramp of obstacles) {
      if (ramp.type !== 'ramp') continue;
      const b = ramp.box;
      if (playerGroup.position.x < b.min.x - 0.3 || playerGroup.position.x > b.max.x + 0.3) continue;
      if (playerGroup.position.z < b.min.z - 0.3 || playerGroup.position.z > b.max.z + 0.3) continue;
      const xRange = b.max.x - b.min.x;
      const zRange = b.max.z - b.min.z;
      const rampH = b.max.y - b.min.y;
      let t = xRange > zRange
        ? (playerGroup.position.x - b.min.x) / xRange
        : (playerGroup.position.z - b.min.z) / zRange;
      t = Math.max(0, Math.min(1, t));
      const surfY = t * rampH;
      if (surfY > floorY) floorY = surfY;
    }

    if (playerGroup.position.y <= floorY) {
      playerGroup.position.y = floorY;
      if (wasAirborne && velocityY < -1) {
        playLanding(Math.abs(velocityY));
        landingBounce = Math.min(Math.abs(velocityY) / 20, 1);
      }
      velocityY = 0;
      isAirborne = false;
      cancelTrick(trickState, boardGroup);
    }
  }

  // === Ramp Riding ===
  if (!isAirborne) {
    rideRamps();
  }

  // === Grind Snap ===
  if (input.grind) {
    checkGrindSnap();
  }

  // === Tricks ===
  if (isAirborne) {
    if (input.kickflip) startTrick(trickState, TrickType.KICKFLIP, boardGroup);
    if (input.heelflip) startTrick(trickState, TrickType.HEELFLIP, boardGroup);
    if (input.shuvit) startTrick(trickState, TrickType.SHUVIT, boardGroup);
  }
  updateTrick(trickState, boardGroup, dt);

  // === Visuals & Audio ===
  updateVisuals(dt, input);
  if (!isAirborne) { updateRollSound(speed); } else { updateRollSound(0); }

  wasAirborne = isAirborne;
}

function resolveCollisions(prevX, prevZ) {
  const pos = playerGroup.position;
  const hw = 0.3, hd = 0.3; // player half-width/depth
  const ph = 1.2; // player height

  _playerMin.set(pos.x - hw, pos.y, pos.z - hd);
  _playerMax.set(pos.x + hw, pos.y + ph, pos.z + hd);

  for (const obs of obstacles) {
    if (obs.type !== 'solid') continue;

    const b = obs.box;
    // AABB overlap test
    if (_playerMax.x < b.min.x || _playerMin.x > b.max.x) continue;
    if (_playerMax.y < b.min.y || _playerMin.y > b.max.y) continue;
    if (_playerMax.z < b.min.z || _playerMin.z > b.max.z) continue;

    // Collision! Find shortest push-out axis
    const overlapX1 = _playerMax.x - b.min.x;
    const overlapX2 = b.max.x - _playerMin.x;
    const overlapZ1 = _playerMax.z - b.min.z;
    const overlapZ2 = b.max.z - _playerMin.z;

    const minOverlapX = Math.min(overlapX1, overlapX2);
    const minOverlapZ = Math.min(overlapZ1, overlapZ2);

    if (minOverlapX < minOverlapZ) {
      // Push out on X
      if (overlapX1 < overlapX2) {
        pos.x = b.min.x - hw - 0.01;
      } else {
        pos.x = b.max.x + hw + 0.01;
      }
    } else {
      // Push out on Z
      if (overlapZ1 < overlapZ2) {
        pos.z = b.min.z - hd - 0.01;
      } else {
        pos.z = b.max.z + hd + 0.01;
      }
    }
    speed *= 0.6; // Lose speed on impact
  }
}

function rideRamps() {
  const pos = playerGroup.position;

  // Check if player is inside any ramp bounding box
  let onRamp = false;
  let rampSurfaceY = 0;
  let bestRampY = 0;
  let bestRamp = null;

  for (const ramp of obstacles) {
    if (ramp.type !== 'ramp') continue;
    const b = ramp.box;

    // Generous XZ overlap check
    if (pos.x < b.min.x - 0.3 || pos.x > b.max.x + 0.3) continue;
    if (pos.z < b.min.z - 0.3 || pos.z > b.max.z + 0.3) continue;

    // Calculate how far into the ramp we are (0 = low edge, 1 = high edge)
    // Ramp goes from low at one side to high at the other
    const rampHeight = b.max.y - b.min.y;
    if (rampHeight < 0.05) continue;

    // Compute ramp surface height at player position
    // t represents position within the ramp (0=low side, 1=high side)
    const xRange = b.max.x - b.min.x;
    const zRange = b.max.z - b.min.z;

    let t;
    if (xRange > zRange) {
      // Ramp extends mainly in X
      t = (pos.x - b.min.x) / xRange;
    } else {
      // Ramp extends mainly in Z
      t = (pos.z - b.min.z) / zRange;
    }
    t = Math.max(0, Math.min(1, t));

    // Surface height: linearly interpolate (wedge shape)
    // The high side is at b.max.y, low side at b.min.y (ground)
    // We need to figure out which side is high — use ramp angle direction
    // For simplicity: the ramp mesh was built with high side at -Z local
    // After rotation, we approximate using the bounding box center
    const surfaceY = t * rampHeight;

    if (surfaceY > bestRampY && pos.y <= surfaceY + 0.3) {
      bestRampY = surfaceY;
      bestRamp = ramp;
      onRamp = true;
    }
  }

  if (onRamp && bestRamp) {
    if (bestRampY > pos.y + 0.02) {
      // Ride up: smoothly raise player to ramp surface
      pos.y = Math.max(pos.y, bestRampY - 0.05);
      pos.y += (bestRampY - pos.y) * 0.3;
    } else {
      pos.y = bestRampY;
    }

    // Check if we've reached the top edge — launch!
    const rampTop = bestRamp.box.max.y;
    if (pos.y >= rampTop - 0.15 && speed > 0.5) {
      const launchPower = Math.max(speed * Math.sin(bestRamp.angle) * 1.5, speed * 0.5);
      velocityY = launchPower;
      isAirborne = true;
      speed *= 0.85;
      playOllie();
    }
  } else if (pos.y > PLAYER.groundY + 0.05 && !isAirborne) {
    // We left the ramp surface — start falling
    isAirborne = true;
    velocityY = 0;
  }
}

function checkGrindSnap() {
  const pos = playerGroup.position;

  for (const rail of rails) {
    const toStart = new THREE.Vector3().subVectors(pos, rail.start);
    const t = Math.max(0, Math.min(1, toStart.dot(rail.direction) / rail.length));

    const closest = new THREE.Vector3().copy(rail.start).addScaledVector(rail.direction, t * rail.length);
    const dist2D = Math.sqrt(
      (pos.x - closest.x) ** 2 + (pos.z - closest.z) ** 2
    );
    const heightDiff = pos.y - closest.y;

    if (dist2D < GRIND.snapDistance && heightDiff > -GRIND.snapHeight && heightDiff < 2.0) {
      grinding = true;
      grindRail = rail;
      grindProgress = t;

      const headingDir = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
      grindDirection = headingDir.dot(rail.direction) > 0 ? 1 : -1;

      playerGroup.position.copy(closest);
      playerGroup.position.y = closest.y + BOARD.boardY;

      const angle = Math.atan2(rail.direction.x, rail.direction.z);
      heading = grindDirection > 0 ? angle : angle + Math.PI;

      isAirborne = false;
      velocityY = 0;
      startGrindSound();
      cancelTrick(trickState, boardGroup);
      return;
    }
  }
}

function updateGrinding(dt, input) {
  if (!grindRail) { grinding = false; return; }

  grindProgress += (grindDirection * GRIND.speed * dt) / grindRail.length;

  if (grindProgress <= 0 || grindProgress >= 1 || input.jump) {
    grinding = false;
    const wasJump = input.jump;
    grindRail = null;
    velocityY = wasJump ? GRIND.dismountForce : GRIND.dismountForce * 0.5;
    isAirborne = true;
    speed = GRIND.speed;
    stopGrindSound();
    if (wasJump) playOllie();
    return;
  }

  const pt = new THREE.Vector3().copy(grindRail.start)
    .addScaledVector(grindRail.direction, grindProgress * grindRail.length);
  playerGroup.position.copy(pt);
  playerGroup.position.y = pt.y + BOARD.boardY;

  if (input.left) heading += PLAYER.airTurnSpeed * 0.3 * dt;
  if (input.right) heading -= PLAYER.airTurnSpeed * 0.3 * dt;
}

function updateVisuals(dt, input) {
  playerGroup.rotation.y = heading;

  // Lean into turns
  const turnInput = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const targetLean = turnInput * 0.15 * Math.min(speed / PLAYER.maxSpeed, 1);
  skaterGroup.rotation.z = THREE.MathUtils.lerp(skaterGroup.rotation.z, targetLean, 8 * dt);

  // Crouch
  if (input.jump && !isAirborne) {
    crouchAmount = Math.min(crouchAmount + PLAYER.crouchSpeed * dt, 1);
  } else {
    crouchAmount = Math.max(crouchAmount - PLAYER.crouchSpeed * dt, 0);
  }
  skaterGroup.position.y = crouchAmount * PLAYER.crouchDepth;

  // Landing bounce
  if (landingBounce > 0) {
    landingBounce -= PLAYER.landingBounceSpeed * dt;
    if (landingBounce < 0) landingBounce = 0;
    skaterGroup.position.y -= landingBounce * PLAYER.landingBounce;
  }

  // Wheel spin
  updateWheelSpin(skateboard.wheels, grinding ? GRIND.speed : speed, dt);

  // Speed tilt
  skaterGroup.rotation.x = -(speed / PLAYER.maxSpeed) * 0.05;
}
