// === Debug HUD — Camera Parameter Tweaker ===

import GUI from 'lil-gui';
import { CAMERA } from './config.js';
import { getCamera } from './camera.js';

let gui;

export function createHUD() {
  gui = new GUI({ title: 'Camera Debug' });
  gui.domElement.style.zIndex = '999';
  gui.hide();

  // --- General ---
  gui.add(CAMERA, 'fov', 30, 120, 1).name('FOV').onChange((v) => {
    const cam = getCamera();
    if (cam) {
      cam.fov = v;
      cam.updateProjectionMatrix();
    }
  });

  // --- Behind Camera ---
  const behind = gui.addFolder('Behind Camera');
  behind.add(CAMERA, 'distance', 1, 10, 0.1);
  behind.add(CAMERA, 'height', 0.5, 5, 0.1);
  behind.add(CAMERA, 'lookAhead', 0, 3, 0.1);
  behind.add(CAMERA, 'lerpSpeed', 0.5, 10, 0.1);
  behind.add(CAMERA, 'speedZoomOut', 0, 0.2, 0.01);

  // --- Side Camera ---
  const side = gui.addFolder('Side Camera');
  side.add(CAMERA, 'sideRight', 0.5, 5, 0.1);
  side.add(CAMERA, 'sideFwd', -2, 2, 0.1);
  side.add(CAMERA, 'sideHeight', 0.5, 3, 0.1);
  side.add(CAMERA, 'sideLookHeight', 0.5, 3, 0.1);
}

export function toggleHUD() {
  if (!gui) return;
  if (gui._hidden) {
    gui.show();
  } else {
    gui.hide();
  }
}
