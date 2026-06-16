/* ============================================================
 *  GAME.Audio — Synthesised SFX & Music (Web Audio API)
 *  Fight the Monster — Brunei Legends Edition
 * ============================================================
 *  All sounds are generated at runtime — no external files.
 *  SFX use short oscillator + gain envelopes.
 *  Music uses repeating pentatonic / gamelan-inspired patterns.
 * ============================================================ */

window.GAME = window.GAME || {};

GAME.Audio = {

    /* ---- state ------------------------------------------------ */

    ctx: null,              // AudioContext
    musicGain: null,        // GainNode — master music volume
    sfxGain: null,          // GainNode — master SFX volume
    musicPlaying: false,
    _musicIntervals: [],    // setInterval IDs for the music loop
    _noiseBuffer: null,     // cached white-noise AudioBuffer

    /* ---- public API ------------------------------------------- */

    /**
     * Initialise the audio system.  Safe to call multiple times.
     */
    init: function () {
        if (this.ctx) return;

        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        // Master gain nodes
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.25;
        this.musicGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.45;
        this.sfxGain.connect(this.ctx.destination);

        // Pre-build a 1-second white-noise buffer (reused by many SFX)
        this._noiseBuffer = this._createNoiseBuffer(1.0);
    },

    /**
     * Play a named sound effect.
     * @param {string} soundName
     */
    play: function (soundName) {
        if (!this.ctx) this.init();

        // Resume context if suspended (browser autoplay policy)
        if (this.ctx.state === 'suspended') this.ctx.resume();

        var fn = this._sfx[soundName];
        if (fn) fn.call(this);
    },

    /**
     * Start procedural music for the given level.
     * @param {number} levelIndex  0-4
     */
    playMusic: function (levelIndex) {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.stopMusic();

        this.musicPlaying = true;

        var self = this;
        var musicFn = this._music[levelIndex] || this._music[0];
        musicFn.call(this);               // play first iteration immediately

        // Loop every ~8 bars  (tempo ≈ 100 BPM → bar = 2.4 s → 8 bars ≈ 19.2 s)
        var loopMs = 19200;
        var id = setInterval(function () {
            if (!self.musicPlaying) return;
            musicFn.call(self);
        }, loopMs);
        this._musicIntervals.push(id);
    },

    /**
     * Stop all music loops and ramp down volume.
     */
    stopMusic: function () {
        this.musicPlaying = false;
        for (var i = 0; i < this._musicIntervals.length; i++) {
            clearInterval(this._musicIntervals[i]);
        }
        this._musicIntervals = [];

        if (this.musicGain) {
            this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, this.ctx.currentTime);
            this.musicGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);

            var self = this;
            setTimeout(function () {
                if (self.musicGain) self.musicGain.gain.value = 0.25;
            }, 350);
        }
    },

    /* ===========================================================
     *  INTERNAL — SFX definitions
     * =========================================================== */

    _sfx: {

        /* --- slash: short metallic sweep (sawtooth 200→800 Hz, 0.1 s) --- */
        slash: function () {
            var t = this.ctx.currentTime;
            var osc = this.ctx.createOscillator();
            var gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            osc.connect(gain).connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.13);
        },

        /* --- fireball: whooshing flame (noise + sine 300→100 Hz, 0.3 s) --- */
        fireball: function () {
            var t = this.ctx.currentTime;

            // Noise component
            var nSrc = this._playNoise(t, 0.3, 0.2);

            // Sine sweep
            var osc = this.ctx.createOscillator();
            var gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.3);
            gain.gain.setValueAtTime(0.35, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
            osc.connect(gain).connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.33);
        },

        /* --- hit: impact thud (sine 150 Hz + noise, 0.08 s) --- */
        hit: function () {
            var t = this.ctx.currentTime;

            // Thud body
            var osc = this.ctx.createOscillator();
            var gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(50, t + 0.08);
            gain.gain.setValueAtTime(0.5, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            osc.connect(gain).connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.11);

            // Noise crack
            this._playNoise(t, 0.06, 0.25);
        },

        /* --- explosion: bass boom (sine 80→20 Hz + noise, 0.5 s) --- */
        explosion: function () {
            var t = this.ctx.currentTime;

            var osc = this.ctx.createOscillator();
            var gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(80, t);
            osc.frequency.exponentialRampToValueAtTime(20, t + 0.5);
            gain.gain.setValueAtTime(0.6, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
            osc.connect(gain).connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.56);

            this._playNoise(t, 0.4, 0.35);
        },

        /* --- powerup: ascending chime (sine 400→800→1200 Hz, 0.4 s) --- */
        powerup: function () {
            var t = this.ctx.currentTime;
            var freqs = [400, 800, 1200];
            for (var i = 0; i < freqs.length; i++) {
                var osc = this.ctx.createOscillator();
                var gain = this.ctx.createGain();
                var start = t + i * 0.12;
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freqs[i], start);
                gain.gain.setValueAtTime(0.3, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
                osc.connect(gain).connect(this.sfxGain);
                osc.start(start);
                osc.stop(start + 0.15);
            }
        },

        /* --- dodge: quick whoosh (band-passed noise, 0.15 s) --- */
        dodge: function () {
            var t = this.ctx.currentTime;
            var src = this.ctx.createBufferSource();
            src.buffer = this._noiseBuffer;
            var bp = this.ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(2000, t);
            bp.frequency.exponentialRampToValueAtTime(500, t + 0.15);
            bp.Q.value = 2;
            var gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.35, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
            src.connect(bp).connect(gain).connect(this.sfxGain);
            src.start(t);
            src.stop(t + 0.18);
        },

        /* --- heal: gentle shimmer (sine 600→900 Hz with vibrato, 0.5 s) --- */
        heal: function () {
            var t = this.ctx.currentTime;

            var osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, t);
            osc.frequency.linearRampToValueAtTime(900, t + 0.5);

            // Vibrato via LFO
            var lfo = this.ctx.createOscillator();
            var lfoGain = this.ctx.createGain();
            lfo.type = 'sine';
            lfo.frequency.value = 8;
            lfoGain.gain.value = 30;
            lfo.connect(lfoGain).connect(osc.frequency);
            lfo.start(t);
            lfo.stop(t + 0.55);

            var gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.001, t);
            gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
            gain.gain.linearRampToValueAtTime(0.25, t + 0.35);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.52);
            osc.connect(gain).connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.55);
        },

        /* --- bossdeath: dramatic descend (sine 400→40 Hz + harmonics, 1.0 s) --- */
        bossdeath: function () {
            var t = this.ctx.currentTime;

            // Fundamental sweep
            var osc1 = this.ctx.createOscillator();
            var g1 = this.ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(400, t);
            osc1.frequency.exponentialRampToValueAtTime(40, t + 1.0);
            g1.gain.setValueAtTime(0.5, t);
            g1.gain.exponentialRampToValueAtTime(0.001, t + 1.05);
            osc1.connect(g1).connect(this.sfxGain);
            osc1.start(t);
            osc1.stop(t + 1.1);

            // Harmonic layer (square, octave up)
            var osc2 = this.ctx.createOscillator();
            var g2 = this.ctx.createGain();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(800, t);
            osc2.frequency.exponentialRampToValueAtTime(80, t + 1.0);
            g2.gain.setValueAtTime(0.15, t);
            g2.gain.exponentialRampToValueAtTime(0.001, t + 1.05);
            osc2.connect(g2).connect(this.sfxGain);
            osc2.start(t);
            osc2.stop(t + 1.1);

            // Noise rumble
            this._playNoise(t, 0.8, 0.25);
        },

        /* --- death: sad descend (sine 300→80 Hz, 0.8 s) --- */
        death: function () {
            var t = this.ctx.currentTime;
            var osc = this.ctx.createOscillator();
            var gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, t);
            osc.frequency.exponentialRampToValueAtTime(80, t + 0.8);
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.linearRampToValueAtTime(0.35, t + 0.4);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
            osc.connect(gain).connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.9);
        },

        /* --- combo: quick ding (sine 1000 Hz, 0.05 s) --- */
        combo: function () {
            var t = this.ctx.currentTime;
            var osc = this.ctx.createOscillator();
            var gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 1000;
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
            osc.connect(gain).connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.07);
        },

        /* --- levelup: triumphant arpeggio C–E–G–C (0.8 s) --- */
        levelup: function () {
            var t = this.ctx.currentTime;
            // C4=261.6  E4=329.6  G4=392.0  C5=523.3
            var freqs = [261.6, 329.6, 392.0, 523.3];
            for (var i = 0; i < freqs.length; i++) {
                var osc = this.ctx.createOscillator();
                var gain = this.ctx.createGain();
                var start = t + i * 0.18;
                osc.type = 'sine';
                osc.frequency.value = freqs[i];
                gain.gain.setValueAtTime(0.001, start);
                gain.gain.linearRampToValueAtTime(0.35, start + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
                osc.connect(gain).connect(this.sfxGain);
                osc.start(start);
                osc.stop(start + 0.25);
            }
        },

        /* --- click: UI click (sine 800 Hz, 0.03 s) --- */
        click: function () {
            var t = this.ctx.currentTime;
            var osc = this.ctx.createOscillator();
            var gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 800;
            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
            osc.connect(gain).connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.05);
        }
    },

    /* ===========================================================
     *  INTERNAL — Music generators (one per level)
     * =========================================================== */

    _music: {

        /* ---- Level 0  Kampong Ayer: calm water, gentle bells, key of C ---- */
        0: function () {
            var t = this.ctx.currentTime;
            // Pentatonic C scale: C4 D4 E4 G4 A4
            var notes = [261.6, 293.7, 329.6, 392.0, 440.0];
            // 8-bar pattern, each note ~2.4s apart (100 BPM, 1 bar = 2.4s)
            var pattern = [0, 2, 4, 3, 1, 0, 3, 2]; // indices into notes
            var barLen = 2.4;

            for (var i = 0; i < pattern.length; i++) {
                this._musicBell(t + i * barLen, notes[pattern[i]], 2.0, 0.12);
                // Sub-bass drone on C3
                if (i % 2 === 0) {
                    this._musicDrone(t + i * barLen, 130.8, barLen * 2, 0.06);
                }
            }
        },

        /* ---- Level 1  Tasek Merimbun: mysterious, minor key, drones ---- */
        1: function () {
            var t = this.ctx.currentTime;
            // A minor pentatonic: A3 C4 D4 E4 G4
            var notes = [220.0, 261.6, 293.7, 329.6, 392.0];
            var pattern = [0, 3, 1, 4, 2, 0, 1, 3];
            var barLen = 2.4;

            for (var i = 0; i < pattern.length; i++) {
                this._musicBell(t + i * barLen, notes[pattern[i]], 2.2, 0.09);
                // Continuous low drone on A2
                if (i % 4 === 0) {
                    this._musicDrone(t + i * barLen, 110.0, barLen * 4, 0.07);
                }
            }
        },

        /* ---- Level 2  Bukit Ambog: tense, rhythmic percussion ---- */
        2: function () {
            var t = this.ctx.currentTime;
            var barLen = 2.4;
            // D minor pentatonic: D4 F4 G4 A4 C5
            var notes = [293.7, 349.2, 392.0, 440.0, 523.3];
            var pattern = [0, 2, 1, 3, 0, 4, 2, 1];

            for (var i = 0; i < pattern.length; i++) {
                // Metallic bell hit
                this._musicBell(t + i * barLen, notes[pattern[i]], 1.6, 0.14);

                // Rhythmic percussion: 4 hits per bar
                for (var h = 0; h < 4; h++) {
                    this._musicPerc(t + i * barLen + h * 0.6, 0.08);
                }
            }
        },

        /* ---- Level 3  Mosque: peaceful but dramatic, sustained chords ---- */
        3: function () {
            var t = this.ctx.currentTime;
            var barLen = 2.4;
            // F major pentatonic: F4 G4 A4 C5 D5
            var notes = [349.2, 392.0, 440.0, 523.3, 587.3];
            var chords = [[0,2,4], [1,3,4], [0,2,3], [1,2,4], [0,3,4], [1,2,3], [0,2,4], [1,3,4]];

            for (var i = 0; i < chords.length; i++) {
                var chord = chords[i];
                for (var c = 0; c < chord.length; c++) {
                    this._musicBell(t + i * barLen, notes[chord[c]], 2.2, 0.07);
                }
                // Gentle bass
                this._musicDrone(t + i * barLen, 174.6, barLen, 0.05);
            }
        },

        /* ---- Level 4  Istana: epic, full arrangement, heroic theme ---- */
        4: function () {
            var t = this.ctx.currentTime;
            var barLen = 2.4;
            // C major: C4 E4 G4 B4 C5 D5 E5
            var notes = [261.6, 329.6, 392.0, 493.9, 523.3, 587.3, 659.3];
            var melody = [0, 2, 4, 6, 5, 3, 1, 4];

            for (var i = 0; i < melody.length; i++) {
                // Bright bell melody
                this._musicBell(t + i * barLen, notes[melody[i]], 1.8, 0.16);

                // Heroic bass octaves
                this._musicDrone(t + i * barLen, 130.8, barLen, 0.08);

                // Rhythmic drive: 3 hits per bar (triplet feel)
                for (var h = 0; h < 3; h++) {
                    this._musicPerc(t + i * barLen + h * 0.8, 0.06);
                }

                // Harmonic pad (fifth)
                if (i % 2 === 0) {
                    this._musicBell(t + i * barLen + 0.05, notes[melody[i]] * 1.5, 2.0, 0.06);
                }
            }
        }
    },

    /* ===========================================================
     *  INTERNAL — Helpers
     * =========================================================== */

    /**
     * Create a white-noise AudioBuffer.
     * @param {number} seconds  duration
     * @returns {AudioBuffer}
     */
    _createNoiseBuffer: function (seconds) {
        var sr = this.ctx.sampleRate;
        var len = sr * seconds;
        var buf = this.ctx.createBuffer(1, len, sr);
        var data = buf.getChannelData(0);
        for (var i = 0; i < len; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buf;
    },

    /**
     * Play a burst of white noise through the SFX bus.
     * @param {number} when      AudioContext time
     * @param {number} duration  seconds
     * @param {number} volume    0-1
     */
    _playNoise: function (when, duration, volume) {
        var src = this.ctx.createBufferSource();
        src.buffer = this._noiseBuffer;
        var gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, when);
        gain.gain.exponentialRampToValueAtTime(0.001, when + duration + 0.02);
        src.connect(gain).connect(this.sfxGain);
        src.start(when);
        src.stop(when + duration + 0.03);
        return src;
    },

    /**
     * Play a gamelan-style metallic bell tone into the music bus.
     * Uses sine + square for a bright, slightly metallic timbre.
     * @param {number} when     AudioContext time
     * @param {number} freq     Hz
     * @param {number} dur      seconds
     * @param {number} vol      0-1
     */
    _musicBell: function (when, freq, dur, vol) {
        // Sine body
        var osc1 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = freq;

        // Square shimmer (softer, slightly detuned)
        var osc2 = this.ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.value = freq * 2.01; // octave + slight detune for metallic feel

        var g1 = this.ctx.createGain();
        g1.gain.setValueAtTime(vol, when);
        g1.gain.exponentialRampToValueAtTime(vol * 0.5, when + 0.05);
        g1.gain.exponentialRampToValueAtTime(0.001, when + dur);

        var g2 = this.ctx.createGain();
        g2.gain.setValueAtTime(vol * 0.15, when);
        g2.gain.exponentialRampToValueAtTime(0.001, when + dur * 0.6);

        osc1.connect(g1).connect(this.musicGain);
        osc2.connect(g2).connect(this.musicGain);

        osc1.start(when);
        osc1.stop(when + dur + 0.05);
        osc2.start(when);
        osc2.stop(when + dur * 0.6 + 0.05);
    },

    /**
     * Play a low sustained drone tone into the music bus.
     * @param {number} when  AudioContext time
     * @param {number} freq  Hz
     * @param {number} dur   seconds
     * @param {number} vol   0-1
     */
    _musicDrone: function (when, freq, dur, vol) {
        var osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        var gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, when);
        gain.gain.linearRampToValueAtTime(vol, when + 0.3);
        gain.gain.setValueAtTime(vol, when + dur - 0.3);
        gain.gain.linearRampToValueAtTime(0.001, when + dur);

        osc.connect(gain).connect(this.musicGain);
        osc.start(when);
        osc.stop(when + dur + 0.05);
    },

    /**
     * Play a short percussive noise hit into the music bus.
     * @param {number} when  AudioContext time
     * @param {number} vol   0-1
     */
    _musicPerc: function (when, vol) {
        var src = this.ctx.createBufferSource();
        src.buffer = this._noiseBuffer;

        var bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 800;
        bp.Q.value = 3;

        var gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, when);
        gain.gain.exponentialRampToValueAtTime(0.001, when + 0.08);

        src.connect(bp).connect(gain).connect(this.musicGain);
        src.start(when);
        src.stop(when + 0.1);
    }
};
