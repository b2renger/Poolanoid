import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Manages impact ring effects and flash lights spawned when the ball hits a breakable wall.
 */
export class ImpactEffects {
    constructor(scene) {
        this.scene = scene;
        this.effects = [];
        this.flashes = [];
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

    /** Spawn a brief point light flash at impact position with wall color. */
    flash(position, color) {
        const E = CONFIG.EFFECTS;
        const light = new THREE.PointLight(color, E.FLASH_INTENSITY, E.FLASH_DISTANCE);
        light.position.copy(position);
        light.position.y += 0.3; // slightly above impact
        this.scene.add(light);
        this.flashes.push({ light, startTime: Date.now(), duration: E.FLASH_DURATION, intensity: E.FLASH_INTENSITY });
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

        // Fade out flash lights
        for (let i = this.flashes.length - 1; i >= 0; i--) {
            const f = this.flashes[i];
            const progress = (now - f.startTime) / f.duration;
            if (progress >= 1) {
                this.scene.remove(f.light);
                f.light.dispose();
                this.flashes.splice(i, 1);
            } else {
                f.light.intensity = f.intensity * (1 - progress);
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
        this.flashes.forEach(f => {
            this.scene.remove(f.light);
            f.light.dispose();
        });
        this.flashes = [];
    }
}
