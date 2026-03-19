// === REMBOT Skater Configuration ===

// Colors
export const COLORS = {
  ground: 0x1a6a2a,
  gridLine: 0x2a8a3a,
  obstacle: 0x444466,
  obstacleDark: 0x333355,
  obstacleLight: 0x555577,
  rail: 0xaaaacc,
  neon: 0x00ffaa,
  neonHex: '#00ffaa',
  skyTop: 0x1a0a2a,
  skyHorizon: 0x4a1a5a,
  fog: 0x150a20,
  deckWood: 0x333333,
  gripTape: 0x111111,
  wheel: 0x444444,
  truck: 0x888888,
  body: 0x888899,
};

// Player physics
export const PLAYER = {
  maxSpeed: 28,
  acceleration: 18,
  brakeForce: 20,
  friction: 4.0,
  turnSpeed: 2.8,
  airTurnSpeed: 1.0,
  gravity: 32,
  jumpForce: 12,
  groundY: 0,
  crouchDepth: -0.15,
  crouchSpeed: 8,
  landingBounce: 0.08,
  landingBounceSpeed: 12,
};

// Skateboard dimensions
export const BOARD = {
  deckLength: 0.85,
  deckWidth: 0.22,
  deckHeight: 0.02,
  wheelRadius: 0.028,
  wheelWidth: 0.02,
  truckWidth: 0.16,
  truckHeight: 0.015,
  boardY: 0.0, // height of deck above ground
};

// Camera
export const CAMERA = {
  distance: 2.8,
  height: 1.5,
  lookAhead: 0.8,
  lerpSpeed: 3.0,
  airHeightBonus: 1.5,
  speedZoomOut: 0.04,
  fov: 65,
  near: 0.1,
  far: 200,
  // Side camera
  sideRight: 2.0,
  sideFwd: 0.3,
  sideHeight: 1.4,
  sideLookHeight: 1.2,
};

// Tricks
export const TRICKS = {
  flipSpeed: 10, // radians per second for flip tricks
  flipDuration: 0.35, // seconds to complete a flip
  shuvitSpeed: 10,
  shuvitDuration: 0.35,
};

// Grinding
export const GRIND = {
  snapDistance: 3.5, // how close you need to be to snap to a rail
  snapHeight: 2.0, // height tolerance for snapping
  speed: 12, // grinding speed
  dismountForce: 8, // upward force when dismounting
};

// Audio
export const AUDIO = {
  rollMinSpeed: 0.5,
  rollMaxVolume: 0.15,
  rollMinPitch: 0.6,
  rollMaxPitch: 1.4,
  ollieVolume: 0.25,
  landVolume: 0.3,
  grindVolume: 0.2,
};

// Lighting
export const LIGHTING = {
  ambientIntensity: 0.8,
  ambientColor: 0x6a7a9a,
  dirIntensity: 1.8,
  dirColor: 0xffeedd,
  dirPosition: [15, 20, 10],
  rimIntensity: 0.6,
  rimColor: 0x6633aa,
  rimPosition: [-10, 8, -15],
  shadowMapSize: 2048,
};

// Post-processing
export const POST = {
  bloomIntensity: 1.5,
  bloomThreshold: 0.8,
  bloomRadius: 0.4,
};
