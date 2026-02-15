import { CONFIG } from '../config.js';

/**
 * Game over overlay with level reached and restart button.
 */
export class GameOverScreen {
    constructor() {
        this.element = null;
    }

    show(level, onRestart) {
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.top = '50%';
        div.style.left = '50%';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = CONFIG.COLORS.UI_TEXT;
        div.style.textAlign = 'center';
        div.style.fontFamily = 'Arial, sans-serif';
        div.style.backgroundColor = CONFIG.COLORS.GAME_OVER_BG;
        div.style.padding = '20px';
        div.style.borderRadius = '10px';

        const title = document.createElement('div');
        title.style.fontSize = 'clamp(32px, 8vw, 48px)';
        title.style.marginBottom = '20px';
        title.textContent = 'Game Over!';

        const levelText = document.createElement('div');
        levelText.style.fontSize = 'clamp(18px, 4vw, 24px)';
        levelText.style.marginBottom = '30px';
        levelText.textContent = `Level reached: ${level}`;

        const btn = document.createElement('button');
        btn.textContent = 'Restart Game';
        btn.style.fontSize = 'clamp(16px, 3vw, 20px)';
        btn.style.padding = 'max(10px, 2vh) max(20px, 4vw)';
        btn.style.minWidth = '44px';
        btn.style.minHeight = '44px';
        btn.style.backgroundColor = CONFIG.COLORS.BUTTON_PRIMARY;
        btn.style.color = CONFIG.COLORS.BUTTON_TEXT;
        btn.style.border = 'none';
        btn.style.borderRadius = '5px';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'background-color 0.3s';
        btn.onmouseover = () => { btn.style.backgroundColor = CONFIG.COLORS.BUTTON_HOVER; };
        btn.onmouseout = () => { btn.style.backgroundColor = CONFIG.COLORS.BUTTON_PRIMARY; };
        btn.onclick = () => {
            this.hide();
            onRestart();
        };

        div.appendChild(title);
        div.appendChild(levelText);
        div.appendChild(btn);
        document.body.appendChild(div);
        this.element = div;
    }

    hide() {
        if (this.element) {
            document.body.removeChild(this.element);
            this.element = null;
        }
    }
}
