// === Audio System (Web Audio API) ===

import { AUDIO } from './config.js';

let ctx = null;
let masterGain = null;
let sounds = {};
let rollSource = null;
let rollGain = null;
let grindSource = null;
let grindGain = null;
let initialized = false;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

// Generate simple sounds procedurally (no external files needed)
function generateBuffer(duration, generator) {
  const c = getCtx();
  const sampleRate = c.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = c.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  generator(data, sampleRate, length);
  return buffer;
}

function generateRollLoop() {
  return generateBuffer(0.5, (data, sr, len) => {
    for (let i = 0; i < len; i++) {
      // Rough rolling noise
      data[i] = (Math.random() * 2 - 1) * 0.3;
      // Add some low-frequency rumble
      data[i] += Math.sin(i / sr * 120 * Math.PI * 2) * 0.15;
      // Add gritty texture
      data[i] += Math.sin(i / sr * 340 * Math.PI * 2) * 0.05 * (Math.random() * 0.5 + 0.5);
    }
  });
}

function generateOlliePop() {
  return generateBuffer(0.12, (data, sr, len) => {
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const env = Math.exp(-t * 15);
      // Sharp pop click with descending pitch
      data[i] = env * Math.sin(i / sr * (800 - 400 * t) * Math.PI * 2) * 0.8;
      data[i] += env * (Math.random() * 2 - 1) * 0.3;
    }
  });
}

function generateLanding() {
  return generateBuffer(0.25, (data, sr, len) => {
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const env = Math.exp(-t * 8);
      // Deep thud
      data[i] = env * Math.sin(i / sr * (60 + 20 * (1 - t)) * Math.PI * 2) * 0.7;
      // Impact noise
      data[i] += env * (Math.random() * 2 - 1) * 0.4 * Math.exp(-t * 20);
    }
  });
}

function generateGrindLoop() {
  return generateBuffer(0.5, (data, sr, len) => {
    for (let i = 0; i < len; i++) {
      // Metallic scrape
      const t = i / len;
      data[i] = (Math.random() * 2 - 1) * 0.25;
      data[i] += Math.sin(i / sr * 1200 * Math.PI * 2) * 0.1 * (Math.random() * 0.5 + 0.5);
      data[i] += Math.sin(i / sr * 2400 * Math.PI * 2) * 0.05 * Math.random();
      // Add some periodic scraping
      data[i] *= 0.7 + 0.3 * Math.sin(i / sr * 15 * Math.PI * 2);
    }
  });
}

export function initAudio() {
  // Sounds are generated lazily on first user interaction
}

function ensureInit() {
  if (initialized) return;
  const c = getCtx();
  if (c.state === 'suspended') c.resume();
  sounds.roll = generateRollLoop();
  sounds.ollie = generateOlliePop();
  sounds.land = generateLanding();
  sounds.grind = generateGrindLoop();
  initialized = true;
}

function playOneShot(buffer, volume = 1.0) {
  ensureInit();
  if (!buffer) return;
  const c = getCtx();
  const source = c.createBufferSource();
  const gain = c.createGain();
  source.buffer = buffer;
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(masterGain);
  source.start(0);
}

export function playOllie() {
  playOneShot(sounds.ollie, AUDIO.ollieVolume);
}

export function playLanding(fallSpeed) {
  const vol = Math.min(AUDIO.landVolume, AUDIO.landVolume * (fallSpeed / 15));
  playOneShot(sounds.land, vol);
}

export function updateRollSound(speed) {
  ensureInit();
  if (!sounds.roll) return;

  const c = getCtx();

  if (speed < AUDIO.rollMinSpeed) {
    if (rollSource) {
      rollGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.1);
      setTimeout(() => {
        try { rollSource.stop(); } catch (_) {}
        rollSource = null;
      }, 150);
    }
    return;
  }

  if (!rollSource) {
    rollSource = c.createBufferSource();
    rollGain = c.createGain();
    rollSource.buffer = sounds.roll;
    rollSource.loop = true;
    rollSource.connect(rollGain);
    rollGain.connect(masterGain);
    rollGain.gain.value = 0;
    rollSource.start(0);
  }

  const speedNorm = Math.min(speed / 20, 1);
  rollGain.gain.linearRampToValueAtTime(speedNorm * AUDIO.rollMaxVolume, c.currentTime + 0.05);
  rollSource.playbackRate.linearRampToValueAtTime(
    AUDIO.rollMinPitch + speedNorm * (AUDIO.rollMaxPitch - AUDIO.rollMinPitch),
    c.currentTime + 0.05
  );
}

export function startGrindSound() {
  ensureInit();
  if (!sounds.grind || grindSource) return;
  const c = getCtx();
  grindSource = c.createBufferSource();
  grindGain = c.createGain();
  grindSource.buffer = sounds.grind;
  grindSource.loop = true;
  grindSource.connect(grindGain);
  grindGain.connect(masterGain);
  grindGain.gain.value = AUDIO.grindVolume;
  grindSource.start(0);
}

export function stopGrindSound() {
  if (grindSource) {
    try { grindSource.stop(); } catch (_) {}
    grindSource = null;
    grindGain = null;
  }
}

export function stopRollSound() {
  if (rollSource) {
    try { rollSource.stop(); } catch (_) {}
    rollSource = null;
    rollGain = null;
  }
}
