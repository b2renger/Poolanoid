const STORAGE_KEY = 'poolanoid_save';

/**
 * Persists high scores and user settings to localStorage.
 */
export class StorageManager {
    constructor() {
        this.data = this._load();
    }

    saveHighScore(score, level, initials) {
        if (!this.data.highScores) this.data.highScores = [];

        this.data.highScores.push({
            initials: (initials || 'AAA').toUpperCase().slice(0, 3),
            score,
            level,
            date: new Date().toISOString()
        });

        this.data.highScores.sort((a, b) => b.score - a.score || b.level - a.level);
        this.data.highScores = this.data.highScores.slice(0, 3);

        this._persist();
    }

    getHighScore() {
        const scores = this.data.highScores;
        return (scores && scores.length > 0) ? scores[0] : null;
    }

    getAllHighScores() {
        return this.data.highScores || [];
    }

    saveSettings(settings) {
        this.data.settings = { ...this.data.settings, ...settings };
        this._persist();
    }

    getSettings() {
        return this.data.settings || {};
    }

    _persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (_) { /* quota or private browsing */ }
    }

    _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (_) {
            return {};
        }
    }
}
