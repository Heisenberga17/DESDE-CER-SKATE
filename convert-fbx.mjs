// Minimal FBX geometry extractor + GLB writer
// Extracts raw vertices and indices from binary FBX and writes a clean GLB
import { readFileSync, writeFileSync } from 'fs';
import { inflate } from 'fflate';

const fbxData = readFileSync('public/REMBOT_humanoid_v2.fbx');
const buf = fbxData.buffer.slice(fbxData.byteOffset, fbxData.byteOffset + fbxData.byteLength);
const view = new DataView(buf);

// Check header
const header = new TextDecoder().decode(new Uint8Array(buf, 0, 20));
console.log('Header:', header);

// FBX binary version
const version = view.getUint32(23, true);
console.log('FBX version:', version);

// Parse FBX nodes to find geometry
let offset = 27; // After header

function readFBXNode(data, view, startOffset, endOffset) {
  const nodes = [];
  let off = startOffset;

  while (off < endOffset) {
    let nodeEnd, numProps, propListLen;
    let nameLen;

    if (version >= 7500) {
      nodeEnd = Number(view.getBigUint64(off, true)); off += 8;
      numProps = Number(view.getBigUint64(off, true)); off += 8;
      propListLen = Number(view.getBigUint64(off, true)); off += 8;
      nameLen = view.getUint8(off); off += 1;
    } else {
      nodeEnd = view.getUint32(off, true); off += 4;
      numProps = view.getUint32(off, true); off += 4;
      propListLen = view.getUint32(off, true); off += 4;
      nameLen = view.getUint8(off); off += 1;
    }

    if (nodeEnd === 0) break; // Null node = end

    const name = new TextDecoder().decode(new Uint8Array(data, off, nameLen));
    off += nameLen;

    // Read properties
    const props = [];
    const propsStart = off;
    for (let i = 0; i < numProps; i++) {
      const typeCode = String.fromCharCode(view.getUint8(off)); off += 1;

      switch (typeCode) {
        case 'C': props.push(view.getUint8(off) !== 0); off += 1; break;
        case 'Y': props.push(view.getInt16(off, true)); off += 2; break;
        case 'I': props.push(view.getInt32(off, true)); off += 4; break;
        case 'L': props.push(Number(view.getBigInt64(off, true))); off += 8; break;
        case 'F': props.push(view.getFloat32(off, true)); off += 4; break;
        case 'D': props.push(view.getFloat64(off, true)); off += 8; break;
        case 'S':
        case 'R': {
          const len = view.getUint32(off, true); off += 4;
          if (typeCode === 'S') {
            props.push(new TextDecoder().decode(new Uint8Array(data, off, len)));
          } else {
            props.push(new Uint8Array(data, off, len));
          }
          off += len;
          break;
        }
        case 'f': case 'd': case 'l': case 'i': case 'b': {
          const arrLen = view.getUint32(off, true); off += 4;
          const encoding = view.getUint32(off, true); off += 4;
          const compLen = view.getUint32(off, true); off += 4;

          let arrData;
          if (encoding === 1) {
            // Deflate compressed
            const compressed = new Uint8Array(data, off, compLen);
            arrData = new Uint8Array(arrLen * (typeCode === 'd' ? 8 : typeCode === 'l' ? 8 : 4));
            const result = new Uint8Array(arrData.length);
            // Use synchronous inflate
            let inflated;
            try {
              const { inflateSync } = await import('fflate');
              inflated = inflateSync(compressed);
            } catch {
              // Skip this array
              off += compLen;
              props.push(null);
              continue;
            }
            arrData = inflated;
          } else {
            arrData = new Uint8Array(data, off, compLen);
          }
          off += compLen;

          const arrView = new DataView(arrData.buffer, arrData.byteOffset, arrData.byteLength);
          const result = [];
          if (typeCode === 'd') {
            for (let j = 0; j < arrLen; j++) result.push(arrView.getFloat64(j * 8, true));
          } else if (typeCode === 'f') {
            for (let j = 0; j < arrLen; j++) result.push(arrView.getFloat32(j * 4, true));
          } else if (typeCode === 'i') {
            for (let j = 0; j < arrLen; j++) result.push(arrView.getInt32(j * 4, true));
          } else if (typeCode === 'l') {
            for (let j = 0; j < arrLen; j++) result.push(Number(arrView.getBigInt64(j * 8, true)));
          }
          props.push(result);
          break;
        }
        default:
          console.warn('Unknown prop type:', typeCode, 'at', off - 1);
          off = propsStart + propListLen;
          break;
      }
    }

    // Read children
    let children = [];
    if (off < nodeEnd) {
      children = await readFBXNodeRecursive(data, view, off, nodeEnd);
    }

    nodes.push({ name, props, children });
    off = nodeEnd;
  }
  return nodes;
}

async function readFBXNodeRecursive(data, view, start, end) {
  return readFBXNode(data, view, start, end);
}

// This is getting complex. Let me use a simpler approach:
// Just use Three.js FBXLoader in a headless-ish way, stubbing only what's needed

console.log("Trying simplified approach...");

// Stub minimal DOM
globalThis.self = globalThis;
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node' }, writable: true, configurable: true });
globalThis.window = globalThis;
globalThis.document = {
  createElementNS: (ns, tag) => {
    if (tag === 'img') return { set src(v) {}, addEventListener() {}, removeEventListener() {} };
    return { style: {} };
  },
  createElement: (tag) => {
    if (tag === 'canvas') return { getContext: () => null, style: {} };
    return { style: {} };
  },
};
globalThis.Image = class { addEventListener() {} removeEventListener() {} };
globalThis.HTMLCanvasElement = class {};

const THREE = await import('three');
const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');

const loader = new FBXLoader();
try {
  const group = loader.parse(buf, '');
  console.log('FBX parsed! Children:', group.children.length);

  let vertices = null;
  let indices = null;
  let normals = null;

  group.traverse((child) => {
    if (child.isMesh && child.geometry) {
      console.log('Found mesh:', child.name, 'verts:', child.geometry.attributes.position?.count);
      vertices = child.geometry.attributes.position;
      normals = child.geometry.attributes.normal;
      indices = child.geometry.index;
    }
  });

  if (!vertices) {
    console.error('No mesh found!');
    process.exit(1);
  }

  // Apply Z-up to Y-up rotation to vertex data
  const vCount = vertices.count;
  const posArray = new Float32Array(vCount * 3);
  const normArray = normals ? new Float32Array(vCount * 3) : null;

  for (let i = 0; i < vCount; i++) {
    const x = vertices.getX(i);
    const y = vertices.getY(i);
    const z = vertices.getZ(i);
    // Rotate -90 on X: (x, y, z) -> (x, -z, y)
    posArray[i * 3] = x;
    posArray[i * 3 + 1] = z; // Z becomes Y
    posArray[i * 3 + 2] = -y; // -Y becomes Z
  }

  if (normals) {
    for (let i = 0; i < vCount; i++) {
      const x = normals.getX(i);
      const y = normals.getY(i);
      const z = normals.getZ(i);
      normArray[i * 3] = x;
      normArray[i * 3 + 1] = z;
      normArray[i * 3 + 2] = -y;
    }
  }

  let idxArray = null;
  if (indices) {
    idxArray = new Uint16Array(indices.count);
    for (let i = 0; i < indices.count; i++) {
      idxArray[i] = indices.getX(i);
    }
  }

  // Build GLB
  const gltf = {
    asset: { version: "2.0", generator: "rembot-converter" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: "REMBOT" }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0 },
        mode: 4, // TRIANGLES
      }]
    }],
    accessors: [],
    bufferViews: [],
    buffers: [],
  };

  // Build binary buffer
  const bufferParts = [];
  let byteOffset = 0;

  // Position accessor
  const posBuf = Buffer.from(posArray.buffer);
  bufferParts.push(posBuf);
  gltf.bufferViews.push({ buffer: 0, byteOffset, byteLength: posBuf.length, target: 34962 });
  // Compute bounds
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < vCount; i++) {
    minX = Math.min(minX, posArray[i*3]);
    minY = Math.min(minY, posArray[i*3+1]);
    minZ = Math.min(minZ, posArray[i*3+2]);
    maxX = Math.max(maxX, posArray[i*3]);
    maxY = Math.max(maxY, posArray[i*3+1]);
    maxZ = Math.max(maxZ, posArray[i*3+2]);
  }
  gltf.accessors.push({
    bufferView: 0, componentType: 5126, count: vCount, type: "VEC3",
    min: [minX, minY, minZ], max: [maxX, maxY, maxZ],
  });
  byteOffset += posBuf.length;

  // Normal accessor
  if (normArray) {
    const normBuf = Buffer.from(normArray.buffer);
    bufferParts.push(normBuf);
    gltf.bufferViews.push({ buffer: 0, byteOffset, byteLength: normBuf.length, target: 34962 });
    gltf.accessors.push({ bufferView: 1, componentType: 5126, count: vCount, type: "VEC3" });
    gltf.meshes[0].primitives[0].attributes.NORMAL = 1;
    byteOffset += normBuf.length;
  }

  // Index accessor
  if (idxArray) {
    const idxBuf = Buffer.from(idxArray.buffer);
    bufferParts.push(idxBuf);
    const bvIdx = gltf.bufferViews.length;
    gltf.bufferViews.push({ buffer: 0, byteOffset, byteLength: idxBuf.length, target: 34963 });
    gltf.accessors.push({ bufferView: bvIdx, componentType: 5123, count: idxArray.length, type: "SCALAR" });
    gltf.meshes[0].primitives[0].indices = gltf.accessors.length - 1;
    byteOffset += idxBuf.length;
  }

  const binBuffer = Buffer.concat(bufferParts);
  gltf.buffers.push({ byteLength: binBuffer.length });

  // Encode GLB
  const jsonStr = JSON.stringify(gltf);
  const jsonBuf = Buffer.from(jsonStr);
  // Pad JSON to 4-byte boundary
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
  const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]); // pad with spaces

  // Pad bin to 4-byte boundary
  const binPad = (4 - (binBuffer.length % 4)) % 4;
  const binChunk = Buffer.concat([binBuffer, Buffer.alloc(binPad, 0)]);

  const totalLength = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
  const glb = Buffer.alloc(totalLength);
  let w = 0;
  // Header
  glb.writeUInt32LE(0x46546C67, w); w += 4; // magic "glTF"
  glb.writeUInt32LE(2, w); w += 4; // version
  glb.writeUInt32LE(totalLength, w); w += 4;
  // JSON chunk
  glb.writeUInt32LE(jsonChunk.length, w); w += 4;
  glb.writeUInt32LE(0x4E4F534A, w); w += 4; // "JSON"
  jsonChunk.copy(glb, w); w += jsonChunk.length;
  // BIN chunk
  glb.writeUInt32LE(binChunk.length, w); w += 4;
  glb.writeUInt32LE(0x004E4942, w); w += 4; // "BIN\0"
  binChunk.copy(glb, w);

  writeFileSync('public/REMBOT_humanoid_v2.glb', glb);
  console.log(`Wrote REMBOT_humanoid_v2.glb: ${totalLength} bytes`);
  console.log(`Bounds: [${minX.toFixed(3)}, ${minY.toFixed(3)}, ${minZ.toFixed(3)}] to [${maxX.toFixed(3)}, ${maxY.toFixed(3)}, ${maxZ.toFixed(3)}]`);

} catch (e) {
  console.error('Error:', e.message);
  console.error(e.stack);
}
