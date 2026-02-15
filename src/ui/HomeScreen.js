/**
 * Neon-themed home screen with title, high scores, orientation selector, and play button.
 */
export class HomeScreen {
    constructor(storage) {
        this.storage = storage;
        /** @type {Function|null} Called when the user taps Play. */
        this.onPlay = null;
        /** @type {Function|null} Called when the user toggles sound. */
        this.onSoundToggle = null;
        this.selectedOrientation = storage.getSettings().orientation || 'landscape';
        this.soundEnabled = storage.getSettings().sound !== false; // default on
        this.element = null;
        this.scoresContainer = null;
        this._create();
    }

    _create() {
        const el = document.createElement('div');
        el.className = 'home-screen';

        // ── Title ──
        const title = document.createElement('h1');
        title.className = 'neon-title';
        title.textContent = 'POOLANOID';

        // ── High Scores ──
        const scoresSection = document.createElement('div');
        scoresSection.className = 'home-scores';

        const scoresHeading = document.createElement('div');
        scoresHeading.className = 'home-scores-heading';
        scoresHeading.textContent = 'HIGH SCORES';

        this.scoresContainer = document.createElement('div');
        this.scoresContainer.className = 'home-scores-list';
        this._renderScores();

        scoresSection.appendChild(scoresHeading);
        scoresSection.appendChild(this.scoresContainer);

        // ── Orientation Selector ──
        const orientSection = document.createElement('div');
        orientSection.className = 'home-orient';

        const orientLabel = document.createElement('div');
        orientLabel.className = 'home-orient-label';
        orientLabel.textContent = 'ORIENTATION';

        const orientBtns = document.createElement('div');
        orientBtns.className = 'home-orient-btns';

        this.portraitBtn = this._createOrientBtn('portrait', '▯', 'Portrait', orientBtns);
        this.landscapeBtn = this._createOrientBtn('landscape', '▭', 'Landscape', orientBtns);
        this._updateOrientBtns();

        orientSection.appendChild(orientLabel);
        orientSection.appendChild(orientBtns);

        // ── Sound Toggle ──
        const soundSection = document.createElement('div');
        soundSection.className = 'home-sound';

        const soundLabel = document.createElement('div');
        soundLabel.className = 'home-orient-label';
        soundLabel.textContent = 'SOUND';

        this.soundBtn = document.createElement('button');
        this.soundBtn.className = 'home-orient-option active';
        this._updateSoundBtn();
        this.soundBtn.addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            this.storage.saveSettings({ sound: this.soundEnabled });
            this._updateSoundBtn();
            if (this.onSoundToggle) this.onSoundToggle(this.soundEnabled);
        });

        soundSection.appendChild(soundLabel);
        soundSection.appendChild(this.soundBtn);

        // ── How to Play ──
        const tutorial = document.createElement('div');
        tutorial.className = 'home-tutorial';

        const tutorialScene = document.createElement('div');
        tutorialScene.className = 'tutorial-scene';

        const ball = document.createElement('div');
        ball.className = 'tutorial-ball';

        const aimLine = document.createElement('div');
        aimLine.className = 'tutorial-aim';

        const finger = document.createElement('div');
        finger.className = 'tutorial-finger';

        const ghost = document.createElement('div');
        ghost.className = 'tutorial-ghost';

        tutorialScene.appendChild(aimLine);
        tutorialScene.appendChild(ball);
        tutorialScene.appendChild(finger);
        tutorialScene.appendChild(ghost);

        const tutorialLabel = document.createElement('div');
        tutorialLabel.className = 'tutorial-label';
        tutorialLabel.textContent = 'DRAG TO AIM, RELEASE TO SHOOT \u2014 DESTROY ALL WALLS';

        tutorial.appendChild(tutorialScene);
        tutorial.appendChild(tutorialLabel);

        // ── Play Button ──
        const playBtn = document.createElement('button');
        playBtn.className = 'neon-play-btn';
        playBtn.textContent = 'PLAY';
        playBtn.addEventListener('click', () => this._onPlayClick());

        // ── Assemble ──
        el.appendChild(title);
        el.appendChild(scoresSection);
        el.appendChild(orientSection);
        el.appendChild(soundSection);
        el.appendChild(tutorial);
        el.appendChild(playBtn);
        document.body.appendChild(el);
        this.element = el;
    }

    _createOrientBtn(orientation, icon, label, parent) {
        const btn = document.createElement('button');
        btn.className = 'home-orient-option';
        btn.dataset.orient = orientation;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'orient-icon';
        iconSpan.textContent = icon;

        const labelSpan = document.createElement('span');
        labelSpan.className = 'orient-label';
        labelSpan.textContent = label;

        btn.appendChild(iconSpan);
        btn.appendChild(labelSpan);
        btn.addEventListener('click', () => {
            this.selectedOrientation = orientation;
            this.storage.saveSettings({ orientation });
            this._updateOrientBtns();
        });
        parent.appendChild(btn);
        return btn;
    }

    _updateOrientBtns() {
        this.portraitBtn.classList.toggle('active', this.selectedOrientation === 'portrait');
        this.landscapeBtn.classList.toggle('active', this.selectedOrientation === 'landscape');
    }

    _updateSoundBtn() {
        this.soundBtn.textContent = this.soundEnabled ? '🔊 ON' : '🔇 OFF';
        this.soundBtn.classList.toggle('active', this.soundEnabled);
    }

    _renderScores() {
        const scores = this.storage.getAllHighScores().slice(0, 3);
        this.scoresContainer.innerHTML = '';

        if (scores.length === 0) {
            const p = document.createElement('div');
            p.className = 'home-no-scores';
            p.textContent = 'No scores yet';
            this.scoresContainer.appendChild(p);
            return;
        }

        scores.forEach((s, i) => {
            const row = document.createElement('div');
            row.className = 'home-score-row';

            const rank = document.createElement('span');
            rank.className = 'score-rank';
            rank.textContent = `${i + 1}.`;

            const initials = document.createElement('span');
            initials.className = 'score-initials';
            initials.textContent = s.initials || '---';

            const scoreVal = document.createElement('span');
            scoreVal.className = 'score-value';
            scoreVal.textContent = s.score != null ? s.score : `Lvl ${s.level}`;

            const level = document.createElement('span');
            level.className = 'score-level';
            level.textContent = `Lvl ${s.level}`;

            row.appendChild(rank);
            row.appendChild(initials);
            row.appendChild(scoreVal);
            row.appendChild(level);
            this.scoresContainer.appendChild(row);
        });
    }

    _onPlayClick() {
        this._tryLockOrientation();
        if (this.onPlay) this.onPlay();
    }

    _tryLockOrientation() {
        const api = screen.orientation;
        if (!api || !api.lock) return;

        const type = this.selectedOrientation === 'portrait' ? 'portrait-primary' : 'landscape-primary';
        api.lock(type).catch(() => { /* not supported or not fullscreen */ });
    }

    show() { this.element.style.display = 'flex'; }
    hide() { this.element.style.display = 'none'; }
    refresh() { this._renderScores(); }
}
