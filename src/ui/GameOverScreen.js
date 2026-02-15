import { CONFIG } from '../config.js';

/**
 * Game over overlay with level reached, 3-initial entry, and continue button.
 */
export class GameOverScreen {
    constructor() {
        this.element = null;
    }

    show(level, score, isNewBest, onDone) {
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
        title.textContent = isNewBest ? 'New High Score!' : 'Game Over!';

        const scoreText = document.createElement('div');
        scoreText.style.fontSize = 'clamp(24px, 6vw, 36px)';
        scoreText.style.marginBottom = '8px';
        scoreText.style.fontWeight = 'bold';
        scoreText.textContent = `Score: ${score}`;

        const levelText = document.createElement('div');
        levelText.style.fontSize = 'clamp(14px, 3vw, 18px)';
        levelText.style.marginBottom = '24px';
        levelText.style.opacity = '0.7';
        levelText.textContent = `Level ${level}`;

        // ── Initials input ──
        const initialsLabel = document.createElement('div');
        initialsLabel.style.fontSize = 'clamp(13px, 3vw, 16px)';
        initialsLabel.style.marginBottom = '10px';
        initialsLabel.style.color = '#008BFF';
        initialsLabel.style.letterSpacing = '0.15em';
        initialsLabel.textContent = 'ENTER YOUR INITIALS';

        const initialsRow = document.createElement('div');
        initialsRow.style.display = 'flex';
        initialsRow.style.justifyContent = 'center';
        initialsRow.style.gap = '8px';
        initialsRow.style.marginBottom = '24px';

        const inputs = [];
        for (let i = 0; i < 3; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.style.width = 'clamp(36px, 10vw, 48px)';
            input.style.height = 'clamp(42px, 12vw, 56px)';
            input.style.fontSize = 'clamp(22px, 6vw, 32px)';
            input.style.textAlign = 'center';
            input.style.textTransform = 'uppercase';
            input.style.fontFamily = 'monospace';
            input.style.fontWeight = '700';
            input.style.background = 'rgba(0, 0, 0, 0.3)';
            input.style.border = '2px solid #008BFF';
            input.style.borderRadius = '6px';
            input.style.color = CONFIG.COLORS.UI_TEXT;
            input.style.outline = 'none';
            input.style.caretColor = 'transparent';
            input.autocomplete = 'off';

            input.addEventListener('input', () => {
                input.value = input.value.replace(/[^A-Za-z]/g, '').toUpperCase();
                if (input.value && i < 2) inputs[i + 1].focus();
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && i > 0) {
                    inputs[i - 1].focus();
                }
            });

            inputs.push(input);
            initialsRow.appendChild(input);
        }

        // ── Continue button ──
        const btn = document.createElement('button');
        btn.textContent = 'OK';
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
            const initials = inputs.map(i => i.value || 'A').join('');
            this.hide();
            onDone(initials);
        };

        div.appendChild(title);
        div.appendChild(scoreText);
        div.appendChild(levelText);
        div.appendChild(initialsLabel);
        div.appendChild(initialsRow);
        div.appendChild(btn);
        document.body.appendChild(div);
        this.element = div;

        // Auto-focus first input
        setTimeout(() => inputs[0].focus(), 100);
    }

    hide() {
        if (this.element) {
            document.body.removeChild(this.element);
            this.element = null;
        }
    }
}
