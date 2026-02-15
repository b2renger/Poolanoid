import { CONFIG } from '../config.js';

/**
 * Head-up display: level, shots, wall count, and optional FPS counter.
 */
export class HUD {
    constructor() {
        this.fpsElement = null;
        this.fpsFrames = 0;
        this.fpsLastTime = performance.now();
        this.createElements();
    }

    createElements() {
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.top = 'calc(20px + env(safe-area-inset-top))';
        this.container.style.right = 'calc(20px + env(safe-area-inset-right))';
        this.container.style.color = CONFIG.COLORS.UI_TEXT;
        const baseFontSize = Math.min(28, Math.max(18, window.innerWidth / 30));
        this.container.style.fontSize = `${baseFontSize}px`;
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.textAlign = 'right';
        this.container.style.display = 'none';

        this.levelEl = document.createElement('div');
        this.shotsEl = document.createElement('div');
        this.wallsEl = document.createElement('div');

        this.container.appendChild(this.levelEl);
        this.container.appendChild(this.shotsEl);
        this.container.appendChild(this.wallsEl);
        document.body.appendChild(this.container);
    }

    show() { this.container.style.display = ''; }
    hide() { this.container.style.display = 'none'; }

    update(level, shotsRemaining, wallCount) {
        this.levelEl.textContent = `Level: ${level}`;
        this.shotsEl.textContent = `Shots: ${shotsRemaining}`;
        this.wallsEl.textContent = `Walls: ${wallCount}`;
    }

    createFPSCounter() {
        const el = document.createElement('div');
        el.id = 'fps-counter';
        el.style.cssText = `
            position: fixed; top: 4px; left: 4px;
            color: ${CONFIG.COLORS.FPS_COLOR};
            font: 14px monospace; z-index: 9999; pointer-events: none;
        `;
        document.body.appendChild(el);
        this.fpsElement = el;
    }

    updateFPS() {
        if (!this.fpsElement) return;
        this.fpsFrames++;
        const now = performance.now();
        if (now - this.fpsLastTime >= 1000) {
            this.fpsElement.textContent = `${this.fpsFrames} FPS`;
            this.fpsFrames = 0;
            this.fpsLastTime = now;
        }
    }
}
