// === Trick System ===

import { TRICKS } from './config.js';

export const TrickType = {
  NONE: 'none',
  KICKFLIP: 'kickflip',
  HEELFLIP: 'heelflip',
  SHUVIT: 'shuvit',
};

export function createTrickState() {
  return {
    active: TrickType.NONE,
    timer: 0,
    duration: 0,
    startRotX: 0,
    startRotY: 0,
  };
}

export function startTrick(trickState, type, boardGroup) {
  if (trickState.active !== TrickType.NONE) return; // Already doing a trick
  trickState.active = type;
  trickState.timer = 0;
  trickState.startRotX = boardGroup.rotation.x;
  trickState.startRotY = boardGroup.rotation.y;

  switch (type) {
    case TrickType.KICKFLIP:
    case TrickType.HEELFLIP:
      trickState.duration = TRICKS.flipDuration;
      break;
    case TrickType.SHUVIT:
      trickState.duration = TRICKS.shuvitDuration;
      break;
  }
}

export function updateTrick(trickState, boardGroup, dt) {
  if (trickState.active === TrickType.NONE) return;

  trickState.timer += dt;
  const progress = Math.min(trickState.timer / trickState.duration, 1);

  switch (trickState.active) {
    case TrickType.KICKFLIP:
      // 360 degree flip on local X axis
      boardGroup.rotation.x = trickState.startRotX + progress * Math.PI * 2;
      break;
    case TrickType.HEELFLIP:
      // -360 degree flip on local X axis
      boardGroup.rotation.x = trickState.startRotX - progress * Math.PI * 2;
      break;
    case TrickType.SHUVIT:
      // 360 degree spin on Y axis
      boardGroup.rotation.y = trickState.startRotY + progress * Math.PI * 2;
      break;
  }

  // Trick complete
  if (progress >= 1) {
    boardGroup.rotation.x = trickState.startRotX;
    boardGroup.rotation.y = trickState.startRotY;
    trickState.active = TrickType.NONE;
    trickState.timer = 0;
  }
}

export function cancelTrick(trickState, boardGroup) {
  if (trickState.active !== TrickType.NONE) {
    boardGroup.rotation.x = trickState.startRotX;
    boardGroup.rotation.y = trickState.startRotY;
    trickState.active = TrickType.NONE;
    trickState.timer = 0;
  }
}
