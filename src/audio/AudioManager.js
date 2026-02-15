import { CONFIG } from '../config.js';

/**
 * Pure Web Audio API synthesizer — no external files or libraries.
 * Initializes AudioContext on first user interaction (mobile autoplay policy).
 */
export class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.15;
        this._initialized = false;
    }

    /** Lazily create AudioContext on first user gesture. */
    init() {
        if (this._initialized) return;
        this._initialized = true;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio not supported');
            this.enabled = false;
        }
    }

    /** Resume context if suspended (required by mobile browsers). */
    _resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // ── E major scale frequencies (E3 → E6) ──

    static SCALE = [
        164.81, 184.99, 207.65, 220.00, 246.94, 277.18, 311.13, // E3–D#4
        329.63, 369.99, 415.30, 440.00, 493.88, 554.37, 622.25, // E4–D#5
        659.26, 739.99, 830.61, 880.00, 987.77, 1108.73, 1244.51, // E5–D#6
        1318.51 // E6
    ];

    // ── Public API ──

    play(name, opts = {}) {
        if (!this.enabled || !this.ctx) return;
        this._resume();
        const fn = this['_' + name];
        if (fn) fn.call(this, opts);
    }

    // ── Sound implementations ──

    /** Random E-major note, sine, fast decay */
    _wallBreak() {
        const A = CONFIG.AUDIO;
        const freq = AudioManager.SCALE[Math.floor(Math.random() * AudioManager.SCALE.length)];
        this._tone(freq, 'sine', A.WALL_BREAK_DURATION, A.WALL_BREAK_GAIN * this.volume);
    }

    /** Same as wall break but pitch rises with combo count */
    _comboHit({ combo = 1 }) {
        const A = CONFIG.AUDIO;
        // Pick from upper portion of scale as combo rises
        const minIdx = Math.min(combo * 2, AudioManager.SCALE.length - 4);
        const idx = minIdx + Math.floor(Math.random() * (AudioManager.SCALE.length - minIdx));
        const freq = AudioManager.SCALE[idx];
        this._tone(freq, 'triangle', A.WALL_BREAK_DURATION, A.COMBO_HIT_GAIN * this.volume);
    }

    /** Low percussive thud — filtered noise burst */
    _shoot() {
        const A = CONFIG.AUDIO;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const dur = A.SHOOT_DURATION;

        // White noise buffer
        const bufferSize = Math.ceil(ctx.sampleRate * dur);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        // Low-pass filter for thud character
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(A.SHOOT_FILTER_FREQ, now);
        filter.frequency.exponentialRampToValueAtTime(60, now + dur);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(A.SHOOT_GAIN * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start(now);
        source.stop(now + dur);
    }

    /** Soft click — very short high sine ping */
    _cushionBounce() {
        const A = CONFIG.AUDIO;
        this._tone(A.CUSHION_FREQ, 'sine', A.CUSHION_DURATION, A.CUSHION_GAIN * this.volume);
    }

    /** Ascending arpeggio — 4 notes up the E major scale */
    _levelComplete() {
        const A = CONFIG.AUDIO;
        const baseIdx = 7; // E4
        const stagger = A.ARPEGGIO_STAGGER;
        for (let i = 0; i < 4; i++) {
            const freq = AudioManager.SCALE[baseIdx + i * 2]; // skip every other note
            this._toneAt(freq, 'triangle', A.ARPEGGIO_NOTE_DURATION,
                A.ARPEGGIO_GAIN * this.volume, this.ctx.currentTime + i * stagger);
        }
    }

    /** Descending minor phrase — 3 notes, slower decay */
    _gameOver() {
        const A = CONFIG.AUDIO;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        // E4 → C4 → A3  (minor feel: drop a minor third, then a minor third)
        const notes = [329.63, 261.63, 220.00];
        const stagger = A.GAME_OVER_STAGGER;
        for (let i = 0; i < notes.length; i++) {
            this._toneAt(notes[i], 'sine', A.GAME_OVER_NOTE_DURATION,
                A.GAME_OVER_GAIN * this.volume, now + i * stagger);
        }
    }

    // ── Primitives ──

    /** Play a single oscillator tone with fast attack and exponential decay. */
    _tone(freq, type, duration, gain) {
        this._toneAt(freq, type, duration, gain, this.ctx.currentTime);
    }

    _toneAt(freq, type, duration, gain, startTime) {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001, startTime);
        g.gain.linearRampToValueAtTime(gain, startTime + 0.005); // 5ms attack
        g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
    }
}
