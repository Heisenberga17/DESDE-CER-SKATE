// === Character Selection Screen ===

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { CHARACTERS } from './characters.js';

/**
 * Shows a character selection overlay and returns the chosen character object.
 * @returns {Promise<object>} selected character { id, name, modelPath, texturePath, description }
 */
export function showCharacterSelect() {
  return new Promise((resolve) => {
    let selectedIndex = 0;
    const models = new Array(CHARACTERS.length).fill(null);
    let currentPreview = null;

    // --- Three.js preview scene ---
    const previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    previewRenderer.setSize(300, 400);
    previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
    previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    previewRenderer.toneMappingExposure = 1.0;

    const previewScene = new THREE.Scene();
    const previewCamera = new THREE.PerspectiveCamera(35, 300 / 400, 0.1, 50);
    previewCamera.position.set(0, 1.0, 3.5);
    previewCamera.lookAt(0, 0.7, 0);

    // Lighting for clear model colors
    previewScene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(2, 3, 4);
    previewScene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-2, 1, -2);
    previewScene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 2, -3);
    previewScene.add(rimLight);

    // Ground disc
    const groundGeo = new THREE.CircleGeometry(1.2, 32);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2a, roughness: 0.8 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    previewScene.add(ground);

    // --- Preload all FBX models ---
    const loader = new FBXLoader();
    const texLoader = new THREE.TextureLoader();

    function loadModel(index) {
      return new Promise((res) => {
        loader.load(
          CHARACTERS[index].modelPath,
          async (fbx) => {
            // Scale to fit preview
            fbx.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(fbx);
            const height = box.max.y - box.min.y;
            const s = 1.8 / height;
            fbx.scale.setScalar(s);

            // Center horizontally, feet on ground
            fbx.updateMatrixWorld(true);
            const box2 = new THREE.Box3().setFromObject(fbx);
            const center = box2.getCenter(new THREE.Vector3());
            fbx.position.x -= center.x;
            fbx.position.z -= center.z;
            fbx.position.y -= box2.min.y;

            // Load texture and apply to all meshes
            const texPath = CHARACTERS[index].texturePath;
            let texture = null;
            if (texPath) {
              try {
                texture = await texLoader.loadAsync(texPath);
                texture.colorSpace = THREE.SRGBColorSpace;
              } catch (e) {
                console.warn('Texture load failed for', CHARACTERS[index].name, e);
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
              }
            });

            models[index] = fbx;
            res(fbx);
          },
          undefined,
          (err) => { console.warn('Failed to load', CHARACTERS[index].name, err); res(null); }
        );
      });
    }

    // Load all in parallel
    Promise.all(CHARACTERS.map((_, i) => loadModel(i))).then(() => {
      showModel(selectedIndex);
    });

    function showModel(index) {
      if (currentPreview) previewScene.remove(currentPreview);
      if (models[index]) {
        currentPreview = models[index];
        previewScene.add(currentPreview);
      }
    }

    // --- HTML overlay ---
    const overlay = document.createElement('div');
    overlay.id = 'character-select';
    overlay.innerHTML = `
      <style>
        #character-select {
          position: fixed; inset: 0; z-index: 1000;
          background: radial-gradient(ellipse at center, #1a0a2a 0%, #0a0412 100%);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          font-family: 'Courier New', monospace; color: #e0d0ff;
          transition: opacity 0.4s; opacity: 1;
        }
        #cs-title {
          font-size: 2.2rem; font-weight: bold; letter-spacing: 0.3em;
          text-transform: uppercase; margin-bottom: 1.5rem;
          background: linear-gradient(90deg, #cc66ff, #ff66cc, #cc66ff);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          text-shadow: none;
        }
        #cs-preview-container {
          width: 300px; height: 400px; border: 2px solid #6a2a8a;
          border-radius: 12px; overflow: hidden; margin-bottom: 1.5rem;
          box-shadow: 0 0 30px rgba(106, 42, 138, 0.4);
        }
        #cs-names {
          display: flex; gap: 1.5rem; margin-bottom: 1rem;
        }
        .cs-name {
          padding: 0.6rem 1.5rem; border: 2px solid #4a1a6a; border-radius: 8px;
          cursor: pointer; font-size: 1.1rem; font-family: inherit;
          background: transparent; color: #a080c0;
          transition: all 0.2s; letter-spacing: 0.1em;
        }
        .cs-name:hover { border-color: #8a4aaa; color: #d0b0ff; }
        .cs-name.active {
          border-color: #cc66ff; color: #ffffff;
          background: rgba(204, 102, 255, 0.15);
          box-shadow: 0 0 15px rgba(204, 102, 255, 0.3);
        }
        #cs-desc {
          font-size: 0.9rem; color: #8a6aaa; margin-bottom: 1.5rem;
          min-height: 1.2em;
        }
        #cs-start {
          padding: 0.8rem 3rem; border: 2px solid #cc66ff; border-radius: 8px;
          background: rgba(204, 102, 255, 0.1); color: #cc66ff;
          font-size: 1.2rem; font-family: inherit; cursor: pointer;
          letter-spacing: 0.2em; text-transform: uppercase;
          transition: all 0.2s;
        }
        #cs-start:hover {
          background: rgba(204, 102, 255, 0.25);
          box-shadow: 0 0 20px rgba(204, 102, 255, 0.4);
        }
        #cs-hint {
          margin-top: 1rem; font-size: 0.75rem; color: #5a3a7a;
        }
      </style>
      <div id="cs-title">Select Character</div>
      <div id="cs-preview-container"></div>
      <div id="cs-names"></div>
      <div id="cs-desc"></div>
      <button id="cs-start">START</button>
      <div id="cs-hint">← → or A/D to browse · Enter to confirm</div>
    `;
    document.body.appendChild(overlay);

    // Insert the preview canvas
    const container = overlay.querySelector('#cs-preview-container');
    container.appendChild(previewRenderer.domElement);

    // Build name buttons
    const namesDiv = overlay.querySelector('#cs-names');
    const descDiv = overlay.querySelector('#cs-desc');

    CHARACTERS.forEach((char, i) => {
      const btn = document.createElement('button');
      btn.className = 'cs-name';
      btn.textContent = char.name;
      btn.addEventListener('click', () => selectChar(i));
      namesDiv.appendChild(btn);
    });

    function selectChar(index) {
      selectedIndex = index;
      showModel(index);
      // Update UI
      namesDiv.querySelectorAll('.cs-name').forEach((btn, i) => {
        btn.classList.toggle('active', i === index);
      });
      descDiv.textContent = CHARACTERS[index].description;
    }

    // Initial selection
    selectChar(0);

    // Confirm
    function confirm() {
      cleanup();
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        resolve(CHARACTERS[selectedIndex]);
      }, 400);
    }

    overlay.querySelector('#cs-start').addEventListener('click', confirm);

    // Keyboard
    function onKey(e) {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        selectChar((selectedIndex + 1) % CHARACTERS.length);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        selectChar((selectedIndex - 1 + CHARACTERS.length) % CHARACTERS.length);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        confirm();
      }
    }
    window.addEventListener('keydown', onKey);

    // Animate preview
    let animId;
    function animatePreview() {
      animId = requestAnimationFrame(animatePreview);
      if (currentPreview) {
        currentPreview.rotation.y += 0.01;
      }
      previewRenderer.render(previewScene, previewCamera);
    }
    animatePreview();

    function cleanup() {
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(animId);
      previewRenderer.dispose();
    }
  });
}
