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

        this.scoreEl = document.createElement('div');
        this.scoreEl.style.fontSize = '1.2em';
        this.scoreEl.style.fontWeight = 'bold';
        this.levelEl = document.createElement('div');
        this.shotsEl = document.createElement('div');
        this.wallsEl = document.createElement('div');

        this.container.appendChild(this.scoreEl);
        this.container.appendChild(this.levelEl);
        this.container.appendChild(this.shotsEl);
        this.container.appendChild(this.wallsEl);
        document.body.appendChild(this.container);

        // Combo display (centered)
        this.comboEl = document.createElement('div');
        this.comboEl.style.cssText = `
            position: fixed; top: 30%; left: 50%;
            transform: translate(-50%, -50%) scale(0);
            font-family: Arial, sans-serif; font-weight: 900;
            font-size: clamp(36px, 10vw, 64px);
            text-align: center; pointer-events: none;
            opacity: 0; transition: transform 0.15s ease-out, opacity 0.4s;
            text-shadow: 0 0 12px currentColor;
        `;
        document.body.appendChild(this.comboEl);
        this._comboFadeTimer = null;
    }

    show() { this.container.style.display = ''; }
    hide() {
        this.container.style.display = 'none';
        this.hideCombo();
    }

    update(level, shotsRemaining, wallCount, score) {
        this.scoreEl.textContent = `Score: ${score}`;
        this.levelEl.textContent = `Level: ${level}`;
        this.shotsEl.textContent = `Shots: ${shotsRemaining}`;
        this.wallsEl.textContent = `Walls: ${wallCount}`;
    }

    showCombo(count, bonusPoints, color) {
        clearTimeout(this._comboFadeTimer);
        this.comboEl.style.color = color;
        this.comboEl.textContent = `${count}x COMBO!  +${bonusPoints}`;
        this.comboEl.style.opacity = '1';
        this.comboEl.style.transform = 'translate(-50%, -50%) scale(1.2)';
        requestAnimationFrame(() => {
            this.comboEl.style.transform = 'translate(-50%, -50%) scale(1)';
        });
        this._comboFadeTimer = setTimeout(() => this.hideCombo(), 1500);
    }

    hideCombo() {
        clearTimeout(this._comboFadeTimer);
        this.comboEl.style.opacity = '0';
        this.comboEl.style.transform = 'translate(-50%, -50%) scale(0)';
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
