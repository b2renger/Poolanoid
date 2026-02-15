import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Lightweight particle burst system for wall-break effects.
 * Uses THREE.Points with additive blending — one Points mesh per burst.
 * Updated from the main game loop (no internal rAF).
 */
export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.bursts = [];
    }

    /** Emit a burst of particles at the given position with the given color.
     *  @param {Object} [opts] - Optional overrides: count, speedMax */
    emit(position, color, opts = {}) {
        const P = CONFIG.PARTICLES;
        const count = opts.count || P.COUNT;
        const speedMax = opts.speedMax || P.SPEED_MAX;

        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const ages = new Float32Array(count);
        const lifetimes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            positions[i3] = position.x;
            positions[i3 + 1] = position.y;
            positions[i3 + 2] = position.z;

            // Random spherical velocity with upward bias
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.8; // bias away from straight down
            const speed = P.SPEED_MIN + Math.random() * (speedMax - P.SPEED_MIN);

            velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed;
            velocities[i3 + 1] = Math.abs(Math.cos(phi)) * speed;
            velocities[i3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

            ages[i] = 0;
            lifetimes[i] = P.LIFETIME_MIN + Math.random() * (P.LIFETIME_MAX - P.LIFETIME_MIN);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color,
            size: P.SIZE,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);

        this.bursts.push({ points, velocities, ages, lifetimes, count });
    }

    /** Advance all active bursts. Call from game loop with delta time in seconds. */
    update(dt) {
        const P = CONFIG.PARTICLES;

        for (let b = this.bursts.length - 1; b >= 0; b--) {
            const burst = this.bursts[b];
            const pos = burst.points.geometry.attributes.position.array;
            let allDead = true;

            for (let i = 0; i < burst.count; i++) {
                burst.ages[i] += dt;
                if (burst.ages[i] >= burst.lifetimes[i]) continue;

                allDead = false;
                const i3 = i * 3;

                // Apply gravity to Y velocity
                burst.velocities[i3 + 1] += P.GRAVITY * dt;

                // Damping
                const damp = Math.pow(P.DAMPING, dt * 60);
                burst.velocities[i3] *= damp;
                burst.velocities[i3 + 1] *= damp;
                burst.velocities[i3 + 2] *= damp;

                // Integrate position
                pos[i3] += burst.velocities[i3] * dt;
                pos[i3 + 1] += burst.velocities[i3 + 1] * dt;
                pos[i3 + 2] += burst.velocities[i3 + 2] * dt;
            }

            burst.points.geometry.attributes.position.needsUpdate = true;

            // Fade out globally based on oldest particle
            const maxAge = Math.max(...burst.ages);
            const maxLifetime = Math.max(...burst.lifetimes);
            burst.points.material.opacity = Math.max(0, 1 - (maxAge / maxLifetime));

            if (allDead) {
                this.scene.remove(burst.points);
                burst.points.geometry.dispose();
                burst.points.material.dispose();
                this.bursts.splice(b, 1);
            }
        }
    }

    /** Remove all active bursts immediately. */
    clear() {
        for (const burst of this.bursts) {
            this.scene.remove(burst.points);
            burst.points.geometry.dispose();
            burst.points.material.dispose();
        }
        this.bursts = [];
    }
}
