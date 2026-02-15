import * as CANNON from 'cannon';
import { CONFIG } from '../config.js';

/**
 * Manages the Cannon-es physics world and bullet-style adaptive simulation stepping.
 */
export class PhysicsWorld {
    constructor() {
        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, CONFIG.PHYSICS.GRAVITY, 0),
            allowSleep: true
        });
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.world.defaultContactMaterial.friction = CONFIG.PHYSICS.DEFAULT_FRICTION;
        this.world.defaultContactMaterial.restitution = CONFIG.PHYSICS.DEFAULT_RESTITUTION;
        this.world.solver.iterations = CONFIG.PHYSICS.SOLVER_ITERATIONS;

        this.accumulator = 0;
        this.lastFrameTime = 0;
    }

    /**
     * Bullet-style adaptive substeps: fast ball = smaller steps, no tunneling.
     * @param {number} time - Current animation timestamp (ms)
     * @param {CANNON.Vec3} ballVelocity - Ball's current velocity
     * @param {Function} onSubstep - Called between each substep (for wall removal processing)
     */
    update(time, ballVelocity, onSubstep) {
        const { DT, MIN_STEP_DT, MAX_SUBSTEPS, BULLET_SAFE_DISTANCE, MAX_FRAME_DELTA } = CONFIG.PHYSICS;
        const delta = this.lastFrameTime ? Math.min((time - this.lastFrameTime) / 1000, MAX_FRAME_DELTA) : DT;
        this.lastFrameTime = time;

        this.accumulator += delta;
        let steps = 0;
        while (steps < MAX_SUBSTEPS) {
            const speedXZ = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.z * ballVelocity.z);
            const stepDt = Math.max(
                MIN_STEP_DT,
                Math.min(DT, BULLET_SAFE_DISTANCE / Math.max(speedXZ, 0.1))
            );
            if (this.accumulator < stepDt) break;
            this.world.step(stepDt);
            this.accumulator -= stepDt;
            steps++;
            if (onSubstep) onSubstep();
        }
    }

    addBody(body) { this.world.addBody(body); }
    removeBody(body) { this.world.removeBody(body); }

    addContactMaterial(cm) { this.world.addContactMaterial(cm); }

    removeContactMaterial(cm) {
        const idx = this.world.contactmaterials.indexOf(cm);
        if (idx > -1) this.world.contactmaterials.splice(idx, 1);
    }
}
