# Poolanoid - Technical Research & Analysis

## Project Overview

**Poolanoid** is a 3D web-based breakout/pool hybrid game built with Three.js and Cannon.js physics. The game combines elements of pool (aiming and shooting a ball) with breakout mechanics (destroying walls to progress through levels).

### Game Concept
- Players control a single golden ball on a pool table
- Aim and shoot the ball to destroy randomly positioned colored walls
- Each level increases difficulty by adding more walls and granting additional shots
- Three wall types with different physics properties (bounce characteristics)
- Top-down camera view with orbital rotation controls
- Progressive difficulty system with unlimited levels

## Technology Stack Analysis

### 1. Three.js - 3D Rendering Engine

**Current Version:** `0.174.0` (November 2024)
- **Source:** Loaded via unpkg CDN
- **Status:** Recent stable release
- **Module System:** ES modules with importmap

**Components Used:**
- `THREE.Scene` - Main scene container
- `THREE.PerspectiveCamera` - 75° FOV camera
- `THREE.WebGLRenderer` - WebGL-based renderer with shadow mapping
- `OrbitControls` - Camera rotation controls (locked to top-down view)
- `THREE.Fog` - Distance-based atmospheric fog
- **Lighting:**
  - Ambient light for base illumination
  - Directional lights (main key, fill, rim) with shadow casting
  - PCFSoftShadowMap for smooth shadows
- **Geometry:**
  - BoxGeometry for table and walls
  - SphereGeometry for the ball
  - RingGeometry for impact effects
- **Materials:**
  - MeshPhongMaterial with emissive properties
  - Transparent materials for fade effects

**Rendering Features:**
- Shadow mapping (2048x2048 resolution)
- Anti-aliasing enabled
- Fog for depth perception
- Real-time lighting with multiple directional lights

### 2. Cannon.js (cannon-es) - Physics Engine

**Current Version:** `cannon-es@0.20.0`
- **Source:** Loaded via unpkg CDN
- **Library:** cannon-es is the actively maintained fork of cannon.js
- **Last Update:** Maintained and actively developed

**Physics Configuration:**
- **World:**
  - Gravity: -9.82 m/s² (realistic Earth gravity)
  - Sleep system: Enabled (performance optimization)
  - Broadphase: NaiveBroadphase (simple collision detection)
  - Solver iterations: 16 (collision resolution quality)

- **Adaptive Time Stepping:**
  - Base physics timestep: 1/60s (60 FPS)
  - Bullet-style adaptive substeps to prevent tunneling
  - Dynamic step size based on ball velocity
  - Min step: 1/240s, Max substeps: 30
  - Safe distance: 0.04 units per step at high speeds

- **Contact Materials:**
  - **Ball-Table:** friction 0.42, restitution 0.12 (felt-like behavior)
  - **Ball-Boundary:** friction 0.02, restitution 0.80 (cushion bounce)
  - **Ball-Wall (normal):** friction 0.02, restitution 0.82
  - **Ball-Wall (blue/lime):** friction 0.02, restitution 0.42 (low bounce)
  - **Ball-Wall (red/magenta):** friction 0.02, restitution 0.95 (super bounce)

- **Physical Bodies:**
  - Ball: Sphere (radius 0.15), mass 1, with linear/angular damping
  - Table: Static box
  - Walls: Static boxes with rotations
  - Boundary walls: Static boxes (invisible collision boundaries)

**Physics Quality:**
- Prevents tunneling through adaptive substeps
- Proper material-based friction/restitution
- Y-position clamping to prevent ball sinking
- Per-substep collision checking for accuracy

### 3. Additional Libraries

**lil-gui v0.19.1**
- Imported but currently **NOT USED** in the code
- Could be utilized for debug controls or settings panel
- Lightweight GUI library for parameter tweaking

**es-module-shims v1.8.0**
- Polyfill for import maps in older browsers
- Enables ES module imports from CDN

## Architecture Analysis

### Class Structure: `PoolGame`

**Core Systems:**

1. **Initialization System**
   - Scene, camera, renderer setup
   - Physics world configuration
   - Asset creation (table, ball, walls, lighting)
   - Event listener registration

2. **Game State Management**
   - Level progression (infinite levels)
   - Shot counter (6 base + level - 1)
   - Wall counter tracking
   - Game over detection

3. **Input System**
   - Mouse-based aiming (click-drag-release)
   - Raycasting for ball selection
   - Plane intersection for aim direction
   - OrbitControls integration (disabled while aiming)

4. **Physics Simulation**
   - Adaptive timestep physics loop
   - Velocity-based substep calculation
   - Collision detection per substep
   - Position clamping

5. **Rendering Pipeline**
   - requestAnimationFrame loop
   - Physics sync (copy Cannon positions to Three meshes)
   - Visual effects updates (impacts, fading)
   - Camera controls update

6. **Visual Effects System**
   - Wall fade-out on destruction (200ms with easing)
   - Ring impact effects (120ms expansion/fade)
   - Immediate physics removal, delayed visual cleanup

7. **Level System**
   - Dynamic wall count: 10 + (level - 1) × 5
   - Progressive difficulty
   - 1-second delay between levels
   - Ball reset and velocity zeroing

### Game Flow

```
Start (Level 1, 6 shots)
  ↓
Player aims and shoots
  ↓
Physics simulation → Ball hits walls
  ↓
Walls destroyed → Counter updated
  ↓
All walls destroyed? → Next Level
  ↓
No shots remaining? → Game Over
  ↓
Restart or Continue
```

### Wall Types & Behavior

| Type | Color | Probability | Restitution | Gameplay Effect |
|------|-------|-------------|-------------|-----------------|
| Mint | #00FF9C | 80% | 0.82 | Standard bounce |
| Lime | #E4FF30 | 10% | 0.42 | Low bounce (absorbs energy) |
| Magenta | #FF5FCF | 10% | 0.95 | Super bounce (preserves energy) |

### Color Palette

- **Background/Fog:** #362F4F (dark purple)
- **Table:** #008BFF (blue)
- **Ball:** #FFD700 (gold) with emissive glow
- **Aim Line/UI:** #FFD700 (lime yellow)
- **Walls:** Mint/Lime/Magenta
- **Impact Effect:** #008BFF (blue rings)

## Critical Analysis

### Current Strengths ✅

1. **Solid Physics Implementation**
   - Adaptive timesteps prevent tunneling
   - Proper material-based contact handling
   - Realistic ball behavior with damping

2. **Clean Code Architecture**
   - Well-organized class structure
   - Clear separation of concerns
   - Readable variable names and comments

3. **Visual Polish**
   - Multiple light sources with shadows
   - Fog for depth
   - Smooth fade/impact effects
   - Emissive materials for glow

4. **Game Design**
   - Simple, intuitive controls
   - Progressive difficulty
   - Clear visual feedback

### Current Limitations ⚠️

1. **Mobile Compatibility - CRITICAL ISSUE**
   - **No touch event handlers** - only mouse events
   - Touch aiming not implemented
   - Will not work properly on mobile devices
   - OrbitControls support touch, but custom aiming doesn't

2. **Performance Considerations**
   - NaiveBroadphase - O(n²) collision detection
   - Not optimized for many walls (level 20+ could slow down)
   - Shadow mapping every frame (expensive)

3. **CDN Dependencies**
   - Requires internet connection
   - No offline capability
   - Potential version/availability issues

4. **Missing Features**
   - No sound effects
   - No particle systems
   - No local storage for high scores
   - lil-gui imported but unused

## WebGPU Feasibility Analysis

### What is WebGPU?

WebGPU is the next-generation graphics API for the web, successor to WebGL. It provides:
- Lower-level GPU access
- Better performance through reduced CPU overhead
- Modern GPU features (compute shaders, better memory management)
- Based on Vulkan/Metal/DirectX 12 architecture

### Three.js WebGPU Support

**Status:** Available since r152 (May 2023)
- `WebGPURenderer` available as alternative to `WebGLRenderer`
- Requires Three.js r152+ (current version 0.174.0 ✅)
- Import path: `three/addons/renderers/webgpu/WebGPURenderer.js`

### Browser Support (February 2026)

| Browser | Desktop | Mobile | Status |
|---------|---------|--------|--------|
| Chrome/Edge | ✅ 113+ | ⚠️ Android only | Good |
| Firefox | ⚠️ Experimental | ❌ Not available | Behind flag |
| Safari | ⚠️ Technology Preview | ❌ iOS not ready | In development |

**Critical Mobile Issue:**
- **iOS Safari:** WebGPU NOT available yet (major issue for mobile game)
- **Android Chrome:** WebGPU available but newer devices only
- **Fallback required:** Would need WebGL fallback for iOS

### Should We Use WebGPU? 🤔

**Arguments FOR WebGPU:**
- ✅ Better performance potential
- ✅ Future-proof technology
- ✅ Compute shader capabilities (could enable GPU-based physics)
- ✅ Already supported in Three.js r174

**Arguments AGAINST WebGPU:**
- ❌ **iOS not supported** - dealbreaker for mobile game
- ❌ Requires fallback system (complexity)
- ❌ Smaller user base
- ❌ Current WebGL performance is adequate for this game
- ❌ Physics is CPU-bound anyway (Cannon.js)

**RECOMMENDATION:** **DO NOT migrate to WebGPU yet**

**Rationale:**
1. This is a **mobile-first game** - iOS support is critical
2. Current WebGL performance is sufficient (simple scene, few objects)
3. Physics bottleneck is CPU (Cannon.js), not GPU
4. Adding fallback system adds complexity without clear benefit
5. WebGL is universally supported

**Future Consideration:**
- Revisit in 2027+ when iOS Safari supports WebGPU
- Could implement progressive enhancement (WebGPU on desktop, WebGL on mobile)
- Would mainly benefit complex visual effects, not core gameplay

## Mobile Optimization Recommendations

### Priority 1: Touch Controls (MUST IMPLEMENT) 🔴

**Current Issue:**
```javascript
// Lines 389-391: Only mouse events
window.addEventListener('mousedown', onMouseDown);
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('mouseup', onMouseUp);
```

**Required Changes:**
1. Add touch event listeners:
   - `touchstart` → handle like mousedown
   - `touchmove` → handle like mousemove
   - `touchend` → handle like mouseup

2. Normalize event handling:
   - Extract touch coordinates from `event.touches[0]`
   - Unified position function for mouse/touch
   - Prevent default to avoid scrolling

3. Multi-touch consideration:
   - Primary touch for aiming (first finger)
   - Secondary touch for camera rotation?
   - Or disable controls entirely during aim

### Priority 2: Performance Optimization

1. **Broadphase Upgrade**
   - Change from `NaiveBroadphase` to `SAPBroadphase` (Sweep and Prune)
   - Better performance for many objects (O(n log n))

2. **Shadow Optimization**
   - Consider disabling shadows on mobile (performance)
   - Or reduce shadow map resolution (2048 → 1024)
   - Static shadow baking for table?

3. **Renderer Settings**
   - Reduce anti-aliasing on mobile
   - Lower pixel ratio on high-DPI devices
   - Adaptive quality based on frame rate

### Priority 3: Responsive Design

1. **UI Scaling**
   - Font sizes should scale with viewport
   - Touch targets should be 44x44px minimum
   - HUD positioning for safe areas (notches)

2. **Orientation**
   - Lock to landscape mode?
   - Or adapt layout for portrait?

3. **Aspect Ratio**
   - Table dimensions could adapt to screen ratio
   - Camera FOV adjustment for narrow screens

## Physics Library Alternatives

### Current: Cannon.js (cannon-es)

**Pros:**
- ✅ Pure JavaScript (no compilation needed)
- ✅ Good documentation
- ✅ Active maintenance
- ✅ Works well for this use case

**Cons:**
- ❌ Slower than compiled alternatives
- ❌ Limited advanced features
- ❌ CPU-bound (no GPU acceleration)

### Alternative 1: Rapier

**Website:** https://rapier.rs/
**Language:** Rust → WebAssembly
**Version:** 0.17+

**Pros:**
- ✅ 5-10x faster than Cannon.js
- ✅ WebAssembly performance
- ✅ Active development
- ✅ Modern API
- ✅ Better suited for complex physics

**Cons:**
- ❌ Larger bundle size (~500KB WASM)
- ❌ Requires WASM support (universal now)
- ❌ Learning curve
- ❌ Overkill for this simple game

**Recommendation:** Consider if physics becomes bottleneck

### Alternative 2: Ammo.js (Bullet Physics)

**What:** Bullet Physics (C++) compiled to JavaScript via Emscripten

**Pros:**
- ✅ Very powerful (used in AAA games)
- ✅ Comprehensive features
- ✅ Used in Three.js examples

**Cons:**
- ❌ Large bundle size
- ❌ Complex API
- ❌ Overkill for this project
- ❌ Harder to debug

**Recommendation:** Not recommended for this use case

### Alternative 3: PhysX (via PhysX.js)

**What:** NVIDIA PhysX compiled to WebAssembly

**Pros:**
- ✅ Industry standard
- ✅ High performance

**Cons:**
- ❌ Large bundle
- ❌ Complex setup
- ❌ Overkill for 2D-like gameplay

**Recommendation:** Not recommended

### Verdict: Stick with Cannon-ES

For this game's requirements:
- Physics is simple (spheres and boxes)
- Current performance is adequate
- Cannon-es is lightweight and sufficient
- Migration cost not justified

**Consider Rapier only if:**
- Level 50+ becomes laggy
- You add many simultaneous balls
- Complex physics interactions needed

## Proposed Improvements Roadmap

### Phase 1: Mobile Compatibility (Critical)
1. Implement touch event handlers
2. Test on iOS Safari and Android Chrome
3. Adjust UI for touch (larger targets)
4. Add viewport meta tags for proper scaling

### Phase 2: Performance & Quality
1. Upgrade broadphase algorithm (SAP)
2. Add frame rate monitoring
3. Implement adaptive quality settings
4. Add loading screen

### Phase 3: Game Features
1. Sound effects (ball hits, wall breaks)
2. Background music (optional toggle)
3. Local storage for high scores
4. Power-up walls (special abilities)
5. Combo system (rewards for chain hits)

### Phase 4: Visual Enhancements
1. Particle effects for wall destruction
2. Ball trail effect
3. Better impact effects (sparks, debris)
4. Post-processing (bloom, glow)

### Phase 5: Polish & Distribution
1. Progressive Web App (PWA) capabilities
2. Offline mode with service worker
3. Install prompt for mobile
4. Share score functionality

## Technical Debt & Code Quality

### Areas for Improvement

1. **Magic Numbers**
   - Many hardcoded values (colors, dimensions)
   - Should extract to configuration object
   - Example: `const CONFIG = { BALL_RADIUS: 0.15, ... }`

2. **Collision Detection Logic**
   - `checkWallCollisions()` iterates all contacts every substep
   - Could use collision event listeners instead
   - Less performant but simpler to maintain

3. **Wall Creation**
   - 80-line method with complex logic
   - Could extract wall type selection
   - Material setup could be abstracted

4. **DOM Manipulation**
   - Game logic mixed with UI creation
   - Could use a UI manager class
   - Consider framework for complex UI (React, Vue)

5. **No Error Handling**
   - Missing try-catch blocks
   - No fallback if WebGL fails
   - Should detect WebGL support

6. **Asset Management**
   - All assets created procedurally
   - No texture loading system
   - Could add model loader for future 3D assets

### Best Practices Being Followed ✅

1. **ES6 Modules** - Modern import system
2. **Class-based OOP** - Clear encapsulation
3. **Const/Let** - No var usage
4. **Arrow Functions** - Clean callbacks
5. **Event Cleanup** - Proper disposal of geometries/materials

## Conclusion

**Poolanoid** is a well-architected 3D web game with solid physics and clean code. The current technology stack (Three.js + Cannon-es) is appropriate and performant for the game's scope.

**Critical Action Item:**
- **Implement touch controls** - this is blocking mobile deployment

**WebGPU Decision:**
- **Not recommended** due to iOS incompatibility
- Stick with WebGL for maximum mobile compatibility
- Revisit in 2027+ when iOS Safari adds support

**Physics Library:**
- **Cannon-es is sufficient** for current needs
- Consider Rapier only if performance issues arise at high levels

**Next Steps:**
1. Add touch event handling (highest priority)
2. Test on actual mobile devices
3. Optimize performance for older phones
4. Add progressive enhancement features

The game has a solid foundation and is ready for mobile optimization and feature expansion.