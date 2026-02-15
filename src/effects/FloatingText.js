import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Spawns canvas-based text sprites that float upward and fade out.
 * Used for power-up activation labels ("+3 Shots!", "BOOM!", etc.).
 */
export class FloatingText {
    constructor(scene) {
        this.scene = scene;
        this.sprites = [];
    }

    spawn(text, position, color = '#FFFFFF') {
        const F = CONFIG.FLOATING_TEXT;
        const canvas = document.createElement('canvas');
        canvas.width = F.CANVAS_SIZE;
        canvas.height = F.CANVAS_SIZE;
        const ctx = canvas.getContext('2d');

        ctx.font = `bold ${F.FONT_SIZE}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 4;
        ctx.strokeText(text, F.CANVAS_SIZE / 2, F.CANVAS_SIZE / 2);
        ctx.fillStyle = color;
        ctx.fillText(text, F.CANVAS_SIZE / 2, F.CANVAS_SIZE / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
        });
        const sprite = new THREE.Sprite(material);
        sprite.position.set(position.x, position.y + 0.5, position.z);
        sprite.scale.setScalar(1.5);
        this.scene.add(sprite);

        this.sprites.push({ sprite, startTime: Date.now(), startY: sprite.position.y });
    }

    update() {
        const now = Date.now();
        const F = CONFIG.FLOATING_TEXT;
        for (let i = this.sprites.length - 1; i >= 0; i--) {
            const s = this.sprites[i];
            const elapsed = now - s.startTime;
            const progress = elapsed / F.DURATION;

            if (progress >= 1) {
                this.scene.remove(s.sprite);
                s.sprite.material.map.dispose();
                s.sprite.material.dispose();
                this.sprites.splice(i, 1);
            } else {
                s.sprite.position.y = s.startY + progress * F.RISE_SPEED;
                s.sprite.material.opacity = 1 - progress * progress;
            }
        }
    }

    clear() {
        this.sprites.forEach(s => {
            this.scene.remove(s.sprite);
            s.sprite.material.map.dispose();
            s.sprite.material.dispose();
        });
        this.sprites = [];
    }
}
