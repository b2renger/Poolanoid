import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import * as CANNON from 'cannon';
import { CONFIG } from '../config.js';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { Ball } from '../entities/Ball.js';
import { Table } from '../entities/Table.js';
import { WallManager } from '../entities/WallManager.js';
import { InputManager } from '../input/InputManager.js';
import { ImpactEffects } from '../effects/ImpactEffects.js';
import { FloatingText } from '../effects/FloatingText.js';
import { HUD } from '../ui/HUD.js';
import { GameOverScreen } from '../ui/GameOverScreen.js';
import { HomeScreen } from '../ui/HomeScreen.js';
import { StorageManager } from '../storage/StorageManager.js';
import { AudioManager } from '../audio/AudioManager.js';
import { ParticleSystem } from '../effects/ParticleSystem.js';

/**
 * Main game controller — orchestrates physics, rendering, input, and game state.
 * @class PoolGame
 */
export class PoolGame {
    constructor() {
        // Game state
        this.level = 1;
        this.score = 0;
        this.combo = 0;
        this.comboTimer = null;
        this.shotsRemaining = CONFIG.GAME.BASE_SHOTS;
        this.ballSettledTime = 0;
        this.isGameOver = false;
        this.isPlaying = false;
        this.isContextLost = false;

        // Effects state
        this.shakeIntensity = 0;
        this.slowMoUntil = 0;
        this.levelZoomStart = 0;

        // Renderer
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(CONFIG.COLORS.BACKGROUND, CONFIG.CAMERA.FOG_NEAR, CONFIG.CAMERA.FOG_FAR);
        this.camera = new THREE.PerspectiveCamera(CONFIG.CAMERA.FOV, window.innerWidth / window.innerHeight, CONFIG.CAMERA.NEAR, CONFIG.CAMERA.FAR);
        this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(CONFIG.COLORS.BACKGROUND);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.setupContextLossHandling();

        // Device capabilities
        this.deviceInfo = this.detectDeviceCapabilities();
        this.applyQualitySettings();

        // Post-processing (skip on low-end devices)
        this.composer = null;
        if (!this.deviceInfo.isLowEnd) {
            this.setupBloom();
        }

        // Camera
        this.camera.position.set(0, CONFIG.CAMERA.POSITION_Y, 0);
        this.camera.lookAt(0, 0, 0);

        // Orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enabled = true;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = CONFIG.CAMERA.ORBIT_DAMPING;
        this.controls.enablePan = false;
        this.controls.minPolarAngle = 0;
        this.controls.maxPolarAngle = 0;

        // Lighting
        this.setupLighting();

        // Physics
        this.physics = new PhysicsWorld();

        // Entities (always present — table and ball visible behind home screen)
        this.table = new Table(this.scene, this.physics);
        this.ball = new Ball(this.scene, this.physics);

        // Ball–table contact material
        const ballTableContact = new CANNON.ContactMaterial(
            this.ball.body.material, this.table.physicsMaterial,
            { friction: CONFIG.PHYSICS.BALL_TABLE_FRICTION, restitution: CONFIG.PHYSICS.BALL_TABLE_RESTITUTION }
        );
        this.physics.addContactMaterial(ballTableContact);
        this.table.createBoundaryWalls(this.physics, this.ball.body.material);

        // Effects
        this.effects = new ImpactEffects(this.scene);
        this.floatingText = new FloatingText(this.scene);
        this.particles = new ParticleSystem(this.scene);

        // Extra balls (from multi-ball power-up)
        this.extraBalls = [];

        // Walls
        this.wallManager = new WallManager(this.scene, this.physics);
        this.wallManager.onWallRemoved = (pos, type, isPowerUp) => {
            this.effects.spawn(pos);
            const color = isPowerUp ? CONFIG.POWERUPS[type].color : CONFIG.WALL_BEHAVIORS[type].color;
            this.effects.flash(pos, color);
            if (type === 'bomb') {
                this.particles.emit(pos, color, {
                    count: CONFIG.PARTICLES.BOMB_COUNT,
                    speedMax: CONFIG.PARTICLES.BOMB_SPEED_MAX
                });
            } else {
                this.particles.emit(pos, color);
            }
            this.scoreWall(type, isPowerUp, pos);
        };
        this.wallManager.onAllCleared = () => this.nextLevel();
        this.wallManager.onCountChanged = () => this.updateHUD();
        this.wallManager.onPowerUp = (type, pos) => this.handlePowerUp(type, pos);

        // Ball collision → wall removal queue + velocity effects + sound
        this.ball.body.addEventListener('collide', (event) => {
            this.wallManager.queueRemoval(event.body, this.ball.body.position.clone());
            if (event.body.wallType) this.applyWallEffect(event.body.wallType, this.ball.body);
            if (event.body.isCushion) this.audio.play('cushionBounce');
        });

        // Input
        this.input = new InputManager(this.camera, this.renderer, this.controls, this.scene);
        this.input.canShoot = () => this.isPlaying && !this.isGameOver && this.shotsRemaining > 0;
        this.input.getBallPosition = () => this.ball.mesh.position;
        this.input.onShoot = (direction, magnitude) => this.onShoot(direction, magnitude);

        // Storage
        this.storage = new StorageManager();

        // Audio (initialized lazily on first user gesture)
        this.audio = new AudioManager();

        // UI
        this.hud = new HUD();
        this.gameOverScreen = new GameOverScreen();
        this.homeScreen = new HomeScreen(this.storage);
        this.homeScreen.onPlay = () => this.startGame();
        this.homeScreen.onSoundToggle = (enabled) => { this.audio.enabled = enabled; };
        this.audio.enabled = this.homeScreen.soundEnabled;

        // Start render loop (background scene visible behind home screen)
        this.animate();

        // Resize
        this._onResize = () => this.onWindowResize();
        window.addEventListener('resize', this._onResize, false);

        // Debug FPS
        if (window.location.search.includes('debug')) {
            this.hud.createFPSCounter();
        }

        // Cleanup
        window.addEventListener('beforeunload', () => this.dispose());

        // Done loading — hide loader, home screen is already visible
        this.hideLoadingScreen();
    }

    /* ── Game Flow ── */

    startGame() {
        this.audio.init(); // first user gesture → create AudioContext
        this.homeScreen.hide();
        this.level = 1;
        this.score = 0;
        this.combo = 0;
        clearTimeout(this.comboTimer);
        this.comboTimer = null;
        this.shotsRemaining = CONFIG.GAME.BASE_SHOTS;
        this.ballSettledTime = 0;
        this.shakeIntensity = 0;
        this.slowMoUntil = 0;
        this.levelZoomStart = Date.now();
        this.physics.timeScale = 1;
        this.isGameOver = false;
        this.isPlaying = true;
        this.ball.reset();
        this.clearExtraBalls();
        this.effects.clear();
        this.floatingText.clear();
        this.particles.clear();
        this.wallManager.createWalls(this.level, this.ball.body.material);
        this.updateAimLineScale();
        this.hud.show();
        this.updateHUD();
    }

    returnToHome() {
        this.isPlaying = false;
        clearTimeout(this.comboTimer);
        this.physics.timeScale = 1;
        this.clearExtraBalls();
        this.wallManager.clearAll();
        this.effects.clear();
        this.floatingText.clear();
        this.particles.clear();
        this.ball.reset();
        this.hud.hide();
        this.homeScreen.refresh();
        this.homeScreen.show();
    }

    /* ── Lighting ── */

    setupLighting() {
        const L = CONFIG.LIGHTING;

        const ambientLight = new THREE.AmbientLight(L.AMBIENT_COLOR, L.AMBIENT_INTENSITY);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(L.MAIN_COLOR, L.MAIN_INTENSITY);
        mainLight.position.set(L.MAIN_POSITION.x, L.MAIN_POSITION.y, L.MAIN_POSITION.z);
        mainLight.target.position.set(0, 0, 0);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = L.SHADOW_MAP_SIZE;
        mainLight.shadow.mapSize.height = L.SHADOW_MAP_SIZE;
        mainLight.shadow.camera.near = L.SHADOW_NEAR;
        mainLight.shadow.camera.far = L.SHADOW_FAR;
        mainLight.shadow.camera.left = L.SHADOW_LEFT;
        mainLight.shadow.camera.right = L.SHADOW_RIGHT;
        mainLight.shadow.camera.top = L.SHADOW_TOP;
        mainLight.shadow.camera.bottom = L.SHADOW_BOTTOM;
        mainLight.shadow.bias = L.SHADOW_BIAS;
        this.scene.add(mainLight.target);
        this.scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(L.FILL_COLOR, L.FILL_INTENSITY);
        fillLight.position.set(L.FILL_POSITION.x, L.FILL_POSITION.y, L.FILL_POSITION.z);
        fillLight.target.position.set(0, 0, 0);
        this.scene.add(fillLight.target);
        this.scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(L.RIM_COLOR, L.RIM_INTENSITY);
        rimLight.position.set(L.RIM_POSITION.x, L.RIM_POSITION.y, L.RIM_POSITION.z);
        rimLight.target.position.set(0, 0, 0);
        this.scene.add(rimLight.target);
        this.scene.add(rimLight);
    }

    /* ── Gameplay ── */

    updateHUD() {
        this.hud.update(this.level, this.shotsRemaining, this.wallManager.count, this.score);
    }

    updateAimLineScale() {
        const fade = CONFIG.AIMING.AIM_LINE_FADE_LEVEL;
        this.input.aimLineScale = Math.max(0, 1 - (this.level - 1) / (fade - 1));
    }

    onShoot(direction, magnitude) {
        this.shotsRemaining--;
        this.ballSettledTime = 0;
        this.combo = 0;
        clearTimeout(this.comboTimer);
        this.comboTimer = null;
        this.ball.applyImpulse(direction, magnitude);
        this.audio.play('shoot');
        this.updateHUD();
        // Game-over check is deferred to animate() so the last shot plays out
        // and power-ups (extra shots) can still save the player.
    }

    animate(time = 0) {
        if (this.isContextLost) return;
        requestAnimationFrame((t) => this.animate(t));

        try {
            if (this.isPlaying) {
                // Slow-mo
                const now = Date.now();
                if (this.slowMoUntil && now < this.slowMoUntil) {
                    this.physics.timeScale = CONFIG.SLOW_MO.TIME_SCALE;
                } else if (this.physics.timeScale !== 1) {
                    this.physics.timeScale = 1;
                }

                this.physics.update(time, this.ball.body.velocity, () => this.wallManager.processRemovals());
                this.ball.clampToTable();
                this.ball.syncMeshToBody();
                this.updateExtraBalls();
                this.effects.update();
                this.floatingText.update();
                this.particles.update(1 / 60);
                this.wallManager.updatePowerupGlow(time);

                // Deferred game-over: wait for ball + extra balls to settle
                if (!this.isGameOver && this.shotsRemaining <= 0
                    && this.wallManager.count > 0
                    && this.extraBalls.length === 0) {
                    const vel = this.ball.body.velocity;
                    const speedSq = vel.x * vel.x + vel.z * vel.z;
                    const limit = CONFIG.PHYSICS.BALL_SLEEP_SPEED_LIMIT;
                    if (speedSq < limit * limit) {
                        this.ballSettledTime += 1 / 60;
                        if (this.ballSettledTime >= CONFIG.PHYSICS.BALL_SLEEP_TIME_LIMIT) {
                            this.gameOver();
                        }
                    } else {
                        this.ballSettledTime = 0;
                    }
                }
            }

            // Level zoom (applied to orbit target Y so it doesn't fight controls)
            if (this.levelZoomStart) {
                const zoomY = this.getLevelZoomY(Date.now());
                this.controls.target.y = 0;
                this.camera.position.y = zoomY;
            }

            this.controls.update();

            // Screen shake — temporary offset applied after controls, restored after render
            let shakeX = 0, shakeZ = 0;
            if (this.shakeIntensity > 0.001) {
                shakeX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
                shakeZ = (Math.random() - 0.5) * 2 * this.shakeIntensity;
                this.camera.position.x += shakeX;
                this.camera.position.z += shakeZ;
                this.shakeIntensity *= Math.exp(-CONFIG.SHAKE.DECAY * (1 / 60));
            } else {
                this.shakeIntensity = 0;
            }

            if (this.composer) {
                this.composer.render();
            } else {
                this.renderer.render(this.scene, this.camera);
            }

            // Restore camera after render so OrbitControls isn't polluted
            if (shakeX || shakeZ) {
                this.camera.position.x -= shakeX;
                this.camera.position.z -= shakeZ;
            }

            this.hud.updateFPS();
        } catch (error) {
            console.error('Animation loop error:', error);
            this.handleCriticalError(error);
        }
    }

    nextLevel() {
        this.level++;
        this.shotsRemaining = CONFIG.GAME.BASE_SHOTS + (this.level - 1) * CONFIG.GAME.EXTRA_SHOTS_PER_LEVEL;
        this.ball.stop();
        this.clearExtraBalls();
        this.levelZoomStart = Date.now();
        this.audio.play('levelComplete');

        setTimeout(() => {
            this.effects.clear();
            this.floatingText.clear();
            this.particles.clear();
            this.wallManager.createWalls(this.level, this.ball.body.material);
            this.updateAimLineScale();
            this.updateHUD();
        }, CONFIG.EFFECTS.NEXT_LEVEL_DELAY);
    }

    gameOver() {
        this.isGameOver = true;
        this.ball.stop();
        this.clearExtraBalls();
        clearTimeout(this.comboTimer);
        this.physics.timeScale = 1;
        this.audio.play('gameOver');

        const previousBest = this.storage.getHighScore();
        const isNewBest = !previousBest || this.score > previousBest.score;

        this.gameOverScreen.show(this.level, this.score, isNewBest, (initials) => {
            this.storage.saveHighScore(this.score, this.level, initials);
            this.returnToHome();
        });
    }

    /* ── Power-ups & Multi-ball ── */

    handlePowerUp(type, position) {
        const def = CONFIG.POWERUPS[type];
        const colorHex = '#' + def.color.toString(16).padStart(6, '0');
        this.floatingText.spawn(def.label, position, colorHex);
        this.audio.play('wallBreak');

        switch (type) {
            case 'extraShot':
                this.shotsRemaining += def.shots;
                this.updateHUD();
                break;
            case 'multiBall':
                this.spawnExtraBalls(position);
                break;
            // bomb chain reaction is handled internally by WallManager
        }
    }

    applyWallEffect(wallType, ballBody) {
        switch (wallType) {
            case 'sticky':
                ballBody.velocity.set(0, 0, 0);
                ballBody.angularVelocity.set(0, 0, 0);
                break;
            case 'lowBounce':
                ballBody.velocity.x *= 0.25;
                ballBody.velocity.z *= 0.25;
                break;
            case 'extraBounce':
                ballBody.velocity.x *= 1.25;
                ballBody.velocity.z *= 1.25;
                break;
        }
    }

    scoreWall(type, isPowerUp, position) {
        if (isPowerUp) return; // power-up walls don't give points

        const points = CONFIG.SCORING.POINTS[type] || 0;
        if (points === 0) return;

        // Award base points immediately
        this.score += points;
        this.combo++;
        this.updateHUD();

        // Sound — pitch escalates with combo
        if (this.combo > 1) {
            this.audio.play('comboHit', { combo: this.combo });
        } else {
            this.audio.play('wallBreak');
        }

        // Color-coded floating text
        const behavior = CONFIG.WALL_BEHAVIORS[type];
        const colorHex = '#' + behavior.color.toString(16).padStart(6, '0');
        this.floatingText.spawn(`+${points}`, position, colorHex);

        // Screen shake (intensity scales with combo)
        const S = CONFIG.SHAKE;
        this.shakeIntensity = Math.min(
            S.BASE_INTENSITY + this.combo * S.COMBO_INTENSITY,
            S.MAX_INTENSITY
        );

        // Slow-mo on high combos
        if (this.combo >= CONFIG.SLOW_MO.MIN_COMBO) {
            this.slowMoUntil = Date.now() + CONFIG.SLOW_MO.DURATION;
        }

        // Restart combo settle timer
        clearTimeout(this.comboTimer);
        this.comboTimer = setTimeout(() => this.finalizeCombo(), CONFIG.COMBO.SETTLE_DELAY);
    }

    finalizeCombo() {
        if (this.combo < 2) {
            this.combo = 0;
            return;
        }

        // Find highest matching threshold
        const thresholds = CONFIG.COMBO.THRESHOLDS;
        let reward = null;
        for (let i = thresholds.length - 1; i >= 0; i--) {
            if (this.combo >= thresholds[i].min) {
                reward = thresholds[i];
                break;
            }
        }

        if (reward) {
            this.score += reward.points;
            this.shotsRemaining += reward.shots;
            this.updateHUD();
            this.hud.showCombo(this.combo, reward.points, reward.color);
        }

        this.combo = 0;
    }

    getLevelZoomY(now) {
        const elapsed = now - this.levelZoomStart;
        const Z = CONFIG.LEVEL_ZOOM;
        const baseY = CONFIG.CAMERA.POSITION_Y;
        const totalDuration = Z.DIP_DURATION + Z.HOLD_DURATION + Z.RETURN_DURATION;

        if (elapsed >= totalDuration) {
            this.levelZoomStart = 0;
            return baseY;
        }

        if (elapsed < Z.DIP_DURATION) {
            const t = elapsed / Z.DIP_DURATION;
            return baseY - Z.DIP * t * t; // ease-in
        }
        if (elapsed < Z.DIP_DURATION + Z.HOLD_DURATION) {
            return baseY - Z.DIP;
        }
        const returnElapsed = elapsed - Z.DIP_DURATION - Z.HOLD_DURATION;
        const t = returnElapsed / Z.RETURN_DURATION;
        return baseY - Z.DIP * (1 - t * t); // ease-out
    }

    spawnExtraBalls(position) {
        const mainVel = this.ball.body.velocity;
        const speed = Math.sqrt(mainVel.x * mainVel.x + mainVel.z * mainVel.z)
            * CONFIG.MULTI_BALL.IMPULSE_FACTOR;
        const baseAngle = Math.atan2(mainVel.z, mainVel.x);
        const spread = CONFIG.MULTI_BALL.SPREAD_ANGLE;
        const count = CONFIG.POWERUPS.multiBall.count;

        for (let i = 0; i < count; i++) {
            const angle = baseAngle + spread * (i / (count - 1) - 0.5);
            const extraBall = new Ball(this.scene, this.physics, this.ball.body.material);

            const radius = CONFIG.DIMENSIONS.BALL_RADIUS;
            extraBall.body.position.set(position.x, radius, position.z);
            extraBall.mesh.position.set(position.x, radius, position.z);

            const impulseSpeed = Math.max(speed, 3); // minimum speed so they move
            extraBall.body.velocity.set(
                Math.cos(angle) * impulseSpeed,
                0,
                Math.sin(angle) * impulseSpeed
            );

            extraBall.body.addEventListener('collide', (event) => {
                this.wallManager.queueRemoval(event.body, extraBall.body.position.clone());
                if (event.body.wallType) this.applyWallEffect(event.body.wallType, extraBall.body);
            });

            this.extraBalls.push({ ball: extraBall, spawnTime: Date.now() });
        }
    }

    updateExtraBalls() {
        const now = Date.now();
        for (let i = this.extraBalls.length - 1; i >= 0; i--) {
            const eb = this.extraBalls[i];
            const expired = now - eb.spawnTime > CONFIG.MULTI_BALL.TIMEOUT;
            const vel = eb.ball.body.velocity;
            const speedSq = vel.x * vel.x + vel.z * vel.z;
            const limit = CONFIG.PHYSICS.BALL_SLEEP_SPEED_LIMIT;
            const stopped = speedSq < limit * limit;

            if (expired || stopped) {
                this.physics.removeBody(eb.ball.body);
                this.scene.remove(eb.ball.mesh);
                eb.ball.mesh.geometry.dispose();
                eb.ball.mesh.material.dispose();
                this.extraBalls.splice(i, 1);
            } else {
                eb.ball.clampToTable();
                eb.ball.syncMeshToBody();
            }
        }
    }

    clearExtraBalls() {
        for (const eb of this.extraBalls) {
            this.physics.removeBody(eb.ball.body);
            this.scene.remove(eb.ball.mesh);
            eb.ball.mesh.geometry.dispose();
            eb.ball.mesh.material.dispose();
        }
        this.extraBalls = [];
    }

    /* ── Infrastructure ── */

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (this.composer) this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    detectDeviceCapabilities() {
        const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
        const isLowEnd = isMobile && (
            (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= CONFIG.QUALITY.LOW_END_CORE_THRESHOLD) ||
            (navigator.deviceMemory && navigator.deviceMemory <= CONFIG.QUALITY.LOW_END_MEMORY_THRESHOLD)
        );
        return { isMobile, isLowEnd };
    }

    applyQualitySettings() {
        const { isMobile, isLowEnd } = this.deviceInfo;
        if (isLowEnd) this.renderer.shadowMap.enabled = false;
        this.renderer.setPixelRatio(
            isMobile ? Math.min(CONFIG.QUALITY.MOBILE_MAX_PIXEL_RATIO, window.devicePixelRatio) : window.devicePixelRatio
        );
    }

    setupBloom() {
        const B = CONFIG.BLOOM;
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        const bloom = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            B.STRENGTH, B.RADIUS, B.THRESHOLD
        );
        this.composer.addPass(bloom);
    }

    setupContextLossHandling() {
        this.renderer.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            console.warn('WebGL context lost');
            this.isContextLost = true;
            this.showContextLostError();
        });
        this.renderer.domElement.addEventListener('webglcontextrestored', () => {
            console.log('WebGL context restored');
            this.isContextLost = false;
            this.hideContextLostError();
            this.animate();
        });
    }

    showContextLostError() {
        const overlay = document.createElement('div');
        overlay.id = 'context-lost-overlay';
        overlay.className = 'error-overlay';
        overlay.innerHTML = '<p>Graphics context was lost.</p><p>Waiting for recovery...</p>';
        document.body.appendChild(overlay);
    }

    hideContextLostError() {
        const overlay = document.getElementById('context-lost-overlay');
        if (overlay) overlay.remove();
    }

    handleCriticalError(error) {
        this.isContextLost = true;
        const overlay = document.createElement('div');
        overlay.className = 'error-overlay';
        const btn = document.createElement('button');
        btn.textContent = 'Reload';
        btn.onclick = () => window.location.reload();
        overlay.innerHTML = '<p>Something went wrong.</p>';
        overlay.appendChild(btn);
        document.body.appendChild(overlay);
    }

    hideLoadingScreen() {
        const loader = document.getElementById('loading-screen');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 300);
        }
    }

    dispose() {
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
        window.removeEventListener('resize', this._onResize);
        this.input.dispose();
        this.renderer.dispose();
    }
}
