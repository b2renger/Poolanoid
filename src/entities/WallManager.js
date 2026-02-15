import * as THREE from 'three';
import * as CANNON from 'cannon';
import { CONFIG } from '../config.js';

/**
 * Manages breakable wall lifecycle: creation, collision queueing, removal,
 * fade-out, power-up activation, bomb chain reactions, and glow animation.
 */
export class WallManager {
    constructor(scene, physics) {
        this.scene = scene;
        this.physics = physics;
        this.walls = [];
        this.fadingWalls = [];
        this.wallRemovalQueue = [];
        this.removedBodies = new Set();
        this.wallContactMaterials = [];
        this.powerupWalls = [];

        /** @type {Function|null} Called with (impactPos) when a wall is removed. */
        this.onWallRemoved = null;
        /** @type {Function|null} Called when all walls are cleared (level complete). */
        this.onAllCleared = null;
        /** @type {Function|null} Called after any wall count change so HUD can update. */
        this.onCountChanged = null;
        /** @type {Function|null} Called with (type, position) when a power-up wall is destroyed. */
        this.onPowerUp = null;
    }

    get count() { return this.walls.length; }

    /** Queue a wall for removal (called from ball collision event). */
    queueRemoval(otherBody, impactPos) {
        if (this.removedBodies.has(otherBody.id)) return;
        const wall = this.walls.find(w => w.body === otherBody);
        if (wall && !wall.removing) {
            wall.removing = true;
            this.wallRemovalQueue.push({ wall, impactPos });
        }
    }

    /** Process queued removals (call between physics substeps). Handles bomb chains. */
    processRemovals() {
        while (this.wallRemovalQueue.length > 0) {
            const queue = this.wallRemovalQueue.splice(0);
            for (const { wall, impactPos } of queue) {
                this._removeWall(wall, impactPos);
            }
        }
    }

    /** Get spawn rate table for the current level. */
    _getSpawnRates(level) {
        const rates = CONFIG.WALL_SPAWN_RATES;
        return (rates.find(r => level <= r.maxLevel) || rates[rates.length - 1]).types;
    }

    /** Check if a type string is a power-up. */
    _isPowerUp(type) {
        return type in CONFIG.POWERUPS;
    }

    /** Get behavior key for physics material lookup. Power-ups use 'normal' physics. */
    _getBehavior(type) {
        return this._isPowerUp(type) ? 'normal' : type;
    }

    /** Generate breakable walls for the given level. */
    createWalls(level, ballMaterial) {
        this.clear();

        // Remove previous level's contact materials
        for (const cm of this.wallContactMaterials) {
            this.physics.removeContactMaterial(cm);
        }
        this.wallContactMaterials = [];
        this.powerupWalls = [];

        const { WALL_WIDTH, WALL_HEIGHT, WALL_THICKNESS, WALL_SPAWN_WIDTH, WALL_SPAWN_DEPTH } = CONFIG.DIMENSIONS;
        const wallCount = CONFIG.GAME.BASE_WALL_COUNT + (level - 1) * CONFIG.GAME.WALLS_PER_LEVEL;
        const spawnRates = this._getSpawnRates(level);

        // Create one CANNON.Material + ContactMaterial per behavior type
        const behaviorMaterials = {};
        for (const [name, def] of Object.entries(CONFIG.WALL_BEHAVIORS)) {
            const mat = new CANNON.Material();
            const contact = new CANNON.ContactMaterial(mat, ballMaterial, {
                friction: def.friction,
                restitution: def.restitution
            });
            this.physics.addContactMaterial(contact);
            this.wallContactMaterials.push(contact);
            behaviorMaterials[name] = mat;
        }

        for (let i = 0; i < wallCount; i++) {
            const x = (Math.random() - 0.5) * WALL_SPAWN_WIDTH;
            const z = (Math.random() - 0.5) * WALL_SPAWN_DEPTH;
            const y = WALL_HEIGHT / 2;
            const rotationY = Math.random() * Math.PI * 2;

            const roll = Math.random();
            const wallDef = spawnRates.find(wt => roll < wt.threshold);
            const type = wallDef.type;
            const isPowerUp = this._isPowerUp(type);
            const behavior = this._getBehavior(type);
            const color = isPowerUp ? CONFIG.POWERUPS[type].color : CONFIG.WALL_BEHAVIORS[type].color;

            // Visual
            const geometry = new THREE.BoxGeometry(WALL_WIDTH, WALL_HEIGHT, WALL_THICKNESS);
            const mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
                color,
                shininess: CONFIG.MATERIALS.WALL_SHININESS,
                emissive: isPowerUp ? color : 0x000000,
                emissiveIntensity: isPowerUp ? 0.1 : 0
            }));
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.position.set(x, y, z);
            mesh.rotation.y = rotationY;
            this.scene.add(mesh);

            // Physics
            const body = new CANNON.Body({
                type: CANNON.Body.STATIC,
                shape: new CANNON.Box(new CANNON.Vec3(WALL_WIDTH / 2, WALL_HEIGHT / 2, WALL_THICKNESS / 2)),
                position: new CANNON.Vec3(x, y, z),
                material: behaviorMaterials[behavior]
            });
            body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotationY);
            body.wallType = type;
            this.physics.addBody(body);

            const wall = { mesh, body, type, isPowerUp };
            this.walls.push(wall);
            if (isPowerUp) this.powerupWalls.push(wall);
        }
    }

    _removeWall(wall, impactPos) {
        if (this.removedBodies.has(wall.body.id)) return;

        // Remove from physics & wall list first (before bomb chain iterates this.walls)
        this.removedBodies.add(wall.body.id);
        this.physics.removeBody(wall.body);

        const index = this.walls.indexOf(wall);
        if (index > -1) this.walls.splice(index, 1);

        if (wall.isPowerUp) {
            const pIdx = this.powerupWalls.indexOf(wall);
            if (pIdx > -1) this.powerupWalls.splice(pIdx, 1);
        }

        // Callbacks
        if (this.onWallRemoved && impactPos) {
            this.onWallRemoved(impactPos, wall.type, wall.isPowerUp);
        }
        if (wall.isPowerUp && this.onPowerUp) {
            this.onPowerUp(wall.type, wall.body.position);
        }

        // Bomb chain reaction: queue nearby walls for removal
        if (wall.type === 'bomb') {
            this._triggerBomb(wall.body.position);
        }

        if (this.onCountChanged) this.onCountChanged();

        if (this.walls.length === 0 && this.onAllCleared) {
            this.onAllCleared();
        }

        // Fade out mesh (collider already gone)
        wall.mesh.material.transparent = true;
        const fadeOutDuration = CONFIG.EFFECTS.WALL_FADE_DURATION;
        const startTime = Date.now();
        const fadeInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / fadeOutDuration;
            if (progress >= 1) {
                clearInterval(fadeInterval);
                this.scene.remove(wall.mesh);
                wall.mesh.geometry.dispose();
                wall.mesh.material.dispose();
                const fadeIdx = this.fadingWalls.indexOf(wall);
                if (fadeIdx > -1) this.fadingWalls.splice(fadeIdx, 1);
            } else {
                const easedProgress = 1 - Math.pow(2, -10 * progress);
                wall.mesh.material.opacity = 1 - easedProgress;
            }
        }, 16);
        this.fadingWalls.push(wall);
    }

    /** Destroy all walls within bomb radius, queueing them for removal. */
    _triggerBomb(position) {
        const radius = CONFIG.POWERUPS.bomb.radius;
        const radiusSq = radius * radius;
        for (const wall of this.walls) {
            if (wall.removing) continue;
            const dx = wall.body.position.x - position.x;
            const dz = wall.body.position.z - position.z;
            if (dx * dx + dz * dz <= radiusSq) {
                wall.removing = true;
                this.wallRemovalQueue.push({ wall, impactPos: wall.body.position.clone() });
            }
        }
    }

    /** Update power-up wall glow animation. Call from game loop. */
    updatePowerupGlow(time) {
        if (this.powerupWalls.length === 0) return;
        const intensity = 0.1 + 0.4 * (0.5 + 0.5 * Math.sin(time * 0.003));
        for (const wall of this.powerupWalls) {
            wall.mesh.material.emissiveIntensity = intensity;
        }
    }

    /** Clear all walls and fading effects. */
    clear() {
        this.walls.forEach(wall => {
            this.scene.remove(wall.mesh);
            wall.mesh.geometry.dispose();
            wall.mesh.material.dispose();
            this.physics.removeBody(wall.body);
        });
        this.walls = [];
        this.powerupWalls = [];
        this.wallRemovalQueue = [];
        this.removedBodies.clear();
        this.fadingWalls.forEach(wall => {
            this.scene.remove(wall.mesh);
        });
        this.fadingWalls = [];
    }

    /** Clear walls AND contact materials (used when returning to home screen). */
    clearAll() {
        this.clear();
        for (const cm of this.wallContactMaterials) {
            this.physics.removeContactMaterial(cm);
        }
        this.wallContactMaterials = [];
    }
}
