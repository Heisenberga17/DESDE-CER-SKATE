// === Level — Load Skatepark GLB + Auto-detect Colliders ===

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export const obstacles = [];
export const rails = [];
export const ramps = [];
export let parkGroundY = 0; // Will be set after loading

const SCALE = 1.0; // 1:1 scale — GLB units are already meters

// Known GLB geometry coordinates (from mesh analysis)
const GROUND_Y = 3.0;        // Skateable floor Y in raw GLB coords
const PARK_CENTER_X = 5.0;   // Center of rail area X
const PARK_CENTER_Z = -20.0; // Center of rail area Z

export async function buildLevel(scene) {
  // === Ground plane (fallback so player doesn't fall through void) ===
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 800),
    new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.95, metalness: 0.05 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.1;
  ground.receiveShadow = true;
  scene.add(ground);

  // === Load GLB ===
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  const gltf = await new Promise((resolve, reject) => {
    loader.load('/skatepark.glb', resolve, undefined, reject);
  });

  const model = gltf.scene;
  model.scale.setScalar(SCALE);
  model.updateMatrixWorld(true);

  // Enable shadows on all meshes
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // Position model so park center maps to world origin and ground to Y=0
  model.position.set(-PARK_CENTER_X, -GROUND_Y, -PARK_CENTER_Z);
  model.updateMatrixWorld(true);

  scene.add(model);

  parkGroundY = 0;

  // === Classify meshes ===
  model.traverse((child) => {
    if (!child.isMesh) return;

    const name = child.name || '';
    child.updateMatrixWorld(true);

    // --- Rails ---
    if (/rail/i.test(name) && !/building/i.test(name)) {
      registerRail(child);
      return;
    }

    // --- Buildings / walls — visual only, no collision ---
    if (/building/i.test(name)) {
      return;
    }

    // --- Asphalt sky slab — visual only, not a floor ---
    if (/asplaht/i.test(name)) {
      return;
    }

    // --- Named "Cube" objects (manual pads, boxes) ---
    if (/^Cube/i.test(name) && !/building/i.test(name) && !/asplaht/i.test(name)) {
      // Analyze normals to see if it's a flat pad or has slopes
      const info = analyzeNormals(child);
      if (info.isRamp) {
        registerRamp(child, info.avgAngle);
      } else {
        registerSolid(child);
      }
      return;
    }

    // --- Everything else: classify by normals ---
    const info = analyzeNormals(child);

    if (info.isGround) {
      // Flat ground surface — skip collision (player walks on it)
      return;
    }

    if (info.isRamp) {
      registerRamp(child, info.avgAngle);
      return;
    }

    if (info.isWall) {
      registerSolid(child);
      return;
    }

    // Mixed or unknown — register as solid if it has any significant height
    const box = new THREE.Box3().setFromObject(child);
    const height = box.max.y - box.min.y;
    if (height > 0.1) {
      registerSolid(child);
    }
  });

  console.log(`Level loaded: ${obstacles.length} obstacles, ${rails.length} rails, ${ramps.length} ramps`);

  return { ground };
}

// === Analysis: compute normal distribution for a mesh ===
function analyzeNormals(mesh) {
  const geo = mesh.geometry;
  if (!geo || !geo.attributes.normal) {
    return { isGround: false, isRamp: false, isWall: false, avgAngle: 0 };
  }

  // Get world-space normal matrix
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);

  const normal = new THREE.Vector3();
  const normals = geo.attributes.normal;
  const index = geo.index;

  let groundCount = 0;
  let rampCount = 0;
  let wallCount = 0;
  let totalAngle = 0;
  let totalFaces = 0;

  const faceCount = index ? Math.floor(index.count / 3) : Math.floor(normals.count / 3);

  for (let f = 0; f < faceCount; f++) {
    // Get the normal of the first vertex of each face (good enough for classification)
    const idx = index ? index.getX(f * 3) : f * 3;
    normal.set(normals.getX(idx), normals.getY(idx), normals.getZ(idx));
    normal.applyMatrix3(normalMatrix).normalize();

    const dotUp = Math.abs(normal.y);

    if (dotUp > 0.85) {
      groundCount++;
    } else if (dotUp > 0.25) {
      rampCount++;
      totalAngle += Math.acos(dotUp);
    } else {
      wallCount++;
    }
    totalFaces++;
  }

  if (totalFaces === 0) {
    return { isGround: false, isRamp: false, isWall: false, avgAngle: 0 };
  }

  const groundRatio = groundCount / totalFaces;
  const rampRatio = rampCount / totalFaces;
  const wallRatio = wallCount / totalFaces;
  const avgAngle = rampCount > 0 ? totalAngle / rampCount : 0;

  return {
    isGround: groundRatio > 0.7,
    isRamp: rampRatio > 0.3,
    isWall: wallRatio > 0.6,
    avgAngle,
  };
}

// === Register obstacle types ===
function registerSolid(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  // Skip tiny or flat objects
  if (box.max.y - box.min.y < 0.05) return;
  obstacles.push({ box, mesh, type: 'solid' });
}

function registerRamp(mesh, angle) {
  const box = new THREE.Box3().setFromObject(mesh);
  if (box.max.y - box.min.y < 0.05) return;
  const entry = { box, mesh, type: 'ramp', angle: angle || Math.PI / 6 };
  obstacles.push(entry);
  ramps.push(entry);
}

function registerRail(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);

  // Extract rail line from bounding box longest axis
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  const height = center.y;

  let start, end;
  if (size.x > size.z) {
    // Rail extends along X
    start = new THREE.Vector3(box.min.x, height, center.z);
    end = new THREE.Vector3(box.max.x, height, center.z);
  } else {
    // Rail extends along Z
    start = new THREE.Vector3(center.x, height, box.min.z);
    end = new THREE.Vector3(center.x, height, box.max.z);
  }

  const dir = new THREE.Vector3().subVectors(end, start);
  const length = dir.length();
  if (length < 0.2) return; // Skip tiny rails
  dir.normalize();

  const railData = { start, end, direction: dir, length, height };

  // Expand box slightly for snapping
  const railBox = box.clone().expandByScalar(0.4);
  obstacles.push({ box: railBox, mesh, type: 'rail', ...railData });
  rails.push(railData);
}
