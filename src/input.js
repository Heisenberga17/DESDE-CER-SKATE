// === Input Handler (Keyboard + PS5 DualSense — Skate-style controls) ===
//
// PS5 Mapping (Skate style):
//   Left Stick    — Steer
//   X (Cross)     — Push / Accelerate
//   L2            — Brake
//   Right Stick   — Flickit tricks:
//       Flick up         → Ollie
//       Flick up-left    → Kickflip
//       Flick up-right   → Heelflip
//       Flick left/right → Shuvit
//   Triangle      — Grind (near rail)
//   Options       — Reset
//

const keys = {};
let gamepadIndex = -1;

// PS5 buttons
const PS5 = {
  CROSS: 0,
  CIRCLE: 1,
  SQUARE: 2,
  TRIANGLE: 3,
  L1: 4,
  R1: 5,
  L2: 6,
  R2: 7,
  SHARE: 8,
  OPTIONS: 9,
  L3: 10,
  R3: 11,
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
};

const DEADZONE = 0.15;
const FLICK_THRESHOLD = 0.7; // How far stick must travel to count as a flick

// Right stick flick detection state
let prevRightY = 0;
let prevRightX = 0;
let flickCooldown = 0;

// Flick results (active for one frame)
let flickOllie = false;
let flickKickflip = false;
let flickHeelflip = false;
let flickShuvit = false;

export function initInput() {
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });
  window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
  });

  window.addEventListener('gamepadconnected', (e) => {
    console.warn('Gamepad connected:', e.gamepad.id);
    gamepadIndex = e.gamepad.index;
  });
  window.addEventListener('gamepaddisconnected', (e) => {
    console.warn('Gamepad disconnected:', e.gamepad.id);
    if (e.gamepad.index === gamepadIndex) gamepadIndex = -1;
  });
}

function isKeyDown(code) {
  return !!keys[code];
}

function getGamepad() {
  if (gamepadIndex < 0) return null;
  const gamepads = navigator.getGamepads();
  return gamepads[gamepadIndex] || null;
}

function btn(gp, index) {
  return gp && gp.buttons[index] ? gp.buttons[index].pressed : false;
}

function trigger(gp, index) {
  return gp && gp.buttons[index] ? gp.buttons[index].value : 0;
}

function axis(gp, index) {
  if (!gp) return 0;
  const v = gp.axes[index] || 0;
  return Math.abs(v) > DEADZONE ? v : 0;
}

function detectFlicks(gp) {
  flickOllie = false;
  flickKickflip = false;
  flickHeelflip = false;
  flickShuvit = false;

  if (!gp || flickCooldown > 0) {
    flickCooldown = Math.max(0, flickCooldown - 1);
    prevRightX = axis(gp, 2);
    prevRightY = axis(gp, 3);
    return;
  }

  const rx = axis(gp, 2); // Right stick X
  const ry = axis(gp, 3); // Right stick Y (negative = up)

  // Detect flick UP (stick was down/neutral, now up)
  if (prevRightY >= -0.3 && ry < -FLICK_THRESHOLD) {
    if (rx < -0.4) {
      flickKickflip = true;  // Flick up-left
    } else if (rx > 0.4) {
      flickHeelflip = true;  // Flick up-right
    } else {
      flickOllie = true;     // Flick straight up
    }
    flickCooldown = 10; // ~10 frames cooldown
  }

  // Detect flick sideways (for shuvit)
  if (Math.abs(prevRightX) < 0.3 && Math.abs(rx) > FLICK_THRESHOLD && Math.abs(ry) < 0.4) {
    flickShuvit = true;
    flickCooldown = 10;
  }

  prevRightX = rx;
  prevRightY = ry;
}

export function getInput() {
  const gp = getGamepad();

  // Detect right stick flicks
  detectFlicks(gp);

  const stickX = axis(gp, 0); // Left stick X
  const stickY = axis(gp, 1); // Left stick Y (negative = up/forward)

  return {
    // Movement — left stick to move
    forward:   isKeyDown('KeyW')   || stickY < -DEADZONE,
    brake:     isKeyDown('KeyS')   || stickY > DEADZONE,
    left:      isKeyDown('KeyA')   || stickX < -DEADZONE,
    right:     isKeyDown('KeyD')   || stickX > DEADZONE,

    // Tricks — right stick flicks (Skate style) + button fallbacks
    jump:      isKeyDown('Space')  || flickOllie || flickKickflip || flickHeelflip || btn(gp, PS5.CROSS),
    kickflip:  isKeyDown('KeyF')   || flickKickflip  || btn(gp, PS5.SQUARE),
    heelflip:  isKeyDown('KeyG')   || flickHeelflip  || btn(gp, PS5.CIRCLE),
    shuvit:    isKeyDown('KeyH')   || flickShuvit    || btn(gp, PS5.TRIANGLE),

    // Actions
    grind:     isKeyDown('KeyE')   || btn(gp, PS5.R1),
    reset:     isKeyDown('KeyR')   || btn(gp, PS5.OPTIONS),

    // Analog values
    steerAmount: stickX,
  };
}
