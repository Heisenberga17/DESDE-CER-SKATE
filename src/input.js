// === Input Handler (Keyboard + PS5 DualSense) ===
//
// PS5 Mapping:
//   Left Stick    — Move / Steer
//   Right Stick   — Camera orbit
//   X (Cross)     — Ollie (jump)
//   Square        — Kickflip
//   Circle        — Heelflip
//   Triangle      — Shuvit
//   R1            — Grind (near rail)
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

// Camera toggle (Share button / C key) edge detection
let prevCameraBtn = false;

// HUD toggle (Backquote / Touchpad) edge detection
let prevHudBtn = false;

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
  const gamepads = navigator.getGamepads();
  // If we have a stored index, use it
  if (gamepadIndex >= 0 && gamepads[gamepadIndex]) return gamepads[gamepadIndex];
  // Otherwise scan for any connected gamepad (handles pre-initInput connections)
  for (let i = 0; i < gamepads.length; i++) {
    if (gamepads[i]) {
      gamepadIndex = i;
      return gamepads[i];
    }
  }
  return null;
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

export function getInput() {
  const gp = getGamepad();

  const stickX = axis(gp, 0); // Left stick X
  const stickY = axis(gp, 1); // Left stick Y (negative = up/forward)

  return {
    // Movement — left stick
    forward:   isKeyDown('KeyW')   || stickY < -DEADZONE,
    brake:     isKeyDown('KeyS')   || stickY > DEADZONE,
    left:      isKeyDown('KeyA')   || stickX < -DEADZONE,
    right:     isKeyDown('KeyD')   || stickX > DEADZONE,

    // Tricks — buttons only
    jump:      isKeyDown('Space')  || btn(gp, PS5.CROSS),
    kickflip:  isKeyDown('KeyF')   || btn(gp, PS5.SQUARE),
    heelflip:  isKeyDown('KeyG')   || btn(gp, PS5.CIRCLE),
    shuvit:    isKeyDown('KeyH')   || btn(gp, PS5.TRIANGLE),

    // Actions
    grind:     isKeyDown('KeyE')   || btn(gp, PS5.R1),
    reset:     isKeyDown('KeyR')   || btn(gp, PS5.OPTIONS),

    // Analog values
    steerAmount: stickX,
  };
}

// Right stick values for camera control
export function getCameraInput() {
  const gp = getGamepad();
  return {
    x: axis(gp, 2), // Right stick X (horizontal orbit)
    y: axis(gp, 3), // Right stick Y (vertical pitch)
  };
}

// Camera toggle — returns true once per press (edge detection)
export function pollCameraToggle() {
  const gp = getGamepad();
  const pressed = btn(gp, PS5.SHARE) || isKeyDown('KeyC');
  const toggled = pressed && !prevCameraBtn;
  prevCameraBtn = pressed;
  return toggled;
}

// HUD toggle — backtick or PS5 L1
export function pollHudToggle() {
  const gp = getGamepad();
  const pressed = btn(gp, PS5.L1) || isKeyDown('Backquote');
  const toggled = pressed && !prevHudBtn;
  prevHudBtn = pressed;
  return toggled;
}
