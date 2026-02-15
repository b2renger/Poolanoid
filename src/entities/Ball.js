import * as THREE from 'three';
import * as CANNON from 'cannon';
import { CONFIG } from '../config.js';

/**
 * Ball entity: creates and manages the ball mesh + physics body.
 */
export class Ball {
    constructor(scene, physics) {
        const radius = CONFIG.DIMENSIONS.BALL_RADIUS;
        const segments = CONFIG.DIMENSIONS.BALL_SEGMENTS;

        // Visual
        const geometry = new THREE.SphereGeometry(radius, segments, segments);
        const material = new THREE.MeshPhongMaterial({
            color: CONFIG.COLORS.BALL,
            shininess: CONFIG.MATERIALS.BALL_SHININESS,
            emissive: CONFIG.COLORS.BALL,
            emissiveIntensity: CONFIG.MATERIALS.BALL_EMISSIVE_INTENSITY
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(0, radius, 0);
        this.mesh.castShadow = true;
        scene.add(this.mesh);

        // Physics
        this.body = new CANNON.Body({
            mass: CONFIG.PHYSICS.BALL_MASS,
            shape: new CANNON.Sphere(radius),
            position: new CANNON.Vec3(0, radius, 0),
            material: new CANNON.Material(),
            linearDamping: CONFIG.PHYSICS.BALL_LINEAR_DAMPING,
            angularDamping: CONFIG.PHYSICS.BALL_ANGULAR_DAMPING,
            sleepSpeedLimit: CONFIG.PHYSICS.BALL_SLEEP_SPEED_LIMIT,
            sleepTimeLimit: CONFIG.PHYSICS.BALL_SLEEP_TIME_LIMIT
        });
        physics.addBody(this.body);
    }

    /** Sync Three.js mesh to Cannon body position/rotation. */
    syncMeshToBody() {
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);
    }

    /** Prevent ball from sinking below the table surface. */
    clampToTable() {
        const radius = this.body.shapes[0].radius;
        const tableY = CONFIG.DIMENSIONS.TABLE_HEIGHT / 2;
        const minY = tableY + radius;
        if (this.body.position.y < minY) {
            this.body.position.y = minY;
            this.body.velocity.y = Math.max(0, this.body.velocity.y);
        }
    }

    applyImpulse(direction, magnitude) {
        this.body.wakeUp();
        this.body.applyImpulse(
            new CANNON.Vec3(direction.x * magnitude, 0, direction.z * magnitude),
            new CANNON.Vec3(0, 0, 0)
        );
    }

    stop() {
        this.body.velocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
    }

    reset() {
        const radius = this.mesh.geometry.parameters.radius;
        this.body.position.set(0, radius, 0);
        this.stop();
    }
}
