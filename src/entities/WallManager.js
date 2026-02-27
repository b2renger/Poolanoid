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

    /** Squared distance from a point to a line segment in 2D (XZ plane). */
    _pointToSegmentDistSq(px, pz, ax, az, bx, bz) {
        const abx = bx - ax, abz = bz - az;
        const apx = px - ax, apz = pz - az;
        const lenSq = abx * abx + abz * abz;
        const t = lenSq > 0 ? Math.max(0, Math.min(1, (apx * abx + apz * abz) / lenSq)) : 0;
        const cx = ax + t * abx, cz = az + t * abz;
        const dx = px - cx, dz = pz - cz;
        return dx * dx + dz * dz;
    }

    /** Generate breakable walls for the given level. */
    createWalls(level, ballMaterial, ballPosition) {
        this.clear();

        // Remove previous level's contact materials
        for (const cm of this.wallContactMaterials) {
            this.physics.removeContactMaterial(cm);
        }
        this.wallContactMaterials = [];
        this.powerupWalls = [];

        const { WALL_MIN_LENGTH, WALL_MAX_LENGTH, WALL_HEIGHT, WALL_THICKNESS, WALL_SPAWN_WIDTH, WALL_SPAWN_DEPTH, BALL_SPAWN_CLEARANCE } = CONFIG.DIMENSIONS;
        const wallCount = CONFIG.GAME.BASE_WALL_COUNT + (level - 1) * CONFIG.GAME.WALLS_PER_LEVEL;
        const spawnRates = this._getSpawnRates(level);
        const clearanceSq = BALL_SPAWN_CLEARANCE * BALL_SPAWN_CLEARANCE;
        const ballX = ballPosition ? ballPosition.x : 0;
        const ballZ = ballPosition ? ballPosition.z : 0;

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
            let x, z, rotationY, wallLength;
            const maxAttempts = 20;
            let attempts = 0;

            // Re-roll position until the wall doesn't overlap the ball
            do {
                x = (Math.random() - 0.5) * WALL_SPAWN_WIDTH;
                z = (Math.random() - 0.5) * WALL_SPAWN_DEPTH;
                rotationY = Math.random() * Math.PI * 2;
                wallLength = WALL_MIN_LENGTH + Math.random() * (WALL_MAX_LENGTH - WALL_MIN_LENGTH);

                const halfLen = wallLength / 2;
                const dx = Math.cos(rotationY) * halfLen;
                const dz = Math.sin(rotationY) * halfLen;
                const distSq = this._pointToSegmentDistSq(ballX, ballZ, x - dx, z - dz, x + dx, z + dz);

                if (distSq >= clearanceSq) break;
                attempts++;
            } while (attempts < maxAttempts);

            const y = WALL_HEIGHT / 2;

            const roll = Math.random();
            const wallDef = spawnRates.find(wt => roll < wt.threshold);
            const type = wallDef.type;
            const isPowerUp = this._isPowerUp(type);
            const behavior = this._getBehavior(type);
            const color = isPowerUp ? CONFIG.POWERUPS[type].color : CONFIG.WALL_BEHAVIORS[type].color;

            // Visual
            const geometry = new THREE.BoxGeometry(wallLength, WALL_HEIGHT, WALL_THICKNESS);
            const isSpecial = isPowerUp || type !== 'normal';
            const mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
                color,
                shininess: CONFIG.MATERIALS.WALL_SHININESS,
                emissive: isSpecial ? color : 0x000000,
                emissiveIntensity: isSpecial ? (type === 'bomb' ? 0.7 : 0.5) : 0
            }));
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.position.set(x, y, z);
            mesh.rotation.y = rotationY;
            this.scene.add(mesh);

            // Physics
            const body = new CANNON.Body({
                type: CANNON.Body.STATIC,
                shape: new CANNON.Box(new CANNON.Vec3(wallLength / 2, WALL_HEIGHT / 2, WALL_THICKNESS / 2)),
                position: new CANNON.Vec3(x, y, z),
                material: behaviorMaterials[behavior]
            });
            body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotationY);
            body.wallType = type;
            this.physics.addBody(body);

            const wall = { mesh, body, type, isPowerUp };
            this.walls.push(wall);
            if (isSpecial) this.powerupWalls.push(wall);
        }
    }

    /** Remove a wall's physics body and bookkeeping. Returns false if already removed. */
    _detachWall(wall) {
        if (this.removedBodies.has(wall.body.id)) return false;
        this.removedBodies.add(wall.body.id);
        this.physics.removeBody(wall.body);
        const idx = this.walls.indexOf(wall);
        if (idx > -1) this.walls.splice(idx, 1);
        if (wall.isPowerUp || wall.type !== 'normal') {
            const pIdx = this.powerupWalls.indexOf(wall);
            if (pIdx > -1) this.powerupWalls.splice(pIdx, 1);
        }
        return true;
    }

    /** Play visual effects (callbacks, particles, flash, sound) and fade out mesh. */
    _showRemoval(wall, impactPos) {
        if (this.onWallRemoved && impactPos) {
            this.onWallRemoved(impactPos, wall.type, wall.isPowerUp);
        }
        if (wall.isPowerUp && this.onPowerUp) {
            this.onPowerUp(wall.type, wall.body.position);
        }

        // Fade out mesh
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

    _removeWall(wall, impactPos) {
        if (!this._detachWall(wall)) return;

        this._showRemoval(wall, impactPos);

        // Bomb chain reaction: detach intersecting walls immediately, stagger visuals
        if (wall.type === 'bomb') {
            this._triggerBomb(wall.body);
        }

        if (this.onCountChanged) this.onCountChanged();
        if (this.walls.length === 0 && this.onAllCleared) this.onAllCleared();
    }

    /** Compute the XZ axis-aligned half-extents for a rotated box body. */
    _xzAABB(body) {
        const half = body.shapes[0].halfExtents;
        const angle = 2 * Math.atan2(body.quaternion.y, body.quaternion.w);
        const cos = Math.abs(Math.cos(angle));
        const sin = Math.abs(Math.sin(angle));
        return { hx: cos * half.x + sin * half.z, hz: sin * half.x + cos * half.z };
    }

    /** Destroy all walls whose AABB intersects the bomb wall's AABB. */
    _triggerBomb(bombBody) {
        const bAABB = this._xzAABB(bombBody);
        const victims = [];
        for (const wall of this.walls) {
            if (wall.removing) continue;
            const wAABB = this._xzAABB(wall.body);
            if (Math.abs(bombBody.position.x - wall.body.position.x) < bAABB.hx + wAABB.hx &&
                Math.abs(bombBody.position.z - wall.body.position.z) < bAABB.hz + wAABB.hz) {
                wall.removing = true;
                victims.push(wall);
            }
        }

        // Detach all physics bodies immediately (no more collisions)
        for (const wall of victims) this._detachWall(wall);

        // Update count once for all detached walls
        if (victims.length > 0 && this.onCountChanged) this.onCountChanged();
        if (this.walls.length === 0 && this.onAllCleared) this.onAllCleared();

        // Stagger visual effects across frames (~50ms apart)
        victims.forEach((wall, i) => {
            setTimeout(() => {
                this._showRemoval(wall, wall.body.position.clone());
            }, (i + 1) * 50);
        });
    }

    /** Update power-up wall glow animation. Call from game loop. */
    updatePowerupGlow(time) {
        if (this.powerupWalls.length === 0) return;
        const wave = 0.5 + 0.5 * Math.sin(time * 0.003);
        for (const wall of this.powerupWalls) {
            if (wall.type === 'bomb') {
                wall.mesh.material.emissiveIntensity = 0.5 + 0.7 * wave;
            } else {
                wall.mesh.material.emissiveIntensity = 0.3 + 0.5 * wave;
            }
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
