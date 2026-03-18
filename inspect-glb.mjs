/**
 * inspect-glb.mjs
 * Loads a GLB file with Three.js GLTFLoader (+ DRACOLoader) and reports
 * mesh structure, naming patterns, bounding boxes, and triangle counts.
 *
 * Run:  node inspect-glb.mjs
 */

import { readFile } from 'fs/promises';
import { pathToFileURL } from 'url';
import path from 'path';

// ---------------------------------------------------------------------------
// 1. Browser-global stubs required by Three.js in a Node context
// ---------------------------------------------------------------------------
globalThis.self = globalThis;
Object.defineProperty(globalThis, 'navigator', {
  value: { userAgent: 'node' },
  writable: true,
  configurable: true,
});
globalThis.window = globalThis;
globalThis.document = {
  createElementNS: () => ({ style: {} }),
  createElement: () => ({ getContext: () => null, style: {} }),
};
globalThis.Image = class {
  addEventListener() {}
  removeEventListener() {}
};
// Blob + URL stubs needed by DRACOLoader worker creation
globalThis.Blob = globalThis.Blob ?? class Blob { constructor(parts) { this._parts = parts; } };
globalThis.URL = globalThis.URL ?? {};
if (!globalThis.URL.createObjectURL) globalThis.URL.createObjectURL = () => 'blob:node://stub';
if (!globalThis.URL.revokeObjectURL) globalThis.URL.revokeObjectURL = () => {};

// ---------------------------------------------------------------------------
// 2. Import Three.js loaders
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// ---------------------------------------------------------------------------
// 3. Helpers
// ---------------------------------------------------------------------------

/** Round a number to N decimal places */
const r = (n, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

/** Format a Vector3-like {x,y,z} as a string */
const v3 = (v) => `(${r(v.x)}, ${r(v.y)}, ${r(v.z)})`;

/** Count triangles in a BufferGeometry */
function countTris(geo) {
  if (geo.index) return geo.index.count / 3;
  const pos = geo.attributes.position;
  return pos ? pos.count / 3 : 0;
}

/** Match a mesh name against category keywords */
const CATEGORIES = [
  { key: 'rail',    words: ['rail', 'handrail', 'grind'] },
  { key: 'ramp',    words: ['ramp', 'kicker', 'wedge'] },
  { key: 'quarter', words: ['quarter', 'qpipe', 'quarterpipe'] },
  { key: 'half',    words: ['half', 'halfpipe'] },
  { key: 'wall',    words: ['wall', 'barrier', 'fence'] },
  { key: 'floor',   words: ['floor', 'ground', 'pavement', 'asphalt', 'concrete', 'terrain', 'plane'] },
  { key: 'stair',   words: ['stair', 'step', 'stairs', 'steps'] },
  { key: 'ledge',   words: ['ledge', 'curb', 'coping', 'bench'] },
  { key: 'pipe',    words: ['pipe', 'tube', 'cylinder'] },
  { key: 'box',     words: ['box', 'cube', 'block', 'manual'] },
  { key: 'funbox',  words: ['funbox', 'fun_box', 'fun box'] },
  { key: 'bowl',    words: ['bowl', 'pool'] },
  { key: 'building', words: ['building', 'roof', 'window', 'door', 'shop', 'store', 'wall_ext'] },
  { key: 'light',   words: ['light', 'lamp', 'lantern', 'bulb'] },
  { key: 'prop',    words: ['prop', 'deco', 'trash', 'sign', 'banner', 'can', 'bench', 'seat', 'chair'] },
  { key: 'sky',     words: ['sky', 'skybox', 'sky_dome', 'backdrop'] },
];

function categorise(name) {
  const low = name.toLowerCase();
  for (const { key, words } of CATEGORIES) {
    if (words.some((w) => low.includes(w))) return key;
  }
  return 'other';
}

// ---------------------------------------------------------------------------
// 4. Load the GLB file as an ArrayBuffer and feed it to GLTFLoader
// ---------------------------------------------------------------------------

const GLB_PATH = '/Users/fer/Downloads/skate_shop_backlot_skatepark.glb';

console.log(`\nLoading: ${GLB_PATH}\n`);

const fileBuffer = await readFile(GLB_PATH);
const arrayBuffer = fileBuffer.buffer.slice(
  fileBuffer.byteOffset,
  fileBuffer.byteOffset + fileBuffer.byteLength,
);

// ---------------------------------------------------------------------------
// 5. Configure loaders
// ---------------------------------------------------------------------------

const manager = new THREE.LoadingManager();

// GLTFLoader uses ImageBitmapLoader / TextureLoader internally.
// Override createImageBitmap so texture loading doesn't crash Node.
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close: () => {} });

const dracoLoader = new DRACOLoader(manager);

// Point DRACOLoader at the local copy bundled with three so it doesn't
// need a network request.  FileLoader uses fetch() which in Node 18+
// supports file:// URLs.
const dracoLocalDir = path.resolve(
  '/Users/fer/Skate/node_modules/three/examples/jsm/libs/draco/gltf/',
);
dracoLoader.setDecoderPath(pathToFileURL(dracoLocalDir).href + '/');

const gltfLoader = new GLTFLoader(manager);
gltfLoader.setDRACOLoader(dracoLoader);

// ---------------------------------------------------------------------------
// 6. Parse
// ---------------------------------------------------------------------------

let gltf;
try {
  gltf = await new Promise((resolve, reject) => {
    gltfLoader.parse(arrayBuffer, '', resolve, reject);
  });
} catch (err) {
  console.error('\nFailed to load GLB:', err.message ?? err);
  console.error(
    '\nNote: if the file uses Draco compression and the decoder could not be\n' +
    'initialised in Node.js, try running with --experimental-vm-modules or\n' +
    'copy the draco_decoder.wasm next to this script.\n',
  );
  process.exit(1);
}

const scene = gltf.scene ?? gltf.scenes?.[0];
if (!scene) {
  console.error('No scene found in GLB.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 7. Traverse & collect mesh data
// ---------------------------------------------------------------------------

const meshes = [];

scene.traverse((obj) => {
  if (obj.isMesh || obj.isSkinnedMesh) {
    const geo = obj.geometry;
    if (!geo) return;

    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const size = new THREE.Vector3();
    bb.getSize(size);

    const worldBB = new THREE.Box3().setFromObject(obj);
    const worldSize = new THREE.Vector3();
    worldBB.getSize(worldSize);

    meshes.push({
      name: obj.name || '(unnamed)',
      fullPath: getPath(obj),
      tris: Math.round(countTris(geo)),
      localSize: size,
      worldSize,
      worldBB,
      category: categorise(obj.name || ''),
    });
  }
});

function getPath(obj) {
  const parts = [];
  let cur = obj;
  while (cur && cur !== scene) {
    if (cur.name) parts.unshift(cur.name);
    cur = cur.parent;
  }
  return parts.join(' > ');
}

// ---------------------------------------------------------------------------
// 8. Overall scene bounding box
// ---------------------------------------------------------------------------

const sceneBB = new THREE.Box3().setFromObject(scene);
const sceneSize = new THREE.Vector3();
sceneBB.getSize(sceneSize);
const sceneCenter = new THREE.Vector3();
sceneBB.getCenter(sceneCenter);

// ---------------------------------------------------------------------------
// 9. Group by category
// ---------------------------------------------------------------------------

const byCategory = {};
for (const m of meshes) {
  (byCategory[m.category] ??= []).push(m);
}

const totalTris = meshes.reduce((s, m) => s + m.tris, 0);

// ---------------------------------------------------------------------------
// 10. Print report
// ---------------------------------------------------------------------------

const HR  = '='.repeat(80);
const hr2 = '-'.repeat(80);

console.log(HR);
console.log('  GLB STRUCTURE REPORT');
console.log(`  File : ${GLB_PATH}`);
console.log(HR);

console.log(`\n  Total meshes    : ${meshes.length}`);
console.log(`  Total triangles : ${totalTris.toLocaleString()}`);

console.log(`\n  Scene bounding box:`);
console.log(`    Min    : ${v3(sceneBB.min)}`);
console.log(`    Max    : ${v3(sceneBB.max)}`);
console.log(`    Size   : ${v3(sceneSize)}`);
console.log(`    Center : ${v3(sceneCenter)}`);

// ---------------------------------------------------------------------------
// 11. Meshes by category
// ---------------------------------------------------------------------------

console.log('\n' + HR);
console.log('  MESHES BY CATEGORY');
console.log(HR);

const catOrder = [
  'rail','ramp','quarter','half','wall','floor','stair',
  'ledge','pipe','box','funbox','bowl','building','light','prop','sky','other',
];

for (const cat of catOrder) {
  const group = byCategory[cat];
  if (!group || group.length === 0) continue;
  const catTris = group.reduce((s, m) => s + m.tris, 0);
  console.log(`\n  [${cat.toUpperCase()}]  (${group.length} mesh${group.length > 1 ? 'es' : ''}, ${catTris.toLocaleString()} tris)`);
  console.log(hr2);
  for (const m of group) {
    const ws = m.worldSize;
    console.log(
      `  ${m.name.padEnd(50)} | tris: ${String(m.tris).padStart(7)} | world size: ${r(ws.x,2)} x ${r(ws.y,2)} x ${r(ws.z,2)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// 12. Full mesh list sorted by triangle count (top 30)
// ---------------------------------------------------------------------------

console.log('\n' + HR);
console.log('  TOP 30 MESHES BY TRIANGLE COUNT');
console.log(HR);

const sorted = [...meshes].sort((a, b) => b.tris - a.tris).slice(0, 30);
for (const m of sorted) {
  const ws = m.worldSize;
  console.log(
    `  ${m.name.padEnd(50)} | tris: ${String(m.tris).padStart(7)} | size: ${r(ws.x,2)} x ${r(ws.y,2)} x ${r(ws.z,2)}`,
  );
}

// ---------------------------------------------------------------------------
// 13. Naming pattern analysis
// ---------------------------------------------------------------------------

console.log('\n' + HR);
console.log('  NAMING PATTERN ANALYSIS');
console.log(HR);

// Extract unique "stems" (split on _, -, digits, camelCase)
const wordFreq = {};
for (const m of meshes) {
  const tokens = m.name
    .replace(/([a-z])([A-Z])/g, '$1 $2')   // camelCase split
    .split(/[\s_\-\.0-9]+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length > 2);
  for (const t of tokens) wordFreq[t] = (wordFreq[t] ?? 0) + 1;
}

const topWords = Object.entries(wordFreq)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 40);

console.log('\n  Most common name tokens (word : count):');
for (const [word, count] of topWords) {
  console.log(`    ${word.padEnd(30)} ${count}`);
}

// ---------------------------------------------------------------------------
// 14. Category summary table
// ---------------------------------------------------------------------------

console.log('\n' + HR);
console.log('  CATEGORY SUMMARY');
console.log(HR);
console.log(`  ${'Category'.padEnd(15)} ${'Meshes'.padStart(7)} ${'Triangles'.padStart(12)} ${'% of tris'.padStart(10)}`);
console.log(hr2);
for (const cat of catOrder) {
  const group = byCategory[cat];
  if (!group || group.length === 0) continue;
  const catTris = group.reduce((s, m) => s + m.tris, 0);
  const pct = ((catTris / totalTris) * 100).toFixed(1);
  console.log(
    `  ${cat.padEnd(15)} ${String(group.length).padStart(7)} ${catTris.toLocaleString().padStart(12)} ${(pct + '%').padStart(10)}`,
  );
}
console.log(HR + '\n');

dracoLoader.dispose();
