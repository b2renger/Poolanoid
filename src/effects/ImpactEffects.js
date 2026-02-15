import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Manages impact ring effects spawned when the ball hits a breakable wall.
 */
export class ImpactEffects {
    constructor(scene) {
        this.scene = scene;
        this.effects = [];
    }

    spawn(position) {
        const E = CONFIG.EFFECTS;
        const geometry = new THREE.RingGeometry(E.IMPACT_RING_INNER_RADIUS, E.IMPACT_RING_OUTER_RADIUS, E.IMPACT_RING_SEGMENTS);
        const material = new THREE.MeshBasicMaterial({
            color: CONFIG.COLORS.IMPACT_RING,
            transparent: true,
            opacity: E.IMPACT_RING_OPACITY,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const ring = new THREE.Mesh(geometry, material);
        ring.position.copy(position);
        ring.rotation.x = -Math.PI / 2;
        ring.scale.setScalar(E.IMPACT_SCALE_START);
        this.scene.add(ring);

        this.effects.push({ ring, startTime: Date.now(), duration: E.IMPACT_DURATION });
    }

    update() {
        const now = Date.now();
        const E = CONFIG.EFFECTS;
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const eff = this.effects[i];
            const progress = Math.min((now - eff.startTime) / eff.duration, 1);

            eff.ring.scale.setScalar(E.IMPACT_SCALE_START + progress * E.IMPACT_SCALE_RANGE);
            eff.ring.material.opacity = E.IMPACT_RING_OPACITY * (1 - progress);

            if (progress >= 1) {
                this.scene.remove(eff.ring);
                eff.ring.geometry.dispose();
                eff.ring.material.dispose();
                this.effects.splice(i, 1);
            }
        }
    }

    clear() {
        this.effects.forEach(eff => {
            this.scene.remove(eff.ring);
            eff.ring.geometry.dispose();
            eff.ring.material.dispose();
        });
        this.effects = [];
    }
}
