// === Level / Environment Builder ===

import * as THREE from 'three';
import { COLORS } from './config.js';

export const obstacles = [];
export const rails = [];
export const ramps = [];

const matRamp = new THREE.MeshStandardMaterial({ color: COLORS.obstacle, roughness: 0.7, metalness: 0.15 });
const matRampDark = new THREE.MeshStandardMaterial({ color: COLORS.obstacleDark, roughness: 0.7, metalness: 0.15 });
const matLedge = new THREE.MeshStandardMaterial({ color: COLORS.obstacleLight, roughness: 0.8, metalness: 0.1 });
const matRail = new THREE.MeshStandardMaterial({
  color: COLORS.rail, roughness: 0.2, metalness: 0.9,
  emissive: 0x222233, emissiveIntensity: 0.2,
});
const matPost = new THREE.MeshStandardMaterial({ color: 0x666677, roughness: 0.5, metalness: 0.6 });

// === Ramp: simple box sheared into a wedge ===
// The ramp slopes from z=+depth/2 (ground level) up to z=-depth/2 (height)
function createRamp(width, height, depth) {
  const geo = new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
  const pos = geo.attributes.position;
  // Shear: vertices at z > 0 (front) get pushed down to y=0
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const y = pos.getY(i);
    // t goes from 0 (back, high side) to 1 (front, low side)
    const t = (z + depth / 2) / depth;
    if (y > 0) {
      // Top vertices: slope down from height to 0
      pos.setY(i, height * (1 - t));
    }
    // Bottom vertices stay at 0
    if (y < 0) {
      pos.setY(i, 0);
    }
  }
  geo.translate(0, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

function addSolid(scene, mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.updateMatrixWorld(true);
  scene.add(mesh);
  const box = new THREE.Box3().setFromObject(mesh);
  obstacles.push({ box, mesh, type: 'solid' });
}

function placeRamp(scene, x, z, w, h, d, rotY, mat) {
  const geo = createRamp(w, h, d);
  const mesh = new THREE.Mesh(geo, mat || matRamp);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = rotY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.updateMatrixWorld(true);
  scene.add(mesh);

  const box = new THREE.Box3().setFromObject(mesh);
  const angle = Math.atan2(h, d);
  const entry = { box, mesh, type: 'ramp', angle };
  obstacles.push(entry);
  ramps.push(entry);
}

function placeRail(scene, x1, z1, x2, z2, h) {
  const dx = x2 - x1, dz = z2 - z1;
  const length = Math.sqrt(dx * dx + dz * dz);
  const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
  const angle = Math.atan2(dx, dz);

  // Rail bar
  const barGeo = new THREE.CylinderGeometry(0.04, 0.04, length, 8);
  barGeo.rotateZ(Math.PI / 2);
  const bar = new THREE.Mesh(barGeo, matRail);
  bar.position.set(mx, h, mz);
  bar.rotation.y = angle + Math.PI / 2;
  bar.castShadow = true;
  bar.updateMatrixWorld(true);
  scene.add(bar);

  // Posts
  const postGeo = new THREE.CylinderGeometry(0.025, 0.025, h, 6);
  for (const [px, pz] of [[x1, z1], [x2, z2]]) {
    const post = new THREE.Mesh(postGeo, matPost);
    post.position.set(px, h / 2, pz);
    post.castShadow = true;
    scene.add(post);
  }

  const dir = new THREE.Vector3(dx, 0, dz).normalize();
  const railData = {
    start: new THREE.Vector3(x1, h, z1),
    end: new THREE.Vector3(x2, h, z2),
    direction: dir, length, height: h,
  };
  const box = new THREE.Box3().setFromObject(bar);
  box.expandByScalar(0.4);
  obstacles.push({ box, mesh: bar, type: 'rail', ...railData });
  rails.push(railData);
}

function placeBox(scene, x, y, z, w, h, d, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || matLedge);
  mesh.position.set(x, y, z);
  addSolid(scene, mesh);
  return mesh;
}

export function buildLevel(scene) {
  // === Ground ===
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: COLORS.ground, roughness: 0.9, metalness: 0.05 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(100, 50, COLORS.gridLine, COLORS.gridLine);
  grid.position.y = 0.005;
  grid.material.transparent = true;
  grid.material.opacity = 0.15;
  scene.add(grid);

  // ==========================================
  // RAMPS — small, human-scaled (0.3-1m tall)
  // ==========================================

  // Launch ramp south (ride toward -Z to launch)
  placeRamp(scene, 0, -6, 2.5, 0.6, 1.5, 0, matRamp);

  // Launch ramp north (ride toward +Z)
  placeRamp(scene, 0, 6, 2.5, 0.6, 1.5, Math.PI, matRamp);

  // East kicker
  placeRamp(scene, 7, 0, 2, 0.5, 1.2, Math.PI / 2, matRampDark);

  // West kicker
  placeRamp(scene, -7, 0, 2, 0.5, 1.2, -Math.PI / 2, matRampDark);

  // Transfer pair (two ramps facing each other)
  placeRamp(scene, -4, -10, 3, 0.7, 1.8, 0, matRamp);
  placeRamp(scene, -4, -13.5, 3, 0.7, 1.8, Math.PI, matRamp);

  // === QUARTER PIPES (taller, at edges) ===
  placeRamp(scene, 0, -16, 6, 1.8, 2.5, 0, matRampDark);
  placeRamp(scene, 0, 16, 6, 1.8, 2.5, Math.PI, matRampDark);

  // === HALF PIPE ===
  placeRamp(scene, -14, 0, 8, 2.0, 2.5, Math.PI / 2, matRampDark);
  placeRamp(scene, -9, 0, 8, 2.0, 2.5, -Math.PI / 2, matRampDark);
  placeBox(scene, -11.5, 0.05, 0, 5, 0.1, 8, matRamp); // flat bottom

  // ==========================================
  // GRIND RAILS (0.35-0.5m high)
  // ==========================================

  placeRail(scene, 3, -2, 3, 3, 0.35);       // center straight
  placeRail(scene, 6, -4, 10, -2, 0.35);      // angled
  placeRail(scene, -6, -8, 1, -8, 0.35);      // south long
  placeRail(scene, 11, 4, 11, 8, 0.5);        // east elevated

  // ==========================================
  // STAIRS (stacked boxes, 0.15m per step)
  // ==========================================

  // 4-step set east
  for (let i = 0; i < 4; i++) {
    placeBox(scene, 7, (i + 1) * 0.15 / 2, 7 - i * 0.35, 2.5, (i + 1) * 0.15, 0.35, matLedge);
  }
  // Stair handrail
  placeRail(scene, 8.4, 7, 8.4, 5.6, 0.7);

  // 3-step set west
  for (let i = 0; i < 3; i++) {
    placeBox(scene, -8, (i + 1) * 0.15 / 2, -5 - i * 0.35, 3, (i + 1) * 0.15, 0.35, matLedge);
  }

  // ==========================================
  // CONCRETE LEDGES (grindable boxes)
  // ==========================================

  placeBox(scene, 5, 0.2, -6, 1, 0.4, 4, matLedge);
  placeRail(scene, 5, -8, 5, -4, 0.45);  // rail on top of ledge

  placeBox(scene, -3, 0.15, -3, 4, 0.3, 0.8, matLedge);

  // ==========================================
  // FUNBOX (ramps + flat top)
  // ==========================================

  // Central funbox
  placeRamp(scene, 0, 1.5, 2.5, 0.5, 1.2, 0, matRampDark);
  placeRamp(scene, 0, 4, 2.5, 0.5, 1.2, Math.PI, matRampDark);
  placeBox(scene, 0, 0.45, 2.75, 2.5, 0.1, 1.0, matRamp); // flat top

  // East funbox
  placeRamp(scene, 10, -6, 2, 0.4, 1, 0, matRamp);
  placeRamp(scene, 10, -4, 2, 0.4, 1, Math.PI, matRamp);

  // ==========================================
  // CLOUDS
  // ==========================================
  createClouds(scene);

  return { ground };
}

function createClouds(scene) {
  const cloudData = [
    { x: -20, y: 22, z: -40, sx: 16, sz: 7 },
    { x: 15, y: 27, z: -50, sx: 20, sz: 9 },
    { x: -35, y: 25, z: -30, sx: 13, sz: 6 },
    { x: 30, y: 29, z: -45, sx: 18, sz: 8 },
    { x: 5, y: 32, z: -55, sx: 22, sz: 10 },
    { x: -25, y: 24, z: -60, sx: 14, sz: 7 },
    { x: 40, y: 26, z: -35, sx: 12, sz: 5 },
    { x: -10, y: 30, z: -65, sx: 18, sz: 9 },
  ];

  for (const c of cloudData) {
    const geo = new THREE.PlaneGeometry(c.sx, c.sz, 3, 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, pos.getY(i) + (Math.random() - 0.5) * 1.5);
      pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * 2);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshBasicMaterial({
      color: 0x4a2060,
      transparent: true,
      opacity: 0.06 + Math.random() * 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const cloud = new THREE.Mesh(geo, mat);
    cloud.position.set(c.x, c.y, c.z);
    cloud.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
    cloud.rotation.z = (Math.random() - 0.5) * 0.6;
    scene.add(cloud);
  }
}
