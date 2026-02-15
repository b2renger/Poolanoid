# Poolanoid - Detailed Improvement Plan

## Executive Summary

This document outlines a comprehensive improvement roadmap for Poolanoid, transforming it from a desktop-only prototype into a production-ready mobile-first 3D web game. The plan is divided into 5 phases, prioritizing mobile compatibility and performance before adding new features.

**Estimated Total Effort:** 40-60 hours
**Timeline:** 4-6 weeks (iterative development)

---

## Phase 1: Mobile Compatibility (CRITICAL) 🔴

**Priority:** HIGHEST - Blocking mobile deployment
**Estimated Effort:** 8-12 hours
**Status:** COMPLETED ✅

### Objectives
- Make the game fully playable on mobile devices (iOS Safari, Android Chrome)
- Implement touch controls for aiming and shooting
- Ensure responsive UI and proper viewport configuration
- Test on real mobile devices

### Task 1.1: Add Touch Event Support ✅ COMPLETED

**File:** `game.js`
**Location:** `setupMouseEvents()` method

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

### Task 1.2: Responsive UI Adjustments ✅ COMPLETED

**Files:** `game.js`, `styles.css`, `index.html`

**What was implemented:**

1. **Viewport meta tag** — `index.html` has `maximum-scale=1.0, user-scalable=no, viewport-fit=cover`
2. **PWA meta tags** — `apple-mobile-web-app-capable`, `theme-color`, etc. in `index.html`
3. **Responsive font sizing** — HUD uses `Math.min(28, Math.max(18, window.innerWidth / 30))` in `game.js`
4. **Responsive Game Over UI** — Uses `clamp()` for fonts, `max()` for padding, 44px min touch targets
5. **Safe area handling** — HUD positioned with `calc(20px + env(safe-area-inset-*))` inline; body has NO padding (canvas fills full viewport, only UI overlays respect safe areas)
6. **`touch-action: none`** on canvas in `styles.css` — prevents browser touch gesture interference
7. **`position: fixed` + `100dvh`** on game container — fixes mobile Safari address bar viewport issue (with `100vh` fallback)

**Success Criteria:**
- ✅ UI scales properly on all screen sizes
- ✅ No overlap with notches/safe areas
- ✅ All buttons easily tappable (≥44px)
- ✅ Text readable on small screens

---

### Task 1.3: Orientation Handling ✅ COMPLETED (REVISED)

**Files:** `game.js`

**Decision:** Orientation lock and portrait warning overlay were initially implemented but then removed. The game should be playable in both portrait and landscape — no forced orientation.

**Success Criteria:**
- ✅ Game playable in both portrait and landscape
- ✅ No broken layout on orientation change

---

### Task 1.4: Performance Testing & Optimization ✅ COMPLETED

**Files:** `game.js`

**What was implemented:**

1. **Device capability detection** — `detectDeviceCapabilities()` checks UA for mobile + `hardwareConcurrency`/`deviceMemory` for low-end classification
2. **Adaptive quality** — `applyQualitySettings()` disables shadows on low-end devices, caps pixel ratio at 1.5 on mobile (full `devicePixelRatio` on desktop)
3. **Debug FPS counter** — Add `?debug` to URL to show a live FPS counter (green monospace, top-left). Updates every second in the animate loop.

**Note:** WebGL detection was skipped — if the browser doesn't support WebGL, the Three.js renderer constructor already throws, and virtually all target browsers support it.

**Success Criteria:**
- ✅ Game runs at 30+ FPS on low-end devices (shadows off, capped pixel ratio)
- ✅ Adaptive quality maintains playability
- ✅ FPS monitoring available via `?debug`

---

## Phase 2: Performance & Code Quality ⚡

**Priority:** HIGH - Improves UX and maintainability
**Estimated Effort:** 6-8 hours
**Status:** COMPLETED

### Task 2.1: Physics Optimization ✅ COMPLETED

**File:** `game.js`

**What was implemented (ghost collision fix + performance):**

1. **SAPBroadphase** — Replaced `NaiveBroadphase` (O(n²)) with `SAPBroadphase` (O(n log n)). At level 10 with 55 walls, this cuts broadphase checks from ~1,500 to ~300.

2. **Event-based collision detection with removal queue** — Root cause of ghost collisions: the old approach polled `world.contacts` AFTER `world.step()`, meaning the physics solver had already applied bounce impulses before we could remove the wall body. Now:
   - `ballBody.addEventListener('collide', ...)` fires DURING `world.step()` and immediately marks `wall.removing = true` + queues the wall
   - `processWallRemovals()` runs BETWEEN substeps, removing bodies from the world before the next `world.step()` can generate another contact
   - A `removedBodies` Set (tracking body IDs) prevents any ghost processing from stale cannon-es internal caches

3. **Contact material cleanup** — `createRandomWalls()` now removes previous level's 3 `ContactMaterial` objects before adding new ones. Previously these accumulated indefinitely (3 per level, never removed).

4. **Ball sleep parameters** — `sleepSpeedLimit: 0.1`, `sleepTimeLimit: 0.5` — ball auto-sleeps after 0.5s below 0.1 units/s, reducing physics work when idle.

**Success Criteria:**
- ✅ No ghost wall collisions (event-based detection + removal queue + removedBodies Set)
- ✅ Better broadphase performance at high levels (SAPBroadphase)
- ✅ No contact material memory leak across levels
- ✅ Physics sleep working correctly

---

### Task 2.2: Configuration Extraction ✅ COMPLETED

**Files:** New `config.js`, modify `game.js`

**What was implemented:**

1. **Created `config.js`** — Single source of truth for all game constants, organized into categories:
   - `GAME` — Wall counts, shots, level progression
   - `COLORS` — All hex colors (Three.js) and CSS color strings
   - `PHYSICS` — Gravity, timesteps, damping, friction, restitution, ball/cushion/wall contact materials
   - `DIMENSIONS` — Table, wall, ball sizes, spawn area bounds
   - `CAMERA` — FOV, clipping planes, position, fog, orbit damping
   - `AIMING` — Impulse limits, touch/mouse hit radii
   - `EFFECTS` — Fade durations, impact ring geometry, animation scales, level delay
   - `WALL_TYPES` — Array with cumulative probability thresholds, colors, and type labels
   - `LIGHTING` — All light colors, intensities, positions, shadow config
   - `MATERIALS` — Ball/wall shininess, emissive intensity
   - `QUALITY` — Device detection thresholds, mobile pixel ratio cap

2. **Refactored `game.js`** — All magic numbers replaced with `CONFIG.*` references:
   - Removed `lil-gui` import (unused), added `import { CONFIG } from './config.js'`
   - Removed instance properties that just stored constants (`this.baseWallCount`, `this.PHYSICS_DT`, `this.BULLET_SAFE_DISTANCE`, `this.MIN_STEP_DT`, `this.MAX_SUBSTEPS`, `this.maxImpulse`, `this.impulseMultiplier`)
   - `animate()` destructures physics constants at the top for clean hot-loop usage
   - `setupLighting()` uses `const L = CONFIG.LIGHTING` alias for readability
   - `spawnImpactEffect()` / `updateImpactEffects()` use `const E = CONFIG.EFFECTS` alias
   - Wall type selection now uses `CONFIG.WALL_TYPES.find(wt => roll < wt.threshold)` with a `materialMap` lookup instead of chained if/else
   - Boundary wall positions derived from `TABLE_WIDTH / 2` and `TABLE_DEPTH / 2` instead of hardcoded 5 / 2.5

**Success Criteria:**
- ✅ All magic numbers extracted to config
- ✅ Game behavior unchanged
- ✅ Config file well-organized by category

---

**Previous plan details (for reference):**

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
           BACKGROUND: '#362F4F',
           TABLE: '#008BFF',
           BALL: '#E4FF30',
           AIM_LINE: '#E4FF30',
           UI_TEXT: '#E4FF30',

           WALL_MINT: '#00FF9C',
           WALL_LIME: 'rgb(255, 145, 48)',
           WALL_MAGENTA: '#FF5FCF',

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

### Task 2.3: Error Handling & Robustness ✅ COMPLETED

**Files:** `game.js`, `index.html`, `styles.css`

**What was implemented:**

1. **WebGL context loss handling** — `setupContextLossHandling()` listens for `webglcontextlost` / `webglcontextrestored` events. On loss: sets `isContextLost = true` (stops animation loop), shows error overlay. On restore: clears flag, hides overlay, restarts animation loop.

2. **Try-catch in animation loop** — `animate()` now has an early return if `isContextLost`, and wraps the entire frame body in a try-catch. On error: calls `handleCriticalError()` which stops the loop and shows a "Reload" button overlay.

3. **Resource cleanup on page unload** — `dispose()` method traverses the scene graph to dispose all geometries and materials, removes all event listeners (resize, mouse, touch — stored as `_onResize`, `_onInputStart/Move/End` references), and disposes the WebGL renderer. Triggered via `beforeunload`.

4. **Loading screen** — Static `<div id="loading-screen">` in `index.html` (visible immediately while ES modules load). CSS handles styling with centered text and smooth fade-out transition. `hideLoadingScreen()` fades it out with opacity transition and removes it after 300ms. Called at end of constructor.

5. **Error overlay CSS** — `.error-overlay` class in `styles.css` for context-lost and critical error overlays with consistent styling.

**Success Criteria:**
- ✅ Graceful handling of WebGL context loss
- ✅ No memory leaks on page unload (dispose cleans up all resources)
- ✅ User-friendly error messages with reload option
- ✅ Loading screen visible during module fetch

---

**Previous plan details (for reference):**

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

### Task 2.4: Code Structure Improvements ✅ COMPLETED

**Files:** `game.js` → Split into modular `src/` directory

**What was implemented:**

1. **Modular file structure** — Split monolithic ~1000-line `game.js` into 9 focused modules:
   ```
   game.js                         (5-line entry point)
   src/
   ├── config.js                   (moved from root)
   ├── core/
   │   └── PoolGame.js             (main orchestrator — game state, loop, lighting)
   ├── physics/
   │   └── PhysicsWorld.js         (Cannon world, adaptive substep simulation)
   ├── entities/
   │   ├── Ball.js                 (ball mesh + body, impulse, clamp, reset)
   │   ├── Table.js                (table mesh + body + boundary cushion walls)
   │   └── WallManager.js          (breakable wall lifecycle, fade-out, contact materials)
   ├── input/
   │   └── InputManager.js         (mouse/touch aiming with callback-based shooting)
   ├── effects/
   │   └── ImpactEffects.js        (impact ring spawn + animation + cleanup)
   └── ui/
       ├── HUD.js                  (level/shots/walls display + FPS counter)
       └── GameOverScreen.js       (game over overlay + restart button)
   ```

2. **Callback-based communication** — Subsystems are decoupled via dependency injection:
   - `WallManager.onWallRemoved` → triggers `ImpactEffects.spawn()`
   - `WallManager.onAllCleared` → triggers `PoolGame.nextLevel()`
   - `WallManager.onCountChanged` → triggers `PoolGame.updateHUD()`
   - `InputManager.onShoot` → triggers `PoolGame.onShoot(direction, magnitude)`
   - `InputManager.canShoot` → queries game state (not game over, shots > 0)
   - `InputManager.getBallPosition` → queries ball mesh position

3. **JSDoc comments** — Added to all exported classes and key methods.

4. **Clean orchestrator** — `PoolGame.animate()` is now 10 lines: physics update, ball clamp/sync, effects update, render. All complexity lives in the subsystems.

**Success Criteria:**
- ✅ Clear separation of concerns (physics, input, entities, effects, UI)
- ✅ Each module has a single responsibility
- ✅ PoolGame is a thin orchestrator
- ✅ No circular dependencies

---

**Previous plan details (for reference):**

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
**Estimated Effort:** 12-16 hours
**Status:** IN PROGRESS (3.1 & 3.2 complete)

### Task 3.1: Local Storage & High Scores ✅ COMPLETED

**Files:** New `src/storage/StorageManager.js`, modify `src/core/PoolGame.js`, modify `src/ui/GameOverScreen.js`

**What was implemented:**

1. **StorageManager** (`src/storage/StorageManager.js`) — Lightweight localStorage wrapper:
   - `saveHighScore(level, initials)` — Saves 3-letter initials + level + ISO date, keeps **top 3** sorted by level descending
   - `getHighScore()` / `getAllHighScores()` — Query best or full list
   - `saveSettings(settings)` / `getSettings()` — For orientation, sound prefs
   - All localStorage calls wrapped in try-catch (handles private browsing, quota errors)

2. **GameOverScreen** — Arcade-style 3-initial entry: three single-character `<input>` boxes with auto-advance, backspace navigation, letters only. `show(level, isNewBest, onDone)` calls `onDone(initials)` on OK.

3. **PoolGame integration** — `gameOver()` checks previous best for `isNewBest` flag, then defers save until initials are entered: `onDone(initials) → storage.saveHighScore(level, initials) → returnToHome()`.

---

### Task 3.2: Home Screen ✅ COMPLETED

**Files:** New `src/ui/HomeScreen.js`, modify `src/core/PoolGame.js`, `src/ui/HUD.js`, `src/entities/WallManager.js`, `styles.css`

**What was implemented:**

1. **HomeScreen component** (`src/ui/HomeScreen.js`) — Full-screen DOM overlay with:
   - **Neon title** — "POOLANOID" with layered `text-shadow` bloom glow (`#E4FF30` inner, `#008BFF` outer), subtle `neon-pulse` CSS animation
   - **Top 3 high scores** — Displays initials + level + date, "No scores yet" placeholder
   - **Orientation selector** — Portrait/Landscape toggle buttons with `▯`/`▭` icons; selection saved to localStorage; on play, attempts `screen.orientation.lock()` (fails silently on unsupported browsers/desktop)
   - **Play button** — Neon-bordered with glow, 44px min touch target

2. **Game flow refactored** in `PoolGame`:
   - Constructor sets up renderer, scene, camera, lighting, physics, table, ball — but does NOT create walls or start gameplay
   - `this.isPlaying` flag gates physics updates in `animate()` — render loop always runs (3D scene visible behind home screen)
   - `startGame()` — hides home screen, creates walls, shows HUD, enables shooting
   - `gameOver()` → initials entry → save → `returnToHome()`
   - `returnToHome()` — clears walls + contact materials, hides HUD, refreshes scores, shows home screen

3. **HUD** — Added `show()`/`hide()` methods; container starts hidden (`display: none`)

4. **WallManager** — Added `clearAll()` method (clears walls + removes contact materials)

5. **CSS** (`styles.css`) — Neon styles: `.home-screen`, `.neon-title`, `@keyframes neon-pulse`, `.home-scores-*`, `.score-initials`, `.home-orient-*`, `.neon-play-btn`

6. **Tutorial animation** — Pure CSS keyframe animation on the home screen showing drag-to-aim mechanic:
   - 4 animated elements: ball, aim line, finger indicator, ghost ball (3.5s loop)
   - Label: "DRAG TO AIM, RELEASE TO SHOOT — DESTROY ALL WALLS"
   - `@keyframes tut-finger`, `tut-aim`, `tut-ball`, `tut-ghost`

7. **Landscape-responsive layout** — `@media (orientation: landscape) and (max-height: 600px)` switches from flex column to 2-column CSS grid: title and play button span full width, scores and orientation selector sit side by side in the middle row, tutorial spans both columns with reduced height

8. **Aim line tracks moving ball** (`src/input/InputManager.js`) — `aimStart` is now updated to the ball's current position on every `onInputMove` and `onInputEnd`, so the aim line origin follows the ball even while it's still rolling

---

### Task 3.3: Special Walls & Power-ups ✅

**Files:** `src/entities/WallManager.js`, `src/config.js`, `src/core/PoolGame.js`, `src/entities/Ball.js`

#### Wall Behavior Types (affect ball physics)

These exist alongside the current `normal` wall. They are visually distinct (color) and change how the ball reacts on impact.

| Type | Color | Restitution | Friction | Behavior |
|------|-------|-------------|----------|----------|
| **Normal** | `0x00FF9C` mint | 0.82 | 0.02 | Standard bounce (current) |
| **Extra-bounce** | `0xFF5FCF` magenta | 0.98 | 0.01 | Ball ricochets aggressively, barely loses energy. Dangerous in tight spaces, useful for chain reactions. (replaces current `red` type) |
| **Sticky** | `0xFFAA00` amber | 0.10 | 0.80 | Ball nearly stops on contact — absorbs almost all kinetic energy. Forces careful aim. |
| **Low-bounce** | `0xE4FF30` lime | 0.42 | 0.02 | Ball loses significant energy. (current `blue` type, renamed for clarity) |

#### Power-up Walls (special effect on break)

These are rarer walls that trigger a one-time effect when destroyed. They get a subtle **pulsating emissive glow** (animate `emissiveIntensity` between 0.1 and 0.5 in the game loop) to distinguish them from behavior walls.

| Type | Color | Effect | Points |
|------|-------|--------|--------|
| **Extra Shot** | `0x00FFFF` cyan | Awards **+1 shot** immediately. | 0 |
| **Bomb** | `0xFF0000` red | Destroys all walls within **1.5 world-unit radius** of impact. Chain-reacts with other bomb walls. | 0 (but destroyed walls still award their points) |
| **Multi-Ball** | `0x00BFFF` sky blue | Spawns **2 temporary extra balls** at impact position. | 0 |

Power-up walls give **no score points** — their triggered effect IS the reward.

#### Level-scaled spawn rates

Special wall probability increases with level. `CONFIG.WALL_TYPES` becomes a function or is computed per level:

```
Level 1–2:   Normal 80%, Extra-bounce 10%, Low-bounce 10%
             (no power-ups yet — learn the basics)

Level 3–5:   Normal 70%, Extra-bounce 10%, Low-bounce 10%, Sticky 5%,
             Extra Shot 4%, Bomb 4%, Multi-Ball 1%

Level 6+:    Normal 55%, Extra-bounce 12%, Low-bounce 12%, Sticky 8%,
             Extra Shot 6%, Bomb 6%, Multi-Ball 4%
```

Implementation: `WallManager.createWalls(level, ballMaterial)` computes `CONFIG.getWallTypes(level)` which returns the cumulative-threshold array for that level. The existing `roll < threshold` logic works unchanged.

#### Multi-Ball detailed design

This is the most complex power-up. Key decisions:

1. **Spawning** — 2 extra balls appear at the impact position with random outward impulses (spread ~120° apart, magnitude ~60% of the main ball's current velocity). Slight Y offset to avoid clipping into the table.

2. **Shared physics material** — Extra balls must reuse the main ball's `CANNON.Material` instance so all existing contact materials (ball-table, ball-cushion, ball-wall) apply automatically. `Ball` class constructor should accept an optional material parameter: `new Ball(scene, physics, existingMaterial)`.

3. **Collision handling** — Each extra ball gets the same `collide` listener as the main ball → `wallManager.queueRemoval(event.body, ...)`. Walls don't care which ball hit them.

4. **Lifecycle** — Extra balls are temporary. They are removed when:
   - They come to rest (velocity < `BALL_SLEEP_SPEED_LIMIT` for `BALL_SLEEP_TIME_LIMIT` seconds — same thresholds as the main ball), OR
   - A hard timeout of 8 seconds elapses (safety net)

5. **Cleanup** — `PoolGame` tracks `this.extraBalls = []`. On each `animate()` frame, check each extra ball: if sleeping or expired, remove its body from physics, remove its mesh from scene, splice from array. On `returnToHome()` / `startGame()`, clear all extra balls.

6. **No extra shots consumed** — Extra balls are free bonus destruction. The player's shot count is unaffected.

#### Visual indicators

- **Behavior walls**: distinguished by color only (no glow). Colors are distinct enough to learn quickly.
- **Power-up walls**: subtle animated emissive glow. `WallManager` stores a `powerupWalls` sub-array; `PoolGame.animate()` calls `wallManager.updatePowerupGlow(time)` to pulse `emissiveIntensity`.

#### Scoring System

Every wall destruction awards points. Score is the primary progression metric (replaces level as the high-score value in localStorage).

| Wall type | Points | Floating text |
|-----------|--------|---------------|
| **Normal** | +1 | `+1` (mint) |
| **Extra-bounce** | +1 | `+1` (magenta) |
| **Low-bounce** | +1 | `+1` (lime) |
| **Sticky** | +2 | `+2` (amber) — reward for the difficulty |
| **Extra Shot** | 0 | `+1 Shot!` (cyan) |
| **Bomb** | 0 | `BOOM!` (red) |
| **Multi-Ball** | 0 | `Multi-Ball!` (sky blue) |

- **HUD** — Score displayed alongside level/shots/walls.
- **StorageManager** — `saveHighScore(score, level, initials)`. Top 3 sorted by **score** descending.
- **GameOverScreen** — Shows final score (and level reached).
- **Bomb blasts** — Each wall destroyed in the blast awards its own points normally.
- **Combo bonus** — See Task 3.4 for bonus points on multi-hit combos.

#### Floating text (color-coded)

Every wall break shows a floating `TextSprite` above the impact point (canvas-based `CanvasTexture` → `SpriteMaterial`). Text and color match the wall type from the table above. Rises ~1.2 units and fades over 1.5s.

---

### Task 3.3b: Predictive Aim Line with Level Scaling ✅

**Files:** `src/input/InputManager.js`, `src/config.js`

The aim line currently extends from the ball toward the drag point. It should be **reversed** to point in the actual shooting direction — showing the player where the ball will go, not where they're dragging. Its length should **decrease with level** as a difficulty curve, eventually disappearing entirely.

#### Behavior

- **Direction**: Line extends from ball center in the shot direction (opposite of drag). The drag end stays invisible; the player sees only the predicted trajectory.
- **Length scaling**: A max-length multiplier shrinks each level:

| Level | Aim line length | Purpose |
|-------|----------------|---------|
| 1–3 | Full (long guide) | Learning phase — generous aim assist |
| 4–6 | ~66% | Moderate challenge |
| 7–9 | ~33% | Short hint |
| 10+ | Hidden (0) | No aim assist — pure skill |

- **Config**: `CONFIG.AIMING.AIM_LINE_MAX_LENGTH`, `CONFIG.AIMING.AIM_LINE_FADE_LEVEL` (level at which line disappears). Length at level `L` = `maxLength * max(0, 1 - (L - 1) / (fadeLevel - 1))`.

#### Implementation

1. `InputManager` receives a `getLevel` callback (or a direct `aimLineScale` property set by `PoolGame` each level).
2. In `onInputMove`: compute `direction = aimStart - aimEnd` (shot direction), normalize, then draw a line from `aimStart` to `aimStart + direction * scaledLength`.
3. In `onInputEnd`: no visual change needed — the impulse calculation already uses the correct direction.
4. When scale is 0, skip showing the line entirely.

---

### Task 3.4: Combo System & Feedback

**Files:** `src/core/PoolGame.js`, `src/config.js`, `src/ui/HUD.js`

#### Combo tracking

Count walls broken within a rolling time window. A single shot that destroys multiple walls (via ricochet or bomb chain-reaction) builds a combo.

- `this.combo = 0` — reset at start of each shot (in `onShoot()`)
- Each `wallManager.onWallRemoved` increments `this.combo`
- Combo count is evaluated after a brief settle delay: `this.comboTimer` starts/restarts a 500ms timeout on each wall removal. When it fires (no more walls removed for 500ms), the combo is finalized and rewards are given.

#### Combo rewards

Combos award **bonus score points** on top of per-wall points. Higher combos also grant bonus shots.

| Combo | Bonus points | Bonus shots | Visual |
|-------|-------------|-------------|--------|
| 2x | +2 | — | Counter shown |
| 3x | +5 | — | Counter + HUD flash |
| 5x | +10 | +1 shot | Counter + screen shake |
| 8x+ | +20 | +2 shots | Counter + slow-mo |

Config values in `CONFIG.COMBO`:
```javascript
COMBO: {
    SETTLE_DELAY: 500,
    THRESHOLDS: [
        { min: 2, points: 2, shots: 0 },
        { min: 3, points: 5, shots: 1 },
        { min: 5, points: 10, shots: 1 },
        { min: 8, points: 20, shots: 2 }
    ]
}
```

#### Combo HUD element

- A centered DOM element (managed by HUD) that shows "2x COMBO!", "5x COMBO!" etc.
- Appears on combo ≥ 2, scales up with a CSS `transform: scale()` pop animation, fades out after the combo settles
- Color escalates: 2x = `#E4FF30`, 5x = `#008BFF`, 8x+ = `#FF5FCF`

#### Visual feedback

1. **Screen shake** — On every wall break, briefly offset `camera.position` by a small random XZ amount (±0.03 units), decaying exponentially over ~80ms. Intensity scales with combo count (1x = 0.02, 5x = 0.05, 8x+ = 0.08). Implemented as a shake accumulator in `animate()` — NOT in a separate `requestAnimationFrame` loop.

2. **Slow-mo on high combo** — When combo ≥ 5, temporarily scale `CONFIG.PHYSICS.DT` to 50% for ~0.5s, then ease back to normal. Makes multi-hit ricochets feel cinematic. Store `this.slowMoUntil = Date.now() + 500` and check in `animate()`.

3. **Level complete zoom** — On `nextLevel()`, briefly tween camera Y position down by 1 unit over ~0.3s (zoom in), hold for 0.2s, then ease back. Use the same accumulator pattern as screen shake.

---

### Task 3.5: Sound Effects (Web Audio Synthesis)

**Files:** New `src/audio/AudioManager.js`, modify `src/core/PoolGame.js`

**Approach:** Pure Web Audio API synthesis — no external libraries, no audio files. Subtle, musical sound design.

**Implementation Details:**

1. **AudioManager class** — Creates and reuses a single `AudioContext`
   - Initialized on first user interaction (tap/click) to comply with mobile autoplay policies
   - `enabled` toggle, volume control

2. **Sound design — Major scale notes E3 to E6**
   - Define E major scale frequencies: E, F#, G#, A, B, C#, D# across octaves 3–6
   - Each wall break plays a random note from the scale
   - Oscillator type: sine or triangle (soft, clean tone)
   - Short envelope: quick attack (~5ms), short sustain, exponential decay (~150ms)
   - Subtle volume (0.1–0.2 gain) — sounds should enhance, not dominate

3. **Sound events:**
   - **Wall break** — Random major scale note, sine oscillator, fast decay
   - **Shoot** — Low percussive thud (filtered noise burst, ~50ms)
   - **Cushion bounce** — Soft click (very short sine ping, muted)
   - **Level complete** — Quick ascending arpeggio (3-4 notes up the scale, staggered ~80ms apart)
   - **Game over** — Descending minor phrase (3 notes, slower decay)
   - **Combo hit** — Same as wall break but pitch rises with combo count

4. **Integration** — `PoolGame` calls `audio.play('wallBreak')`, `audio.play('shoot')`, etc. at appropriate moments. AudioManager handles all synthesis internally.

5. **No external dependencies** — Everything generated via `OscillatorNode`, `GainNode`, `BiquadFilterNode`

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
- [ ] Home screen with neon glow title, high scores, orientation choice, play button
- [ ] High scores persist across sessions (localStorage)
- [ ] Power-ups balanced and fun
- [ ] Combo system rewards skillful play
- [ ] Synthesized sounds subtle and musical (Web Audio, E major scale)

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
**Last Updated:** 2026-02-15
**Author:** AI Assistant (Claude)
**Status:** Ready for Review ✅
