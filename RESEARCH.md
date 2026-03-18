# REMBOT Skater — Tech Stack Research

## 3D Engine: Three.js
- **Winner over Babylon.js** — 168KB gzipped vs 1.4MB, native FBXLoader, 5.5M weekly npm downloads
- Better procedural geometry control via BufferGeometry
- Excellent post-processing pipeline (EffectComposer + passes)
- PCFSoftShadowMap support built-in
- Massive community = more examples for skateboard game mechanics

## Physics: Custom (No Library)
- **Custom over Rapier/Cannon-es** — arcade games need exaggerated, tunable physics, not simulation
- Tony Hawk games used custom physics engines for a reason — snap-to-rail, exaggerated air, instant responsiveness
- Our needs are simple: gravity, ground plane, ramp angle detection, rail snapping, AABB collision
- Estimated ~400-500 lines of focused code
- No WASM overhead (Rapier), no bloated solver (Cannon-es)
- Full control over every parameter — turn radius, jump arc, grind speed, friction

## Model Loading: FBX at Runtime
- Research suggested GLB conversion, but for a 74KB file with 865 verts, the FBXLoader overhead is acceptable
- Avoids needing Blender CLI in build pipeline
- FBXLoader handles our Z-up to Y-up conversion needs
- Direct transform manipulation for procedural animation (lean, tilt, crouch, bounce)

## Procedural Animation: Direct Transform Manipulation
- No skeleton = no AnimationMixer needed
- Per-frame rotation/position/scale updates on mesh and skateboard group
- Standard pattern in Three.js games for static mesh animation
- Lean into turns, crouch on ollie charge, rise on jump, compress on landing

## Post-Processing: `postprocessing` npm package (pmndrs)
- **Winner over Three.js EffectComposer** — auto-merges effects into minimal render passes
- Better bloom quality (selective bloom for neon elements)
- Better SSAO implementation
- ~15-20KB gzipped — worth it for visual quality
- Cleaner API: EffectPass auto-organizes effects

## Audio: Raw Web Audio API
- **Skip Howler.js** — only 4-5 sounds, not worth 7KB dependency
- Native looping, pitch control (playbackRate), volume (GainNode)
- ~50-100 lines of boilerplate for our sound manager
- Zero bundle overhead

## Build Tool: Vite
- Best DX for Three.js projects — fast HMR, native ESM
- No WASM complexity (since we're not using Rapier)
- Static asset handling for FBX file
- Tree-shaking for Three.js imports
