import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as CANNON from 'cannon';
import { CONFIG } from '../config.js';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { Ball } from '../entities/Ball.js';
import { Table } from '../entities/Table.js';
import { WallManager } from '../entities/WallManager.js';
import { InputManager } from '../input/InputManager.js';
import { ImpactEffects } from '../effects/ImpactEffects.js';
import { HUD } from '../ui/HUD.js';
import { GameOverScreen } from '../ui/GameOverScreen.js';

/**
 * Main game controller — orchestrates physics, rendering, input, and game state.
 * @class PoolGame
 */
export class PoolGame {
    constructor() {
        // Game state
        this.level = 1;
        this.shotsRemaining = CONFIG.GAME.BASE_SHOTS;
        this.isGameOver = false;
        this.isContextLost = false;

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

        // Entities
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

        // Walls
        this.wallManager = new WallManager(this.scene, this.physics);
        this.wallManager.onWallRemoved = (pos) => this.effects.spawn(pos);
        this.wallManager.onAllCleared = () => this.nextLevel();
        this.wallManager.onCountChanged = () => this.updateHUD();

        // Ball collision → wall removal queue
        this.ball.body.addEventListener('collide', (event) => {
            this.wallManager.queueRemoval(event.body, this.ball.body.position.clone());
        });

        this.wallManager.createWalls(this.level, this.ball.body.material);

        // UI
        this.hud = new HUD();
        this.gameOverScreen = new GameOverScreen();
        this.updateHUD();

        // Input
        this.input = new InputManager(this.camera, this.renderer, this.controls, this.scene);
        this.input.canShoot = () => !this.isGameOver && this.shotsRemaining > 0;
        this.input.getBallPosition = () => this.ball.mesh.position;
        this.input.onShoot = (direction, magnitude) => this.onShoot(direction, magnitude);

        // Start animation loop
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

        // Done loading
        this.hideLoadingScreen();
    }

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

    updateHUD() {
        this.hud.update(this.level, this.shotsRemaining, this.wallManager.count);
    }

    onShoot(direction, magnitude) {
        this.shotsRemaining--;
        this.ball.applyImpulse(direction, magnitude);
        this.updateHUD();

        if (this.shotsRemaining <= 0 && this.wallManager.count > 0) {
            this.gameOver();
        }
    }

    animate(time = 0) {
        if (this.isContextLost) return;
        requestAnimationFrame((t) => this.animate(t));

        try {
            this.physics.update(time, this.ball.body.velocity, () => this.wallManager.processRemovals());
            this.ball.clampToTable();
            this.ball.syncMeshToBody();
            this.effects.update();
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
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

        setTimeout(() => {
            this.effects.clear();
            this.wallManager.createWalls(this.level, this.ball.body.material);
            this.updateHUD();
        }, CONFIG.EFFECTS.NEXT_LEVEL_DELAY);
    }

    gameOver() {
        this.isGameOver = true;
        this.ball.stop();
        this.gameOverScreen.show(this.level, () => this.restart());
    }

    restart() {
        this.level = 1;
        this.shotsRemaining = CONFIG.GAME.BASE_SHOTS;
        this.isGameOver = false;
        this.ball.reset();
        this.effects.clear();
        this.wallManager.createWalls(this.level, this.ball.body.material);
        this.updateHUD();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
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
