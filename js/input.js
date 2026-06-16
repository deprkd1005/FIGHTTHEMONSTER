/* ============================================================
 *  GAME.Input — Keyboard & Mouse Input Manager
 *  Fight the Monster — Brunei Legends Edition
 * ============================================================
 *  Tracks keyboard state (WASD, Space, digit keys) and mouse
 *  state (position normalised to -1…1, click events).
 *  One-shot flags (clicked, rightClicked) are automatically
 *  cleared each frame via update().
 * ============================================================ */

window.GAME = window.GAME || {};

GAME.Input = {

    /* ---- state ------------------------------------------------ */

    keys: {
        w: false,
        a: false,
        s: false,
        d: false,
        space: false,
        digit1: false,
        digit2: false
    },

    mouse: {
        x: 0,          // normalised  -1 (left)  → +1 (right)
        y: 0,          // normalised  -1 (bottom) → +1 (top)
        clicked: false,       // left-button  — true for ONE frame
        rightClicked: false   // right-button — true for ONE frame
    },

    /* ---- internal --------------------------------------------- */

    _bound: false,   // prevent double-binding

    /* ---- public API ------------------------------------------- */

    /**
     * Bind all DOM event listeners.
     * Call once after the page is ready.
     */
    init: function () {
        if (this._bound) return;
        this._bound = true;

        var self = this;

        /* ---------- keyboard ---------- */

        window.addEventListener('keydown', function (e) {
            self._setKey(e.key, true);
        });

        window.addEventListener('keyup', function (e) {
            self._setKey(e.key, false);
        });

        /* ---------- mouse ---------- */

        window.addEventListener('mousedown', function (e) {
            if (e.button === 0) self.mouse.clicked = true;
            if (e.button === 2) self.mouse.rightClicked = true;
        });

        window.addEventListener('mouseup', function (/* e */) {
            // One-shot flags are cleared in update(), not here.
        });

        window.addEventListener('mousemove', function (e) {
            // Normalise to -1 … +1
            self.mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
            self.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        /* ---------- context-menu suppression ---------- */

        window.addEventListener('contextmenu', function (e) {
            e.preventDefault();
        });

        /* ---------- blur: release all keys when window loses focus ---------- */

        window.addEventListener('blur', function () {
            self.keys.w = false;
            self.keys.a = false;
            self.keys.s = false;
            self.keys.d = false;
            self.keys.space = false;
            self.keys.digit1 = false;
            self.keys.digit2 = false;
        });
    },

    /**
     * Call at the END of every frame to reset one-shot flags.
     */
    update: function () {
        this.mouse.clicked      = false;
        this.mouse.rightClicked = false;
    },

    /* ---- internal helpers ------------------------------------- */

    /**
     * Map a raw key string to the correct state property.
     * @param {string} key  - e.key value from the keyboard event
     * @param {boolean} val - true = pressed, false = released
     */
    _setKey: function (key, val) {
        switch (key.toLowerCase()) {
            case 'w': this.keys.w = val; break;
            case 'a': this.keys.a = val; break;
            case 's': this.keys.s = val; break;
            case 'd': this.keys.d = val; break;
            case ' ': this.keys.space  = val; break;
            case '1': this.keys.digit1 = val; break;
            case '2': this.keys.digit2 = val; break;
        }
    }
};
