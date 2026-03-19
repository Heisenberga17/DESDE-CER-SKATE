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
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: COLORS.ground, roughness: 0.9, metalness: 0.05 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(200, 100, COLORS.gridLine, COLORS.gridLine);
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
  // NEW RAILS (spread across the park)
  // ==========================================

  placeRail(scene, 15, -2, 20, -2, 0.35);     // long flat rail, northeast
  placeRail(scene, 15, 2, 20, 2, 0.35);       // parallel (double rail set)
  placeRail(scene, -15, 5, -15, 12, 0.35);    // long rail, northwest
  placeRail(scene, -20, -5, -16, -5, 0.35);   // short rail, west
  placeRail(scene, 12, -10, 18, -7, 0.4);     // diagonal downhill feel
  placeRail(scene, 0, -12, 6, -12, 0.35);     // south center rail
  placeRail(scene, -10, 10, -4, 10, 0.35);    // north-west rail
  placeRail(scene, 20, 8, 20, 14, 0.5);       // far east vertical rail
  placeRail(scene, -18, -12, -12, -12, 0.35); // southwest rail
  placeRail(scene, 8, 12, 14, 12, 0.35);      // northeast rail

  // ==========================================
  // PLAZA AREA (northeast, x:15-25, z:5-15)
  // ==========================================

  // Low manual pads
  placeBox(scene, 18, 0.1, 8, 3, 0.2, 1.5, matLedge);
  placeBox(scene, 22, 0.1, 8, 3, 0.2, 1.5, matLedge);

  // Ledge with rail on top
  placeBox(scene, 20, 0.2, 12, 5, 0.4, 1, matLedge);
  placeRail(scene, 17.5, 12, 22.5, 12, 0.45);

  // Pyramid: 4 ramps facing outward + flat top box
  placeRamp(scene, 20, 5.5, 3, 0.6, 1.5, 0, matRamp);           // south face
  placeRamp(scene, 20, 9, 3, 0.6, 1.5, Math.PI, matRamp);       // north face
  placeRamp(scene, 18.25, 7.25, 3, 0.6, 1.5, -Math.PI / 2, matRamp); // west face
  placeRamp(scene, 21.75, 7.25, 3, 0.6, 1.5, Math.PI / 2, matRamp);  // east face
  placeBox(scene, 20, 0.55, 7.25, 2.0, 0.1, 2.0, matRamp);     // flat top

  // ==========================================
  // STREET SECTION (northwest, x:-15 to -25, z:5-15)
  // ==========================================

  // 5-step stair set with handrails on both sides
  for (let i = 0; i < 5; i++) {
    placeBox(scene, -20, (i + 1) * 0.15 / 2, 10 - i * 0.4, 4, (i + 1) * 0.15, 0.4, matLedge);
  }
  placeRail(scene, -22.2, 10, -22.2, 8.0, 0.8);  // left handrail
  placeRail(scene, -17.8, 10, -17.8, 8.0, 0.8);  // right handrail

  // Flat gap: two platforms separated by a space to ollie over
  placeBox(scene, -22, 0.15, 13, 3, 0.3, 2, matLedge);
  placeBox(scene, -17, 0.15, 13, 3, 0.3, 2, matLedge);

  // Low ledge line
  placeBox(scene, -20, 0.2, 6, 8, 0.4, 0.8, matLedge);

  // ==========================================
  // BOWL CORNER (southeast, x:15-25, z:-10 to -20)
  // ==========================================

  // 4 quarter pipes facing inward
  placeRamp(scene, 18, -12, 5, 1.5, 2.0, Math.PI, matRampDark);   // south side, face north
  placeRamp(scene, 18, -18, 5, 1.5, 2.0, 0, matRampDark);         // north side, face south
  placeRamp(scene, 15, -15, 5, 1.5, 2.0, Math.PI / 2, matRampDark);  // west side, face east
  placeRamp(scene, 21, -15, 5, 1.5, 2.0, -Math.PI / 2, matRampDark); // east side, face west

  // Flat bottom box connecting them
  placeBox(scene, 18, 0.05, -15, 4, 0.1, 4, matRamp);

  // ==========================================
  // SOUTH EXTENSION (z:-20 to -30)
  // ==========================================

  // Bank ramps along the south edge
  placeRamp(scene, -5, -25, 4, 1.0, 2.0, 0, matRamp);
  placeRamp(scene, 5, -25, 4, 1.0, 2.0, 0, matRamp);
  placeRamp(scene, 0, -28, 6, 1.2, 2.0, 0, matRampDark);

  // A couple more kickers
  placeRamp(scene, -8, -22, 2.5, 0.5, 1.2, Math.PI, matRamp);
  placeRamp(scene, 8, -22, 2.5, 0.5, 1.2, Math.PI, matRamp);

  // Rail line
  placeRail(scene, -4, -22, 4, -22, 0.35);

  // ==========================================
  // EXTRA KICKERS near halfpipe area
  // ==========================================

  placeRamp(scene, -14, -4, 2, 0.5, 1.2, 0, matRamp);
  placeRamp(scene, -14, 4, 2, 0.5, 1.2, Math.PI, matRamp);

  // ==========================================
  // WEST STREET PLAZA (x:-40 to -30, z:-10 to 10)
  // ==========================================

  // 2 long flat grind rails
  placeRail(scene, -40, -2, -30, -2, 0.35);
  placeRail(scene, -40, 2, -30, 2, 0.35);

  // Low ledge line
  placeBox(scene, -35, 0.2, 0, 8, 0.4, 0.8, matLedge);

  // 2 kicker ramps facing each other
  placeRamp(scene, -37, -6, 2.5, 0.6, 1.5, 0, matRamp);
  placeRamp(scene, -37, -9, 2.5, 0.6, 1.5, Math.PI, matRamp);

  // Stair set with handrail
  for (let i = 0; i < 5; i++) {
    placeBox(scene, -33, (i + 1) * 0.15 / 2, 6 - i * 0.4, 3, (i + 1) * 0.15, 0.4, matLedge);
  }
  placeRail(scene, -34.7, 6, -34.7, 4.0, 0.8);

  // Extra kicker pair
  placeRamp(scene, -32, 8, 2.5, 0.5, 1.2, Math.PI, matRampDark);
  placeRamp(scene, -38, 8, 2.5, 0.5, 1.2, Math.PI, matRampDark);

  // ==========================================
  // FAR NORTH PARK (x:-15 to 15, z:25 to 45)
  // ==========================================

  // Large quarter pipe wall
  placeRamp(scene, 0, 42, 10, 2.2, 3.0, 0, matRampDark);

  // 3 grind rails varied heights
  placeRail(scene, -10, 30, -3, 30, 0.35);
  placeRail(scene, 2, 33, 10, 33, 0.45);
  placeRail(scene, -5, 37, 5, 37, 0.5);

  // Funbox with ramps + flat top
  placeRamp(scene, 0, 26, 3, 0.6, 1.5, 0, matRamp);
  placeRamp(scene, 0, 29.5, 3, 0.6, 1.5, Math.PI, matRamp);
  placeBox(scene, 0, 0.55, 27.75, 3, 0.1, 1.5, matRamp);

  // Pyramid with 4 ramp faces
  placeRamp(scene, -10, 37, 3.5, 0.7, 1.5, 0, matRamp);
  placeRamp(scene, -10, 41, 3.5, 0.7, 1.5, Math.PI, matRamp);
  placeRamp(scene, -12, 39, 3.5, 0.7, 1.5, -Math.PI / 2, matRamp);
  placeRamp(scene, -8, 39, 3.5, 0.7, 1.5, Math.PI / 2, matRamp);
  placeBox(scene, -10, 0.65, 39, 2.5, 0.1, 2.5, matRamp);

  // Manual pads
  placeBox(scene, 10, 0.1, 28, 3, 0.2, 1.5, matLedge);
  placeBox(scene, 10, 0.1, 31, 3, 0.2, 1.5, matLedge);
  placeBox(scene, -12, 0.1, 30, 3, 0.2, 1.5, matLedge);

  // ==========================================
  // EAST MEGA BOWL (x:30 to 50, z:-15 to 5)
  // ==========================================

  // 4 quarter pipes facing inward
  placeRamp(scene, 40, -2, 7, 2.0, 2.5, 0, matRampDark);       // south side
  placeRamp(scene, 40, -12, 7, 2.0, 2.5, Math.PI, matRampDark); // north side
  placeRamp(scene, 33, -7, 6, 2.0, 2.5, Math.PI / 2, matRampDark);  // west side
  placeRamp(scene, 47, -7, 6, 2.0, 2.5, -Math.PI / 2, matRampDark); // east side

  // Flat bottom
  placeBox(scene, 40, 0.05, -7, 8, 0.1, 6, matRamp);

  // Entry kicker ramps
  placeRamp(scene, 32, 2, 3, 0.6, 1.5, Math.PI / 2, matRamp);
  placeRamp(scene, 48, -15, 3, 0.6, 1.5, -Math.PI / 2, matRamp);

  // ==========================================
  // FAR SOUTH RAIL YARD (x:-20 to 20, z:-40 to -55)
  // ==========================================

  // 6 rails in various orientations
  placeRail(scene, -15, -42, -5, -42, 0.35);   // long flat
  placeRail(scene, 5, -42, 15, -42, 0.35);     // parallel
  placeRail(scene, -10, -46, 0, -46, 0.4);     // center
  placeRail(scene, 5, -46, 12, -49, 0.35);     // diagonal
  placeRail(scene, -8, -50, 8, -50, 0.35);     // far south long
  placeRail(scene, -15, -48, -15, -54, 0.45);  // vertical rail

  // 2 bank ramps at the far edge
  placeRamp(scene, -10, -53, 5, 1.2, 2.0, 0, matRamp);
  placeRamp(scene, 10, -53, 5, 1.2, 2.0, 0, matRamp);

  // Low gap ledges
  placeBox(scene, -5, 0.15, -44, 4, 0.3, 1, matLedge);
  placeBox(scene, 5, 0.15, -44, 4, 0.3, 1, matLedge);
  placeBox(scene, 0, 0.15, -48, 3, 0.3, 0.8, matLedge);

  // ==========================================
  // NORTHEAST FLOW SECTION (x:25 to 45, z:15 to 35)
  // ==========================================

  // Chain of kickers and small ramps
  placeRamp(scene, 28, 18, 2.5, 0.5, 1.2, 0, matRamp);
  placeRamp(scene, 33, 20, 2.5, 0.5, 1.2, 0, matRamp);
  placeRamp(scene, 38, 22, 2.5, 0.6, 1.4, 0, matRampDark);
  placeRamp(scene, 28, 25, 2.5, 0.5, 1.2, Math.PI, matRamp);
  placeRamp(scene, 33, 27, 2.5, 0.6, 1.4, Math.PI, matRampDark);

  // 2 hip transfers (angled ramp pairs)
  placeRamp(scene, 38, 28, 3, 0.6, 1.5, Math.PI * 0.75, matRamp);
  placeRamp(scene, 40, 30, 3, 0.6, 1.5, -Math.PI * 0.25, matRamp);
  placeRamp(scene, 42, 18, 3, 0.6, 1.5, Math.PI * 0.25, matRampDark);
  placeRamp(scene, 44, 20, 3, 0.6, 1.5, -Math.PI * 0.75, matRampDark);

  // Long spine rail
  placeRail(scene, 26, 30, 40, 30, 0.4);

  // Elevated rail
  placeRail(scene, 30, 34, 42, 34, 0.6);

  // ==========================================
  // SOUTHWEST BANKS (x:-45 to -30, z:-25 to -15)
  // ==========================================

  // Bank-to-bank setup (4 wide bank ramps)
  placeRamp(scene, -38, -18, 5, 1.0, 2.0, 0, matRamp);
  placeRamp(scene, -38, -22, 5, 1.0, 2.0, Math.PI, matRamp);
  placeRamp(scene, -44, -18, 5, 1.0, 2.0, 0, matRampDark);
  placeRamp(scene, -44, -22, 5, 1.0, 2.0, Math.PI, matRampDark);

  // Flat gap between banks
  placeBox(scene, -41, 0.05, -20, 12, 0.1, 2, matRamp);

  // Rail across the gap
  placeRail(scene, -46, -20, -35, -20, 0.45);

  // ==========================================
  // CLOUDS
  // ==========================================
  createClouds(scene);

  return { ground };
}

function createClouds(scene) {
  const cloudData = [
    // Spread all around the sky, not just behind the park
    // South
    { x: -20, y: 22, z: -40, sx: 16, sz: 7 },
    { x: 15, y: 27, z: -50, sx: 20, sz: 9 },
    { x: -35, y: 25, z: -30, sx: 13, sz: 6 },
    { x: 30, y: 29, z: -45, sx: 18, sz: 8 },
    { x: 5, y: 32, z: -60, sx: 22, sz: 10 },
    // North
    { x: -15, y: 24, z: 40, sx: 18, sz: 8 },
    { x: 25, y: 28, z: 50, sx: 22, sz: 10 },
    { x: 0, y: 20, z: 35, sx: 14, sz: 6 },
    { x: -40, y: 30, z: 45, sx: 16, sz: 7 },
    // East
    { x: 50, y: 26, z: -10, sx: 20, sz: 9 },
    { x: 55, y: 22, z: 15, sx: 15, sz: 7 },
    { x: 45, y: 34, z: 30, sx: 28, sz: 12 },
    // West
    { x: -50, y: 24, z: 5, sx: 17, sz: 8 },
    { x: -55, y: 30, z: -20, sx: 24, sz: 11 },
    { x: -45, y: 20, z: 25, sx: 12, sz: 6 },
    // Overhead / scattered
    { x: 10, y: 35, z: 10, sx: 26, sz: 11 },
    { x: -30, y: 33, z: -55, sx: 20, sz: 9 },
    { x: 40, y: 19, z: -30, sx: 10, sz: 5 },
    { x: -10, y: 28, z: -5, sx: 15, sz: 7 },
    { x: 60, y: 25, z: -40, sx: 18, sz: 8 },
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
      opacity: 0.08 + Math.random() * 0.10,
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
