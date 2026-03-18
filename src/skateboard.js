// === Skateboard Loader (GLB model) ===

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { BOARD, COLORS } from './config.js';

export async function createSkateboard() {
  const group = new THREE.Group();
  const wheels = [];

  try {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    const gltf = await loader.loadAsync('/skateboard.glb');
    const model = gltf.scene;

    // Measure raw bounds
    const bbox = new THREE.Box3().setFromObject(model);
    const size = bbox.getSize(new THREE.Vector3());
    console.warn('Skateboard raw size:', size.x.toFixed(3), size.y.toFixed(3), size.z.toFixed(3));

    // Scale so the longest horizontal axis matches BOARD.deckLength (0.85m)
    const longestHoriz = Math.max(size.x, size.z);
    const scale = BOARD.deckLength / longestHoriz;
    model.scale.setScalar(scale);

    // Re-measure
    model.updateMatrixWorld(true);
    bbox.setFromObject(model);
    const center = bbox.getCenter(new THREE.Vector3());
    const scaledSize = bbox.getSize(new THREE.Vector3());
    console.warn('Skateboard scaled size:', scaledSize.x.toFixed(3), scaledSize.y.toFixed(3), scaledSize.z.toFixed(3));

    // Rotate 90° so board runs along Z (direction of travel)
    model.rotation.y = Math.PI / 2;

    // Re-measure after rotation
    model.updateMatrixWorld(true);
    bbox.setFromObject(model);
    const center2 = bbox.getCenter(new THREE.Vector3());

    // Center horizontally, bottom at y=0
    model.position.x -= center2.x;
    model.position.z -= center2.z;
    model.position.y -= bbox.min.y;

    // Find wheels for spinning
    model.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const name = (child.name || '').toLowerCase();
      if (name.includes('wheel')) {
        wheels.push(child);
      }
    });

    group.add(model);
    console.warn('Skateboard GLB loaded,', wheels.length, 'wheels found');
  } catch (err) {
    console.warn('Skateboard GLB failed, using procedural:', err.message || err);
    return createProceduralFallback();
  }

  group.position.y = BOARD.boardY;
  return { group, wheels, deck: group };
}

function createProceduralFallback() {
  const group = new THREE.Group();
  const wheels = [];

  const deckGeo = new THREE.BoxGeometry(BOARD.deckWidth, BOARD.deckHeight, BOARD.deckLength, 1, 1, 4);
  const pos = deckGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    if (Math.abs(z) > BOARD.deckLength * 0.35) {
      pos.setY(i, pos.getY(i) + (Math.abs(z) - BOARD.deckLength * 0.35) * 0.3);
    }
  }
  deckGeo.computeVertexNormals();
  const deck = new THREE.Mesh(deckGeo, new THREE.MeshStandardMaterial({ color: COLORS.deckWood, roughness: 0.85 }));
  deck.position.y = BOARD.deckHeight / 2;
  deck.castShadow = true;
  group.add(deck);

  // Neon stripe
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(BOARD.deckWidth * 0.25, 0.004, BOARD.deckLength * 0.82),
    new THREE.MeshStandardMaterial({ color: COLORS.neon, emissive: COLORS.neon, emissiveIntensity: 0.8 })
  );
  stripe.position.y = BOARD.deckHeight + 0.004;
  group.add(stripe);

  // Trucks + wheels
  const truckMat = new THREE.MeshStandardMaterial({ color: COLORS.truck, roughness: 0.35, metalness: 0.75 });
  const wheelGeo = new THREE.CylinderGeometry(BOARD.wheelRadius, BOARD.wheelRadius, BOARD.wheelWidth, 16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: COLORS.wheel, roughness: 0.5, metalness: 0.2 });

  for (const zSign of [1, -1]) {
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, BOARD.truckWidth, 8), truckMat);
    axle.rotation.z = Math.PI / 2;
    axle.position.set(0, -0.02, zSign * BOARD.deckLength * 0.3);
    group.add(axle);

    for (const xSign of [1, -1]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(xSign * BOARD.truckWidth / 2, -0.02, zSign * BOARD.deckLength * 0.3);
      wheel.castShadow = true;
      group.add(wheel);
      wheels.push(wheel);
    }
  }

  group.position.y = BOARD.boardY;
  return { group, wheels, deck: group };
}

export function updateWheelSpin(wheels, speed, dt) {
  const spinRate = speed * 8;
  for (const w of wheels) {
    w.rotation.x += spinRate * dt;
  }
}
