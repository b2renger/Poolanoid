# Poolanoid - Detailed Improvement Plan

## Executive Summary

This document outlines a comprehensive improvement roadmap for Poolanoid, transforming it from a desktop-only prototype into a production-ready mobile-first 3D web game. The plan is divided into 5 phases, prioritizing mobile compatibility and performance before adding new features.

**Estimated Total Effort:** 40-60 hours
**Timeline:** 4-6 weeks (iterative development)

---

## Phase 1: Mobile Compatibility (CRITICAL) 🔴

**Priority:** HIGHEST - Blocking mobile deployment
**Estimated Effort:** 8-12 hours
**Status:** NOT STARTED

### Objectives
- Make the game fully playable on mobile devices (iOS Safari, Android Chrome)
- Implement touch controls for aiming and shooting
- Ensure responsive UI and proper viewport configuration
- Test on real mobile devices

### Task 1.1: Add Touch Event Support

**File:** `game.js`
**Location:** `setupMouseEvents()` method (lines 301-392)

**Implementation Details:**

1. **Create unified input handler**
   ```javascript
   // Extract position from mouse or touch event
   getInputPosition(event) {
       if (event.touches && event.touches.length > 0) {
           return {
               x: event.touches[0].clientX,
               y: event.touches[0].clientY
           };
       }
       return {
           x: event.clientX,
           y: event.clientY
       };
   }
   ```

2. **Refactor event handlers to be input-agnostic**
   - Modify `onMouseDown` → `onInputStart(event)`
   - Modify `onMouseMove` → `onInputMove(event)`
   - Modify `onMouseUp` → `onInputEnd(event)`
   - Add `event.preventDefault()` for touch to prevent scrolling

3. **Add touch event listeners**
   ```javascript
   window.addEventListener('mousedown', onInputStart);
   window.addEventListener('touchstart', onInputStart, { passive: false });

   window.addEventListener('mousemove', onInputMove);
   window.addEventListener('touchmove', onInputMove, { passive: false });

   window.addEventListener('mouseup', onInputEnd);
   window.addEventListener('touchend', onInputEnd);
   ```

4. **Handle multi-touch**
   - Track first touch ID for aiming
   - Ignore subsequent touches while aiming
   - Re-enable OrbitControls after aim release

**Testing Requirements:**
- Test on iOS Safari (iPhone/iPad)
- Test on Android Chrome
- Verify no page scrolling during aim
- Verify OrbitControls work with two-finger rotation

**Success Criteria:**
- ✅ Can aim and shoot using touch on mobile
- ✅ No unwanted page scrolling
- ✅ Camera controls work with multi-touch gestures

---

### Task 1.2: Responsive UI Adjustments

**Files:** `game.js`, `styles.css`, `index.html`

**Implementation Details:**

1. **Update viewport meta tag**

   **File:** `index.html` (line 5)
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0,
         maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
   ```

   **Rationale:**
   - `maximum-scale=1.0, user-scalable=no`: Prevent zoom on double-tap
   - `viewport-fit=cover`: Handle iPhone notches and safe areas

2. **Add PWA meta tags**

   **File:** `index.html` (in `<head>`)
   ```html
   <meta name="apple-mobile-web-app-capable" content="yes">
   <meta name="apple-mobile-web-app-status-bar-style" content="black-fullscreen">
   <meta name="mobile-web-app-capable" content="yes">
   <meta name="theme-color" content="#362F4F">
   ```

3. **Responsive font sizing**

   **File:** `game.js` - `createWallCounter()` method (lines 94-123)

   Current:
   ```javascript
   infoContainer.style.fontSize = '24px';
   ```

   New (responsive):
   ```javascript
   // Scale based on viewport width (min 18px, max 28px)
   const baseFontSize = Math.min(28, Math.max(18, window.innerWidth / 30));
   infoContainer.style.fontSize = `${baseFontSize}px`;
   levelDiv.style.fontSize = `${baseFontSize}px`;
   shotsDiv.style.fontSize = `${baseFontSize}px`;
   counterDiv.style.fontSize = `${baseFontSize}px`;
   ```

4. **Responsive Game Over UI**

   **File:** `game.js` - `gameOver()` method (lines 682-745)

   Changes:
   - Game Over title: `clamp(32px, 5vw, 48px)`
   - Level text: `clamp(18px, 3vw, 24px)`
   - Button: `clamp(16px, 2.5vw, 20px)` with `padding: 2vw 4vw`
   - Button min touch target: 44x44px

5. **Safe area handling for notches**

   **File:** `styles.css`
   ```css
   body {
       /* Handle iPhone notches */
       padding: env(safe-area-inset-top) env(safe-area-inset-right)
                env(safe-area-inset-bottom) env(safe-area-inset-left);
   }

   /* Update HUD positioning */
   #game-container > div {
       top: calc(20px + env(safe-area-inset-top));
       right: calc(20px + env(safe-area-inset-right));
   }
   ```

**Testing Requirements:**
- Test on various screen sizes: 320px (iPhone SE) to 1920px (desktop)
- Test on devices with notches (iPhone X+)
- Verify text readability at all sizes
- Verify button touch targets ≥ 44x44px

**Success Criteria:**
- ✅ UI scales properly on all screen sizes
- ✅ No overlap with notches/safe areas
- ✅ All buttons easily tappable (≥44px)
- ✅ Text readable on small screens

---

### Task 1.3: Orientation Handling

**Files:** `game.js`, `styles.css`

**Implementation Details:**

1. **Add orientation lock suggestion (iOS)**

   **File:** `game.js` - Add to constructor
   ```javascript
   // Request landscape orientation on mobile
   if (screen.orientation && screen.orientation.lock) {
       screen.orientation.lock('landscape').catch(() => {
           // Orientation lock not supported, that's ok
       });
   }
   ```

2. **Add orientation warning overlay**

   **File:** New method in `game.js`
   ```javascript
   createOrientationWarning() {
       const warning = document.createElement('div');
       warning.id = 'orientation-warning';
       warning.style.display = 'none';
       warning.innerHTML = `
           <div style="...">
               <p>Please rotate your device to landscape</p>
               <div style="...">📱 → 📱</div>
           </div>
       `;
       document.body.appendChild(warning);

       // Show/hide based on orientation
       const checkOrientation = () => {
           if (window.innerWidth < window.innerHeight && window.innerWidth < 768) {
               warning.style.display = 'flex';
           } else {
               warning.style.display = 'none';
           }
       };

       window.addEventListener('resize', checkOrientation);
       checkOrientation();
   }
   ```

3. **Adapt table/camera for portrait if needed**
   - Alternative: Scale table to fit portrait viewport
   - Adjust camera position based on aspect ratio
   - Keep as enhancement for later

**Testing Requirements:**
- Test portrait/landscape transitions
- Verify warning appears in portrait on mobile
- Verify game playable in landscape

**Success Criteria:**
- ✅ Orientation warning shows in portrait on mobile
- ✅ Game works optimally in landscape
- ✅ No broken layout on orientation change

---

### Task 1.4: Performance Testing & Optimization

**Files:** `game.js`

**Implementation Details:**

1. **Add FPS monitoring**

   **File:** `game.js` - Add to constructor
   ```javascript
   // Development mode FPS counter
   this.fpsCounter = {
       frames: 0,
       lastTime: performance.now(),
       fps: 60,
       element: null
   };

   if (window.location.search.includes('debug')) {
       this.createFPSCounter();
   }
   ```

2. **Detect and adapt to low-end devices**
   ```javascript
   detectDeviceCapabilities() {
       const canvas = document.createElement('canvas');
       const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

       // Check for performance hints
       const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
       const isLowEnd = navigator.hardwareConcurrency <= 4 ||
                        navigator.deviceMemory <= 4;

       return {
           isMobile,
           isLowEnd,
           supportsWebGL: !!gl
       };
   }
   ```

3. **Adaptive quality settings**
   ```javascript
   applyQualitySettings(deviceInfo) {
       if (deviceInfo.isLowEnd || deviceInfo.isMobile) {
           // Reduce shadow quality
           this.renderer.shadowMap.enabled = !deviceInfo.isLowEnd;

           // Disable antialiasing on low-end
           if (deviceInfo.isLowEnd) {
               this.renderer.antialias = false;
           }

           // Lower pixel ratio
           this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
       } else {
           this.renderer.setPixelRatio(window.devicePixelRatio);
       }
   }
   ```

4. **Add WebGL capability detection**
   ```javascript
   checkWebGLSupport() {
       if (!this.detectDeviceCapabilities().supportsWebGL) {
           // Show error overlay
           document.body.innerHTML = `
               <div style="...">
                   <h1>WebGL Not Supported</h1>
                   <p>Your browser doesn't support WebGL, which is required for this game.</p>
                   <p>Please use a modern browser like Chrome, Firefox, or Safari.</p>
               </div>
           `;
           return false;
       }
       return true;
   }
   ```

**Testing Requirements:**
- Test on low-end Android devices (2-3 years old)
- Test on older iPhones (iPhone 8, XR)
- Monitor frame rate during gameplay
- Verify smooth gameplay (≥30 FPS minimum)

**Success Criteria:**
- ✅ Game runs at 30+ FPS on low-end devices
- ✅ Graceful fallback when WebGL unsupported
- ✅ Adaptive quality maintains playability

---

## Phase 2: Performance & Code Quality ⚡

**Priority:** HIGH - Improves UX and maintainability
**Estimated Effort:** 6-8 hours
**Status:** NOT STARTED

### Task 2.1: Physics Optimization

**File:** `game.js`
**Location:** Constructor physics setup (lines 37-52)

**Implementation Details:**

1. **Upgrade Broadphase Algorithm**

   Current (line 48):
   ```javascript
   broadphase: new CANNON.NaiveBroadphase()
   ```

   New:
   ```javascript
   broadphase: new CANNON.SAPBroadphase(this.world)
   ```

   **Rationale:**
   - NaiveBroadphase: O(n²) - checks every body against every other body
   - SAPBroadphase (Sweep and Prune): O(n log n) - much better for many walls
   - At level 10: 55 walls = 1,485 checks (Naive) vs ~300 checks (SAP)

2. **Enable physics body sleeping optimization**

   Current (line 47):
   ```javascript
   allowSleep: true,
   ```

   Add sleep parameters to ball body (line 177):
   ```javascript
   this.ballBody = new CANNON.Body({
       mass: 1,
       shape: new CANNON.Sphere(ballRadius),
       position: new CANNON.Vec3(0, ballRadius, 0),
       material: new CANNON.Material(),
       linearDamping: 0.38,
       angularDamping: 0.35,
       sleepSpeedLimit: 0.1,      // Sleep when slower than 0.1 units/s
       sleepTimeLimit: 0.5         // Sleep after 0.5s of slow movement
   });
   ```

3. **Optimize collision checking**

   Current approach (lines 441-457): Iterates all contacts every substep

   Alternative approach using collision events:
   ```javascript
   // In createBall() method
   this.ballBody.addEventListener('collide', (event) => {
       const wall = this.walls.find(w => w.body === event.body);
       if (wall && !wall.removing) {
           const impactPos = this.ballBody.position.clone();
           this.removeWall(wall, impactPos);
       }
   });
   ```

   **Trade-off:** Event-based is cleaner but requires careful timing with substeps
   **Recommendation:** Implement and A/B test both approaches

**Performance Target:**
- Maintain 60 FPS up to level 30 (160+ walls)
- Current bottleneck likely around level 20-25

**Testing Requirements:**
- Performance test at levels 1, 10, 20, 30, 50
- Monitor physics update time vs render time
- Test with Chrome DevTools Performance profiler

**Success Criteria:**
- ✅ 60 FPS maintained at level 30 (desktop)
- ✅ 30+ FPS maintained at level 30 (mobile)
- ✅ Physics sleep working correctly

---

### Task 2.2: Configuration Extraction

**Files:** New `config.js`, modify `game.js`

**Implementation Details:**

1. **Create configuration file**

   **New File:** `config.js`
   ```javascript
   export const CONFIG = {
       // Game Constants
       GAME: {
           BASE_WALL_COUNT: 10,
           WALLS_PER_LEVEL: 5,
           BASE_SHOTS: 6,
           EXTRA_SHOTS_PER_LEVEL: 1
       },

       // Visual Constants
       COLORS: {
           BACKGROUND: 0x362F4F,
           TABLE: 0x008BFF,
           BALL: 0xFFD700,
           AIM_LINE: 0xE4FF30,
           UI_TEXT: '#E4FF30',

           WALL_MINT: 0x00FF9C,
           WALL_LIME: 0xE4FF30,
           WALL_MAGENTA: 0xFF5FCF,

           IMPACT_RING: 0x008BFF,

           GAME_OVER_BG: 'rgba(54, 47, 79, 0.92)',
           BUTTON_PRIMARY: '#008BFF',
           BUTTON_HOVER: '#FF5FCF'
       },

       // Physics Constants
       PHYSICS: {
           GRAVITY: -9.82,
           DT: 1/60,
           MIN_STEP_DT: 1/240,
           MAX_SUBSTEPS: 30,
           BULLET_SAFE_DISTANCE: 0.04,

           SOLVER_ITERATIONS: 16,

           // Contact Materials
           BALL_TABLE_FRICTION: 0.42,
           BALL_TABLE_RESTITUTION: 0.12,

           BALL_CUSHION_FRICTION: 0.02,
           BALL_CUSHION_RESTITUTION: 0.80,

           WALL_NORMAL_RESTITUTION: 0.82,
           WALL_BLUE_RESTITUTION: 0.42,
           WALL_RED_RESTITUTION: 0.95,

           BALL_LINEAR_DAMPING: 0.38,
           BALL_ANGULAR_DAMPING: 0.35
       },

       // Dimensions
       DIMENSIONS: {
           TABLE_WIDTH: 10,
           TABLE_HEIGHT: 0.1,
           TABLE_DEPTH: 5,

           WALL_WIDTH: 3,
           WALL_HEIGHT: 0.5,
           WALL_THICKNESS: 0.12,

           BALL_RADIUS: 0.15,

           BOUNDARY_WALL_THICKNESS: 0.1
       },

       // Camera & Rendering
       CAMERA: {
           FOV: 75,
           NEAR: 0.1,
           FAR: 1000,
           POSITION_Y: 6,

           FOG_NEAR: 8,
           FOG_FAR: 22
       },

       // Aiming
       AIMING: {
           MAX_IMPULSE: 50,
           IMPULSE_MULTIPLIER: 4
       },

       // Visual Effects
       EFFECTS: {
           WALL_FADE_DURATION: 200,    // ms
           IMPACT_EFFECT_DURATION: 120, // ms
           IMPACT_RING_MIN_RADIUS: 0.05,
           IMPACT_RING_MAX_RADIUS: 0.22,

           NEXT_LEVEL_DELAY: 1000       // ms
       },

       // Wall Type Probabilities
       WALL_TYPES: {
           MINT: { probability: 0.80, color: 0x00FF9C, type: 'normal' },
           LIME: { probability: 0.10, color: 0xE4FF30, type: 'blue' },
           MAGENTA: { probability: 0.10, color: 0xFF5FCF, type: 'red' }
       }
   };
   ```

2. **Update imports in game.js**
   ```javascript
   import * as THREE from 'three';
   import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
   import * as CANNON from 'cannon';
   import { CONFIG } from './config.js';
   ```

3. **Replace all magic numbers**
   - Search for hardcoded values
   - Replace with `CONFIG.CATEGORY.VALUE`
   - Example: `0x362F4F` → `CONFIG.COLORS.BACKGROUND`

**Benefits:**
- Single source of truth for all constants
- Easy to tweak game balance
- Better for A/B testing
- Cleaner code

**Testing Requirements:**
- Verify game works exactly as before
- No functional changes, only refactoring

**Success Criteria:**
- ✅ All magic numbers extracted to config
- ✅ Game behavior unchanged
- ✅ Config file well-documented

---

### Task 2.3: Error Handling & Robustness

**File:** `game.js`

**Implementation Details:**

1. **Add WebGL context loss handling**
   ```javascript
   setupContextLossHandling() {
       this.renderer.domElement.addEventListener('webglcontextlost', (event) => {
           event.preventDefault();
           console.warn('WebGL context lost');

           // Stop animation loop
           this.isContextLost = true;

           // Show error to user
           this.showContextLostError();
       });

       this.renderer.domElement.addEventListener('webglcontextrestored', () => {
           console.log('WebGL context restored');
           this.isContextLost = false;

           // Reinitialize if needed
           this.hideContextLostError();
       });
   }
   ```

2. **Wrap animation loop in try-catch**
   ```javascript
   animate(time = 0) {
       if (this.isContextLost) return;

       try {
           requestAnimationFrame((t) => this.animate(t));

           // ... existing animation code ...

       } catch (error) {
           console.error('Animation loop error:', error);
           this.handleCriticalError(error);
       }
   }
   ```

3. **Add resource cleanup on page unload**
   ```javascript
   dispose() {
       // Dispose Three.js resources
       this.scene.traverse((object) => {
           if (object.geometry) object.geometry.dispose();
           if (object.material) {
               if (Array.isArray(object.material)) {
                   object.material.forEach(m => m.dispose());
               } else {
                   object.material.dispose();
               }
           }
       });

       // Remove event listeners
       window.removeEventListener('resize', this.onWindowResize);
       // ... other listeners

       // Dispose renderer
       this.renderer.dispose();
   }

   // In constructor:
   window.addEventListener('beforeunload', () => this.dispose());
   ```

4. **Add loading state**
   ```javascript
   createLoadingScreen() {
       const loader = document.createElement('div');
       loader.id = 'loading-screen';
       loader.innerHTML = `
           <div class="spinner"></div>
           <p>Loading Poolanoid...</p>
       `;
       document.body.appendChild(loader);
   }

   hideLoadingScreen() {
       const loader = document.getElementById('loading-screen');
       if (loader) {
           loader.style.opacity = '0';
           setTimeout(() => loader.remove(), 300);
       }
   }
   ```

**Testing Requirements:**
- Simulate context loss in Chrome DevTools
- Test page unload (check for memory leaks)
- Verify error messages user-friendly

**Success Criteria:**
- ✅ Graceful handling of WebGL context loss
- ✅ No memory leaks on page unload
- ✅ User-friendly error messages

---

### Task 2.4: Code Structure Improvements

**Files:** `game.js` → Split into multiple files

**Implementation Details:**

1. **Create modular file structure**
   ```
   src/
   ├── core/
   │   ├── PoolGame.js          (main class)
   │   ├── PhysicsManager.js    (physics setup & simulation)
   │   ├── RenderManager.js     (Three.js rendering)
   │   └── InputManager.js      (mouse/touch handling)
   ├── entities/
   │   ├── Ball.js              (ball creation & management)
   │   ├── Table.js             (table & boundaries)
   │   └── Wall.js              (wall creation & types)
   ├── ui/
   │   ├── HUD.js               (game info display)
   │   ├── GameOverScreen.js    (game over UI)
   │   └── OrientationWarning.js
   ├── effects/
   │   ├── ImpactEffect.js      (impact rings)
   │   └── ParticleSystem.js    (future: particles)
   └── utils/
       ├── config.js
       └── helpers.js
   ```

2. **Refactor PoolGame class**
   - Keep only high-level orchestration
   - Delegate to manager classes
   - Improve testability

3. **Add JSDoc comments**
   ```javascript
   /**
    * Creates a new instance of the pool game
    * @class PoolGame
    * @description Main game controller managing physics, rendering, and game state
    */
   class PoolGame {
       /**
        * Initialize the game
        * @constructor
        */
       constructor() { ... }

       /**
        * Creates random walls for the current level
        * @private
        * @returns {void}
        */
       createRandomWalls() { ... }
   }
   ```

**Note:** This is optional for Phase 2, could move to Phase 5 (Polish)

**Success Criteria:**
- ✅ Cleaner separation of concerns
- ✅ Easier to test individual components
- ✅ Better code documentation

---

## Phase 3: Game Features & Polish 🎮

**Priority:** MEDIUM - Enhances player experience
**Estimated Effort:** 10-14 hours
**Status:** NOT STARTED

### Task 3.1: Sound Effects System

**Files:** New `audio/` directory, new `AudioManager.js`

**Implementation Details:**

1. **Sound effect library**

   Options:
   - **Howler.js** (recommended): Full-featured, 20KB
   - **Tone.js**: More complex, music-focused
   - **Native Web Audio API**: Lightweight but more complex

   **Recommendation:** Use Howler.js

2. **Create AudioManager class**

   **New File:** `src/audio/AudioManager.js`
   ```javascript
   import { Howl } from 'howler';

   export class AudioManager {
       constructor() {
           this.enabled = true;
           this.volume = 0.7;
           this.sounds = {};

           this.loadSounds();
       }

       loadSounds() {
           this.sounds = {
               ballHitWall: new Howl({
                   src: ['assets/sounds/hit-wall.mp3'],
                   volume: 0.6,
                   rate: 1.0
               }),
               ballHitCushion: new Howl({
                   src: ['assets/sounds/hit-cushion.mp3'],
                   volume: 0.5
               }),
               wallBreak: new Howl({
                   src: ['assets/sounds/wall-break.mp3'],
                   volume: 0.7,
                   sprite: {
                       mint: [0, 200],
                       lime: [200, 200],
                       magenta: [400, 200]
                   }
               }),
               shoot: new Howl({
                   src: ['assets/sounds/shoot.mp3'],
                   volume: 0.5
               }),
               levelComplete: new Howl({
                   src: ['assets/sounds/level-complete.mp3'],
                   volume: 0.8
               }),
               gameOver: new Howl({
                   src: ['assets/sounds/game-over.mp3'],
                   volume: 0.8
               }),
               backgroundMusic: new Howl({
                   src: ['assets/sounds/background-music.mp3'],
                   loop: true,
                   volume: 0.3
               })
           };
       }

       play(soundName, options = {}) {
           if (!this.enabled) return;

           const sound = this.sounds[soundName];
           if (!sound) {
               console.warn(`Sound not found: ${soundName}`);
               return;
           }

           if (options.sprite) {
               sound.play(options.sprite);
           } else {
               sound.play();
           }

           // Vary pitch for wall hits (more natural)
           if (soundName === 'ballHitWall' && options.varPitch) {
               sound.rate(0.9 + Math.random() * 0.2);
           }
       }

       toggle() {
           this.enabled = !this.enabled;
           if (!this.enabled) {
               this.sounds.backgroundMusic.stop();
           }
           return this.enabled;
       }

       setVolume(volume) {
           this.volume = Math.max(0, Math.min(1, volume));
           Object.values(this.sounds).forEach(sound => {
               sound.volume(this.volume * sound._volume); // relative volume
           });
       }
   }
   ```

3. **Integrate into game**

   **File:** `game.js`
   ```javascript
   import { AudioManager } from './audio/AudioManager.js';

   // In constructor:
   this.audio = new AudioManager();

   // In removeWall():
   this.audio.play('wallBreak', { sprite: wall.type });

   // In onMouseUp() / shoot:
   this.audio.play('shoot');

   // In checkWallCollisions() for cushion hits:
   this.audio.play('ballHitCushion');

   // In nextLevel():
   this.audio.play('levelComplete');

   // In gameOver():
   this.audio.play('gameOver');
   ```

4. **Create sound toggle UI**
   ```javascript
   createAudioToggle() {
       const button = document.createElement('button');
       button.id = 'audio-toggle';
       button.textContent = '🔊';
       button.style.cssText = `
           position: absolute;
           top: 20px;
           left: 20px;
           background: rgba(0, 139, 255, 0.8);
           border: none;
           color: white;
           font-size: 24px;
           width: 50px;
           height: 50px;
           border-radius: 50%;
           cursor: pointer;
       `;

       button.onclick = () => {
           const enabled = this.audio.toggle();
           button.textContent = enabled ? '🔊' : '🔇';
       };

       document.body.appendChild(button);
   }
   ```

5. **Sound asset creation**

   Options:
   - **Generate programmatically** with Web Audio API (free, unlimited)
   - **Use free libraries**: freesound.org, zapsplat.com
   - **AI generation**: ElevenLabs, Suno (for music)

   **Recommended:** Programmatic generation for simple impacts, free library for music

   **Programmatic example:**
   ```javascript
   // Generate ball hit sound
   function generateHitSound() {
       const audioContext = new AudioContext();
       const duration = 0.1;
       const sampleRate = audioContext.sampleRate;
       const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
       const data = buffer.getChannelData(0);

       for (let i = 0; i < buffer.length; i++) {
           const t = i / sampleRate;
           data[i] = Math.sin(880 * Math.PI * 2 * t) * Math.exp(-t * 20);
       }

       return buffer;
   }
   ```

**Testing Requirements:**
- Test on mobile (iOS requires user interaction before playing sound)
- Test sound volume balance
- Verify toggle works
- Test background music loop

**Success Criteria:**
- ✅ All game actions have appropriate sounds
- ✅ Volume control works
- ✅ Toggle mute works
- ✅ Sounds work on mobile (after first interaction)
- ✅ No audio stuttering

---

### Task 3.2: Local Storage & High Scores

**Files:** New `src/storage/StorageManager.js`, modify `game.js`

**Implementation Details:**

1. **Create StorageManager**

   **New File:** `src/storage/StorageManager.js`
   ```javascript
   export class StorageManager {
       constructor(gameId = 'poolanoid') {
           this.gameId = gameId;
           this.storageKey = `${gameId}_save`;
       }

       saveHighScore(level, score) {
           const data = this.load();

           if (!data.highScores) {
               data.highScores = [];
           }

           data.highScores.push({
               level,
               score,
               date: new Date().toISOString()
           });

           // Keep top 10
           data.highScores.sort((a, b) => b.level - a.level);
           data.highScores = data.highScores.slice(0, 10);

           this.save(data);
       }

       getHighScore() {
           const data = this.load();
           if (!data.highScores || data.highScores.length === 0) {
               return null;
           }
           return data.highScores[0];
       }

       getAllHighScores() {
           const data = this.load();
           return data.highScores || [];
       }

       saveSettings(settings) {
           const data = this.load();
           data.settings = { ...data.settings, ...settings };
           this.save(data);
       }

       getSettings() {
           const data = this.load();
           return data.settings || {
               soundEnabled: true,
               musicEnabled: false,
               quality: 'auto'
           };
       }

       save(data) {
           try {
               localStorage.setItem(this.storageKey, JSON.stringify(data));
           } catch (e) {
               console.error('Failed to save to localStorage:', e);
           }
       }

       load() {
           try {
               const data = localStorage.getItem(this.storageKey);
               return data ? JSON.parse(data) : {};
           } catch (e) {
               console.error('Failed to load from localStorage:', e);
               return {};
           }
       }

       clear() {
           localStorage.removeItem(this.storageKey);
       }
   }
   ```

2. **Integrate into game**

   **File:** `game.js`
   ```javascript
   import { StorageManager } from './storage/StorageManager.js';

   // In constructor:
   this.storage = new StorageManager();
   const settings = this.storage.getSettings();
   this.audio.enabled = settings.soundEnabled;

   // In gameOver():
   this.storage.saveHighScore(this.level, this.calculateScore());
   const highScore = this.storage.getHighScore();

   // Display high score in game over screen
   if (highScore && this.level > highScore.level) {
       levelText.textContent = `🏆 New High Score! Level ${this.level}`;
   } else {
       levelText.textContent = `Level reached: ${this.level}`;
   }
   ```

3. **Add high score display**

   **New method in game.js:**
   ```javascript
   createHighScoreScreen() {
       const screen = document.createElement('div');
       screen.id = 'highscore-screen';
       // ... styling ...

       const scores = this.storage.getAllHighScores();
       const list = document.createElement('ol');

       scores.forEach((score, index) => {
           const item = document.createElement('li');
           item.textContent = `Level ${score.level} - ${new Date(score.date).toLocaleDateString()}`;
           list.appendChild(item);
       });

       screen.appendChild(list);
       return screen;
   }
   ```

4. **Add settings persistence**
   - Save audio on/off state
   - Save quality settings
   - Save control preferences

**Testing Requirements:**
- Test localStorage quota limits
- Test private browsing (localStorage may fail)
- Verify scores persist across sessions

**Success Criteria:**
- ✅ High scores saved and displayed
- ✅ Settings persisted across sessions
- ✅ Graceful handling if localStorage unavailable

---

### Task 3.3: Power-up & Special Walls

**Files:** `game.js`, `config.js`

**Implementation Details:**

1. **Define power-up types**

   **File:** `config.js`
   ```javascript
   WALL_TYPES: {
       MINT: {
           probability: 0.70,  // reduced from 0.80
           color: 0x00FF9C,
           type: 'normal'
       },
       LIME: {
           probability: 0.10,
           color: 0xE4FF30,
           type: 'blue'
       },
       MAGENTA: {
           probability: 0.10,
           color: 0xFF5FCF,
           type: 'red'
       },

       // New power-up walls (total 10% probability)
       MULTI_BALL: {
           probability: 0.03,
           color: 0xFFAA00,  // Orange
           type: 'powerup',
           effect: 'multi_ball'
       },
       EXTRA_SHOT: {
           probability: 0.04,
           color: 0x00FFFF,  // Cyan
           type: 'powerup',
           effect: 'extra_shot'
       },
       BOMB: {
           probability: 0.03,
           color: 0xFF0000,  // Red
           type: 'powerup',
           effect: 'bomb'
       }
   }
   ```

2. **Implement power-up effects**

   **File:** `game.js`
   ```javascript
   removeWall(wall, impactPosition) {
       if (wall.removing) return;
       wall.removing = true;

       // Handle power-up effects
       if (wall.powerup) {
           this.activatePowerup(wall.powerup, impactPosition);
       }

       // ... existing removal code ...
   }

   activatePowerup(powerupType, position) {
       switch (powerupType) {
           case 'multi_ball':
               this.spawnExtraBalls(2, position);
               this.showPowerupText('Multi-Ball!', position);
               break;

           case 'extra_shot':
               this.shotsRemaining += 3;
               this.updateGameInfo();
               this.showPowerupText('+3 Shots!', position);
               this.audio.play('powerup');
               break;

           case 'bomb':
               this.destroyNearbyWalls(position, 1.5); // 1.5 unit radius
               this.showPowerupText('BOOM!', position);
               this.audio.play('explosion');
               break;
       }
   }

   spawnExtraBalls(count, position) {
       // Create temporary balls that exist for one shot
       for (let i = 0; i < count; i++) {
           const angle = (Math.PI * 2 * i) / count;
           const offset = new CANNON.Vec3(
               Math.cos(angle) * 0.5,
               0,
               Math.sin(angle) * 0.5
           );

           // Create ball (similar to main ball)
           const extraBall = this.createExtraBall(position.vadd(offset));
           this.extraBalls.push(extraBall);
       }
   }

   destroyNearbyWalls(position, radius) {
       const wallsToRemove = [];

       this.walls.forEach(wall => {
           const distance = wall.body.position.distanceTo(position);
           if (distance < radius) {
               wallsToRemove.push(wall);
           }
       });

       wallsToRemove.forEach(wall => this.removeWall(wall, wall.body.position));
   }

   showPowerupText(text, position) {
       // Floating text effect
       const textSprite = this.createTextSprite(text);
       textSprite.position.copy(position);
       this.scene.add(textSprite);

       // Animate upward and fade
       const startTime = Date.now();
       const duration = 1500;

       const animateText = () => {
           const elapsed = Date.now() - startTime;
           const progress = elapsed / duration;

           if (progress >= 1) {
               this.scene.remove(textSprite);
               return;
           }

           textSprite.position.y += 0.02;
           textSprite.material.opacity = 1 - progress;

           requestAnimationFrame(animateText);
       };

       animateText();
   }
   ```

3. **Visual indicators for power-ups**
   - Pulsating glow effect
   - Different mesh shape (star, sphere)
   - Particle trail

**Testing Requirements:**
- Test each power-up effect
- Verify bomb radius appropriate
- Test multi-ball interaction

**Success Criteria:**
- ✅ Power-ups spawn at correct probability
- ✅ Each power-up has distinct visual
- ✅ Effects work as intended
- ✅ Game balance maintained

---

### Task 3.4: Combo System & Feedback

**Files:** `game.js`

**Implementation Details:**

1. **Track hit combos**
   ```javascript
   // In constructor:
   this.combo = 0;
   this.comboTimer = null;
   this.COMBO_TIMEOUT = 2000; // 2 seconds to maintain combo

   // In removeWall():
   this.combo++;
   clearTimeout(this.comboTimer);

   if (this.combo >= 2) {
       this.showComboText(this.combo);
       this.audio.play('combo', { pitch: 1 + (this.combo * 0.1) });
   }

   this.comboTimer = setTimeout(() => {
       this.combo = 0;
   }, this.COMBO_TIMEOUT);
   ```

2. **Combo rewards**
   ```javascript
   if (this.combo === 5) {
       this.shotsRemaining++;
       this.showPowerupText('+1 Shot! (5x Combo)', impactPosition);
   } else if (this.combo === 10) {
       this.shotsRemaining += 2;
       this.showPowerupText('+2 Shots! (10x Combo)', impactPosition);
   }
   ```

3. **Visual feedback improvements**
   - Screen shake on wall break
   - Slow-mo effect on high combo
   - Camera zoom on level complete

**Success Criteria:**
- ✅ Combo counter visible
- ✅ Combo timeout works correctly
- ✅ Rewards feel satisfying

---

## Phase 4: Visual Enhancements 🎨

**Priority:** LOW-MEDIUM - Polish and aesthetics
**Estimated Effort:** 8-12 hours
**Status:** NOT STARTED

### Task 4.1: Particle System

**Files:** New `src/effects/ParticleSystem.js`

**Implementation Details:**

1. **Install particle library**

   Options:
   - **three-nebula** (recommended): Modern, GPU-accelerated
   - **three.js built-in PointsMaterial**: Lightweight, manual

   Using three.js built-in for simplicity:

2. **Create particle emitter**

   **New File:** `src/effects/ParticleSystem.js`
   ```javascript
   import * as THREE from 'three';

   export class ParticleSystem {
       constructor(scene) {
           this.scene = scene;
           this.particlePools = [];
       }

       emitWallBreak(position, color, count = 20) {
           const particles = [];

           const geometry = new THREE.BufferGeometry();
           const positions = new Float32Array(count * 3);
           const velocities = new Float32Array(count * 3);
           const lifetimes = new Float32Array(count);

           for (let i = 0; i < count; i++) {
               // Initial position (at impact)
               positions[i * 3] = position.x;
               positions[i * 3 + 1] = position.y;
               positions[i * 3 + 2] = position.z;

               // Random velocity (explosion outward)
               const theta = Math.random() * Math.PI * 2;
               const phi = Math.random() * Math.PI;
               const speed = 1 + Math.random() * 2;

               velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
               velocities[i * 3 + 1] = Math.abs(Math.cos(phi)) * speed; // upward bias
               velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

               lifetimes[i] = 0.5 + Math.random() * 0.5; // 0.5-1.0 seconds
           }

           geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
           geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
           geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

           const material = new THREE.PointsMaterial({
               color: color,
               size: 0.1,
               transparent: true,
               opacity: 1,
               blending: THREE.AdditiveBlending
           });

           const particles = new THREE.Points(geometry, material);
           this.scene.add(particles);

           // Animate particles
           const startTime = Date.now();
           const update = () => {
               const elapsed = (Date.now() - startTime) / 1000;
               const positions = particles.geometry.attributes.position.array;
               const velocities = particles.geometry.attributes.velocity.array;
               const lifetimes = particles.geometry.attributes.lifetime.array;

               let allDead = true;

               for (let i = 0; i < count; i++) {
                   if (elapsed < lifetimes[i]) {
                       allDead = false;

                       // Update position
                       positions[i * 3] += velocities[i * 3] * 0.016;
                       positions[i * 3 + 1] += velocities[i * 3 + 1] * 0.016 - 0.016 * 9.82 * 0.5; // gravity
                       positions[i * 3 + 2] += velocities[i * 3 + 2] * 0.016;

                       // Damping
                       velocities[i * 3] *= 0.98;
                       velocities[i * 3 + 1] *= 0.98;
                       velocities[i * 3 + 2] *= 0.98;
                   }
               }

               particles.geometry.attributes.position.needsUpdate = true;
               particles.material.opacity = 1 - (elapsed / 1.0);

               if (!allDead) {
                   requestAnimationFrame(update);
               } else {
                   this.scene.remove(particles);
                   particles.geometry.dispose();
                   particles.material.dispose();
               }
           };

           update();
       }
   }
   ```

3. **Integrate into game**
   ```javascript
   // In constructor:
   this.particles = new ParticleSystem(this.scene);

   // In removeWall():
   this.particles.emitWallBreak(impactPosition, wall.mesh.material.color, 30);
   ```

**Testing Requirements:**
- Test performance with many particles
- Verify GPU particle count acceptable (mobile)

**Success Criteria:**
- ✅ Particles emit on wall break
- ✅ Smooth animation
- ✅ No performance impact on mobile

---

### Task 4.2: Ball Trail Effect

**Implementation Details:**

1. **Create trail renderer**
   ```javascript
   createBallTrail() {
       const trailLength = 20;
       const positions = new Float32Array(trailLength * 3);

       const geometry = new THREE.BufferGeometry();
       geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

       const material = new THREE.LineBasicMaterial({
           color: 0xFFD700,
           transparent: true,
           opacity: 0.6,
           linewidth: 2
       });

       this.ballTrail = new THREE.Line(geometry, material);
       this.scene.add(this.ballTrail);

       this.trailPositions = [];
   }

   updateBallTrail() {
       const speed = this.ballBody.velocity.length();

       // Only show trail when moving fast
       if (speed > 1) {
           this.ballTrail.visible = true;

           this.trailPositions.unshift(this.ballMesh.position.clone());
           if (this.trailPositions.length > 20) {
               this.trailPositions.pop();
           }

           const positions = this.ballTrail.geometry.attributes.position.array;
           for (let i = 0; i < this.trailPositions.length; i++) {
               positions[i * 3] = this.trailPositions[i].x;
               positions[i * 3 + 1] = this.trailPositions[i].y;
               positions[i * 3 + 2] = this.trailPositions[i].z;
           }

           this.ballTrail.geometry.attributes.position.needsUpdate = true;
           this.ballTrail.material.opacity = Math.min(speed / 10, 0.8);
       } else {
           this.ballTrail.visible = false;
       }
   }
   ```

**Success Criteria:**
- ✅ Trail visible when ball moving fast
- ✅ Smooth trail rendering
- ✅ Trail fades appropriately

---

### Task 4.3: Post-Processing Effects

**Implementation Details:**

1. **Add bloom effect**
   ```javascript
   import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
   import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
   import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

   setupPostProcessing() {
       this.composer = new EffectComposer(this.renderer);

       const renderPass = new RenderPass(this.scene, this.camera);
       this.composer.addPass(renderPass);

       const bloomPass = new UnrealBloomPass(
           new THREE.Vector2(window.innerWidth, window.innerHeight),
           0.5,  // strength
           0.4,  // radius
           0.85  // threshold
       );
       this.composer.addPass(bloomPass);
   }

   // In animate(), replace:
   // this.renderer.render(this.scene, this.camera);
   // with:
   this.composer.render();
   ```

**Note:** Post-processing can be expensive on mobile - make optional

**Success Criteria:**
- ✅ Bloom effect on emissive materials
- ✅ Can disable on low-end devices
- ✅ Maintains 60 FPS on desktop

---

### Task 4.4: Enhanced Impact Effects

**Implementation Details:**

1. **Screen shake**
   ```javascript
   screenShake(intensity = 0.1, duration = 100) {
       const originalPosition = this.camera.position.clone();
       const startTime = Date.now();

       const shake = () => {
           const elapsed = Date.now() - startTime;
           const progress = elapsed / duration;

           if (progress >= 1) {
               this.camera.position.copy(originalPosition);
               return;
           }

           const currentIntensity = intensity * (1 - progress);
           this.camera.position.x = originalPosition.x + (Math.random() - 0.5) * currentIntensity;
           this.camera.position.z = originalPosition.z + (Math.random() - 0.5) * currentIntensity;

           requestAnimationFrame(shake);
       };

       shake();
   }

   // In removeWall():
   this.screenShake(0.05, 80);
   ```

2. **Impact flash**
   - Brief light flash at impact point
   - Color based on wall type

**Success Criteria:**
- ✅ Satisfying impact feedback
- ✅ Not disorienting
- ✅ Can be disabled in settings

---

## Phase 5: PWA & Distribution 📱

**Priority:** MEDIUM - Enables installation and offline play
**Estimated Effort:** 6-8 hours
**Status:** NOT STARTED

### Task 5.1: Progressive Web App Setup

**Files:** New `manifest.json`, `service-worker.js`, modify `index.html`

**Implementation Details:**

1. **Create Web App Manifest**

   **New File:** `manifest.json`
   ```json
   {
     "name": "Poolanoid - 3D Pool Breakout",
     "short_name": "Poolanoid",
     "description": "A 3D pool-breakout hybrid game with physics",
     "start_url": ".",
     "display": "standalone",
     "background_color": "#362F4F",
     "theme_color": "#008BFF",
     "orientation": "landscape",
     "icons": [
       {
         "src": "assets/icons/icon-72x72.png",
         "sizes": "72x72",
         "type": "image/png"
       },
       {
         "src": "assets/icons/icon-96x96.png",
         "sizes": "96x96",
         "type": "image/png"
       },
       {
         "src": "assets/icons/icon-128x128.png",
         "sizes": "128x128",
         "type": "image/png"
       },
       {
         "src": "assets/icons/icon-144x144.png",
         "sizes": "144x144",
         "type": "image/png"
       },
       {
         "src": "assets/icons/icon-152x152.png",
         "sizes": "152x152",
         "type": "image/png"
       },
       {
         "src": "assets/icons/icon-192x192.png",
         "sizes": "192x192",
         "type": "image/png",
         "purpose": "any maskable"
       },
       {
         "src": "assets/icons/icon-384x384.png",
         "sizes": "384x384",
         "type": "image/png"
       },
       {
         "src": "assets/icons/icon-512x512.png",
         "sizes": "512x512",
         "type": "image/png"
       }
     ],
     "screenshots": [
       {
         "src": "assets/screenshots/screenshot-wide.png",
         "sizes": "1280x720",
         "type": "image/png",
         "form_factor": "wide"
       },
       {
         "src": "assets/screenshots/screenshot-narrow.png",
         "sizes": "720x1280",
         "type": "image/png",
         "form_factor": "narrow"
       }
     ],
     "categories": ["games", "entertainment"],
     "shortcuts": [
       {
         "name": "New Game",
         "url": "/?action=new",
         "description": "Start a new game"
       }
     ]
   }
   ```

2. **Link manifest in HTML**

   **File:** `index.html` (in `<head>`)
   ```html
   <link rel="manifest" href="manifest.json">
   <link rel="icon" type="image/png" href="assets/icons/icon-192x192.png">
   <link rel="apple-touch-icon" href="assets/icons/icon-192x192.png">
   ```

3. **Create Service Worker**

   **New File:** `service-worker.js`
   ```javascript
   const CACHE_NAME = 'poolanoid-v1.0.0';
   const ASSETS_TO_CACHE = [
       './',
       './index.html',
       './game.js',
       './config.js',
       './styles.css',
       './assets/icons/icon-192x192.png',
       './assets/icons/icon-512x512.png',
       // Note: Don't cache CDN resources, they're already cached by CDN
   ];

   // Install event - cache assets
   self.addEventListener('install', (event) => {
       event.waitUntil(
           caches.open(CACHE_NAME)
               .then((cache) => cache.addAll(ASSETS_TO_CACHE))
               .then(() => self.skipWaiting())
       );
   });

   // Activate event - clean old caches
   self.addEventListener('activate', (event) => {
       event.waitUntil(
           caches.keys().then((cacheNames) => {
               return Promise.all(
                   cacheNames.map((cacheName) => {
                       if (cacheName !== CACHE_NAME) {
                           return caches.delete(cacheName);
                       }
                   })
               );
           }).then(() => self.clients.claim())
       );
   });

   // Fetch event - serve from cache, fallback to network
   self.addEventListener('fetch', (event) => {
       event.respondWith(
           caches.match(event.request)
               .then((response) => {
                   // Cache hit - return cached version
                   if (response) {
                       return response;
                   }

                   // Cache miss - fetch from network
                   return fetch(event.request).then((response) => {
                       // Don't cache non-successful responses
                       if (!response || response.status !== 200 || response.type === 'error') {
                           return response;
                       }

                       // Clone response (can only be consumed once)
                       const responseToCache = response.clone();

                       // Cache the fetched resource
                       caches.open(CACHE_NAME).then((cache) => {
                           cache.put(event.request, responseToCache);
                       });

                       return response;
                   });
               })
               .catch(() => {
                   // Network failed, return offline page if available
                   return caches.match('./offline.html');
               })
       );
   });
   ```

4. **Register Service Worker**

   **File:** `game.js` (at end of file)
   ```javascript
   // Register service worker
   if ('serviceWorker' in navigator) {
       window.addEventListener('load', () => {
           navigator.serviceWorker.register('./service-worker.js')
               .then((registration) => {
                   console.log('ServiceWorker registered:', registration.scope);
               })
               .catch((error) => {
                   console.log('ServiceWorker registration failed:', error);
               });
       });
   }
   ```

**Testing Requirements:**
- Test offline functionality (disconnect network)
- Test install prompt on mobile
- Verify caching works correctly
- Test update mechanism

**Success Criteria:**
- ✅ Game works offline after first load
- ✅ Install prompt appears on mobile
- ✅ Game appears in app drawer when installed
- ✅ Updates propagate correctly

---

### Task 5.2: Install Prompt

**Implementation Details:**

1. **Add install button**
   ```javascript
   setupInstallPrompt() {
       let deferredPrompt;

       window.addEventListener('beforeinstallprompt', (e) => {
           // Prevent default mini-infobar
           e.preventDefault();
           deferredPrompt = e;

           // Show custom install button
           const installButton = document.getElementById('install-button');
           if (installButton) {
               installButton.style.display = 'block';

               installButton.addEventListener('click', async () => {
                   deferredPrompt.prompt();
                   const { outcome } = await deferredPrompt.userChoice;

                   if (outcome === 'accepted') {
                       console.log('User accepted install');
                   }

                   deferredPrompt = null;
                   installButton.style.display = 'none';
               });
           }
       });

       // Detect if already installed
       window.addEventListener('appinstalled', () => {
           console.log('PWA installed');
           deferredPrompt = null;
       });
   }
   ```

**Success Criteria:**
- ✅ Install prompt shows on compatible browsers
- ✅ Prompt doesn't show if already installed
- ✅ Works on Chrome, Edge, Safari

---

### Task 5.3: Share Score Functionality

**Implementation Details:**

1. **Add share button to game over screen**
   ```javascript
   createShareButton(level) {
       if (!navigator.share) {
           return null; // Share API not supported
       }

       const shareButton = document.createElement('button');
       shareButton.textContent = 'Share Score 📤';
       shareButton.style.cssText = `/* ... button styles ... */`;

       shareButton.onclick = async () => {
           try {
               await navigator.share({
                   title: 'Poolanoid',
                   text: `I reached level ${level} in Poolanoid! Can you beat my score?`,
                   url: window.location.href
               });
           } catch (error) {
               console.log('Share failed:', error);
           }
       };

       return shareButton;
   }
   ```

**Success Criteria:**
- ✅ Share works on mobile browsers
- ✅ Graceful degradation on desktop
- ✅ Share text appealing

---

### Task 5.4: Analytics & Telemetry (Optional)

**Implementation Details:**

1. **Add privacy-friendly analytics**

   Options:
   - **Plausible Analytics** (privacy-friendly, GDPR compliant)
   - **Simple Analytics** (minimalist, privacy-focused)
   - **Self-hosted Matomo** (full control)

   **Recommendation:** Plausible (easiest, respects privacy)

2. **Track key events**
   ```javascript
   // Track game started
   plausible('Game Started');

   // Track level reached
   plausible('Level Reached', { props: { level: this.level } });

   // Track game over
   plausible('Game Over', { props: {
       level: this.level,
       shots_used: 6 - this.shotsRemaining
   }});
   ```

**Note:** Only add if you plan to iterate based on player data

---

## Testing & Quality Assurance 🧪

### Cross-Browser Testing Matrix

| Browser | Desktop | Mobile | Priority |
|---------|---------|--------|----------|
| Chrome | ✅ Test | ✅ Test | HIGH |
| Safari | ✅ Test | ✅ Test | HIGH |
| Firefox | ✅ Test | ⚠️ Test | MEDIUM |
| Edge | ✅ Test | ⚠️ Test | LOW |

### Device Testing Targets

**Mobile:**
- iPhone SE (small screen, older hardware)
- iPhone 12/13 (modern iOS)
- Samsung Galaxy S21 (modern Android)
- Older Android (4GB RAM, 3-year-old device)

**Desktop:**
- 1920x1080 (standard)
- 1366x768 (common laptop)
- 2560x1440 (high-res)
- Ultrawide (3440x1440)

### Performance Benchmarks

| Metric | Target (Desktop) | Target (Mobile) |
|--------|------------------|-----------------|
| Initial Load | < 2s | < 4s |
| FPS (Level 1) | 60 FPS | 60 FPS |
| FPS (Level 20) | 60 FPS | 30 FPS |
| Memory Usage | < 200MB | < 150MB |
| Bundle Size | < 500KB | < 500KB |

---

## Deployment Strategy 🚀

### Hosting Options

1. **GitHub Pages** (Recommended for free hosting)
   - Free
   - Auto-deploy from git push
   - Custom domain support
   - HTTPS by default

2. **Netlify** (Best DX)
   - Free tier generous
   - Auto-deploy from git
   - Branch previews
   - Forms & functions available

3. **Vercel** (Best for Next.js, but works for static)
   - Similar to Netlify
   - Great analytics

4. **Cloudflare Pages** (Best performance)
   - Free unlimited bandwidth
   - Global CDN
   - Fast builds

**Recommendation:** Start with GitHub Pages, migrate to Netlify if you need advanced features

### Deployment Checklist

- [ ] Minify JavaScript (if not using CDN)
- [ ] Optimize images (icons, screenshots)
- [ ] Test on production URL
- [ ] Set up custom domain (optional)
- [ ] Configure HTTPS (automatic on most platforms)
- [ ] Submit to PWA directories (optional)
- [ ] Create social media cards (Open Graph tags)

---

## Success Metrics 📊

### Phase 1 (Mobile Compatibility)
- [ ] Touch controls work on iOS Safari
- [ ] Touch controls work on Android Chrome
- [ ] UI readable on 320px width screens
- [ ] No layout issues with notches

### Phase 2 (Performance)
- [ ] 60 FPS on desktop at level 20
- [ ] 30+ FPS on mobile at level 20
- [ ] No memory leaks after 30 minutes play
- [ ] WebGL context loss handled gracefully

### Phase 3 (Features)
- [ ] Sounds enhance gameplay (player feedback)
- [ ] High scores persist across sessions
- [ ] Power-ups balanced and fun

### Phase 4 (Visual)
- [ ] Particle effects don't impact performance
- [ ] Visual feedback satisfying
- [ ] Post-processing optional for low-end

### Phase 5 (PWA)
- [ ] Game works offline
- [ ] Installs on home screen
- [ ] Share functionality works

---

## Risk Assessment ⚠️

### High Risk
- **Mobile touch events compatibility** - iOS Safari quirks
  - Mitigation: Test early and often on real devices

- **Performance on low-end Android** - Fragmentation
  - Mitigation: Adaptive quality settings, extensive testing

### Medium Risk
- **Sound auto-play policies** - Mobile browsers block auto-play
  - Mitigation: Require user interaction before playing sounds

- **Service worker caching bugs** - Hard to debug
  - Mitigation: Version cache names, thorough testing

### Low Risk
- **CDN availability** - Unpkg downtime
  - Mitigation: Provide self-hosted fallback option in production

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Set up development environment** (git branches for each phase)
3. **Start with Phase 1, Task 1.1** (Touch controls - highest priority)
4. **Iterate and test** after each task
5. **Deploy beta** after Phase 1 complete
6. **Gather feedback** before proceeding to Phase 2

---

## Appendix: Optional Enhancements

### Future Considerations (Post-Launch)

- **Multiplayer mode** (using WebRTC or WebSockets)
- **Level editor** (user-generated content)
- **Daily challenges** (fixed level seeds)
- **Leaderboards** (requires backend)
- **More ball types** (different physics properties)
- **Table customization** (skins, themes)
- **Achievements system** (gamification)
- **Tutorial mode** (first-time user experience)
- **Accessibility** (colorblind modes, reduced motion)

---

**Document Version:** 1.0
**Last Updated:** 2026-02-14
**Author:** AI Assistant (Claude)
**Status:** Ready for Review ✅
