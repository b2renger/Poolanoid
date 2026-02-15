import * as THREE from 'three';
import * as CANNON from 'cannon';
import { CONFIG } from '../config.js';

/**
 * Manages breakable wall lifecycle: creation, collision queueing, removal, and fade-out.
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

        /** @type {Function|null} Called with (impactPos) when a wall is removed. */
        this.onWallRemoved = null;
        /** @type {Function|null} Called when all walls are cleared (level complete). */
        this.onAllCleared = null;
        /** @type {Function|null} Called after any wall count change so HUD can update. */
        this.onCountChanged = null;
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

    /** Process queued removals (call between physics substeps). */
    processRemovals() {
        if (this.wallRemovalQueue.length === 0) return;
        const queue = this.wallRemovalQueue.splice(0);
        for (const { wall, impactPos } of queue) {
            this.removeWall(wall, impactPos);
        }
    }

    /** Generate breakable walls for the given level. */
    createWalls(level, ballMaterial) {
        this.clear();

        // Remove previous level's contact materials
        for (const cm of this.wallContactMaterials) {
            this.physics.removeContactMaterial(cm);
        }
        this.wallContactMaterials = [];

        const { WALL_WIDTH, WALL_HEIGHT, WALL_THICKNESS, WALL_SPAWN_WIDTH, WALL_SPAWN_DEPTH } = CONFIG.DIMENSIONS;
        const wallCount = CONFIG.GAME.BASE_WALL_COUNT + (level - 1) * CONFIG.GAME.WALLS_PER_LEVEL;

        // Physics materials per wall type
        const normalMat = new CANNON.Material();
        const blueMat = new CANNON.Material();
        const redMat = new CANNON.Material();

        const contacts = [
            new CANNON.ContactMaterial(normalMat, ballMaterial, { friction: CONFIG.PHYSICS.WALL_FRICTION, restitution: CONFIG.PHYSICS.WALL_NORMAL_RESTITUTION }),
            new CANNON.ContactMaterial(blueMat, ballMaterial, { friction: CONFIG.PHYSICS.WALL_FRICTION, restitution: CONFIG.PHYSICS.WALL_BLUE_RESTITUTION }),
            new CANNON.ContactMaterial(redMat, ballMaterial, { friction: CONFIG.PHYSICS.WALL_FRICTION, restitution: CONFIG.PHYSICS.WALL_RED_RESTITUTION })
        ];
        for (const cm of contacts) this.physics.addContactMaterial(cm);
        this.wallContactMaterials = contacts;

        const materialMap = { normal: normalMat, blue: blueMat, red: redMat };

        for (let i = 0; i < wallCount; i++) {
            const x = (Math.random() - 0.5) * WALL_SPAWN_WIDTH;
            const z = (Math.random() - 0.5) * WALL_SPAWN_DEPTH;
            const y = WALL_HEIGHT / 2;
            const rotationY = Math.random() * Math.PI * 2;

            const roll = Math.random();
            const wallDef = CONFIG.WALL_TYPES.find(wt => roll < wt.threshold);

            // Visual
            const geometry = new THREE.BoxGeometry(WALL_WIDTH, WALL_HEIGHT, WALL_THICKNESS);
            const mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
                color: wallDef.color,
                shininess: CONFIG.MATERIALS.WALL_SHININESS
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
                material: materialMap[wallDef.type]
            });
            body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotationY);
            this.physics.addBody(body);

            this.walls.push({ mesh, body, type: wallDef.type });
        }
    }

    removeWall(wall, impactPos) {
        if (this.onWallRemoved && impactPos) {
            this.onWallRemoved(impactPos);
        }

        this.removedBodies.add(wall.body.id);
        this.physics.removeBody(wall.body);
        const index = this.walls.indexOf(wall);
        if (index > -1) this.walls.splice(index, 1);

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
                const fadeIdx = this.fadingWalls.indexOf(wall);
                if (fadeIdx > -1) this.fadingWalls.splice(fadeIdx, 1);
                if (this.onCountChanged) this.onCountChanged();
            } else {
                const easedProgress = 1 - Math.pow(2, -10 * progress);
                wall.mesh.material.opacity = 1 - easedProgress;
            }
        }, 16);
        this.fadingWalls.push(wall);
    }

    /** Clear all walls and fading effects. */
    clear() {
        this.walls.forEach(wall => {
            this.scene.remove(wall.mesh);
            this.physics.removeBody(wall.body);
        });
        this.walls = [];
        this.wallRemovalQueue = [];
        this.removedBodies.clear();
        this.fadingWalls.forEach(wall => this.scene.remove(wall.mesh));
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
