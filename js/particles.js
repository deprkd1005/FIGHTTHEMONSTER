/* ============================================================
 *  GAME.Particles — Particle Effects System (Three.js)
 *  Fight the Monster — Brunei Legends Edition
 * ============================================================
 *  Uses THREE.Points with BufferGeometry and AdditiveBlending.
 *  Procedurally generates a circle texture for point sprites.
 *  Supports 10 effect types + floating damage numbers.
 * ============================================================ */

window.GAME = window.GAME || {};

GAME.Particles = {

    /* ---- state ------------------------------------------------ */

    systems: [],        // active ParticleSystem objects
    scene: null,
    camera: null,
    _texture: null,     // shared circle-sprite texture
    _damageNumbers: [],  // active floating damage-number DOM elements

    /* ---- public API ------------------------------------------- */

    /**
     * Initialise the particle system.
     * @param {THREE.Scene} scene
     * @param {THREE.Camera} camera  — needed for damage-number projection
     */
    init: function (scene, camera) {
        this.scene = scene;
        this.camera = camera || null;
        this._texture = this._createCircleTexture();
    },

    /**
     * Emit a particle effect at the given world position.
     * @param {string} type        'burst'|'trail'|'aura'|'heal'|'fire'|'ice'|'hit'|'death'|'gold'|'levelup'
     * @param {THREE.Vector3} position
     * @param {object} [options]   overrides: { color, count, speed, lifetime, size, spread }
     */
    emit: function (type, position, options) {
        if (!this.scene) return;

        var preset = this._presets[type];
        if (!preset) { console.warn('Particles: unknown type "' + type + '"'); return; }

        var opts = {};
        var keys = ['color', 'count', 'speed', 'lifetime', 'size', 'spread'];
        for (var k = 0; k < keys.length; k++) {
            var key = keys[k];
            opts[key] = (options && options[key] !== undefined) ? options[key] : preset[key];
        }

        var count = opts.count;
        var posArr    = new Float32Array(count * 3);
        var colorArr  = new Float32Array(count * 3);
        var sizeArr   = new Float32Array(count);
        var velocities = [];
        var lives      = [];

        var baseColor = new THREE.Color(opts.color);

        for (var i = 0; i < count; i++) {
            // Starting position (slight random spread)
            posArr[i * 3]     = position.x + (Math.random() - 0.5) * opts.spread;
            posArr[i * 3 + 1] = position.y + (Math.random() - 0.5) * opts.spread;
            posArr[i * 3 + 2] = position.z + (Math.random() - 0.5) * opts.spread;

            // Per-particle colour variation
            var hsl = { h: 0, s: 0, l: 0 };
            baseColor.getHSL(hsl);
            var variedColor = new THREE.Color();
            variedColor.setHSL(
                hsl.h + (Math.random() - 0.5) * 0.05,
                Math.min(1, Math.max(0, hsl.s + (Math.random() - 0.5) * 0.1)),
                Math.min(1, Math.max(0, hsl.l + (Math.random() - 0.5) * 0.15))
            );
            colorArr[i * 3]     = variedColor.r;
            colorArr[i * 3 + 1] = variedColor.g;
            colorArr[i * 3 + 2] = variedColor.b;

            sizeArr[i] = opts.size * (0.6 + Math.random() * 0.8);

            // Velocity — type-specific behaviour delegated to preset builder
            var vel = preset.velocity ? preset.velocity(i, count, opts) : {
                x: (Math.random() - 0.5) * opts.speed,
                y: (Math.random() - 0.5) * opts.speed,
                z: (Math.random() - 0.5) * opts.speed
            };
            velocities.push(vel);

            lives.push(opts.lifetime * (0.7 + Math.random() * 0.3));
        }

        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
        geo.setAttribute('color',    new THREE.BufferAttribute(colorArr, 3));
        geo.setAttribute('size',     new THREE.BufferAttribute(sizeArr, 1));

        var mat = new THREE.PointsMaterial({
            map: this._texture,
            size: opts.size,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        var points = new THREE.Points(geo, mat);
        points.frustumCulled = false;
        this.scene.add(points);

        var sys = {
            mesh: points,
            velocities: velocities,
            lives: lives,
            maxLives: lives.slice(),   // copy
            elapsed: 0,
            maxLifetime: opts.lifetime,
            origin: position.clone(),
            type: type
        };

        this.systems.push(sys);
    },

    /**
     * Create a floating damage number at a world position.
     * @param {THREE.Vector3} worldPos
     * @param {number|string} damage
     * @param {string} type  'normal'|'crit'|'heal'
     */
    createDamageNumber: function (worldPos, damage, type) {
        // Find or create the container
        var container = document.getElementById('damage-numbers-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'damage-numbers-container';
            container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:1000;';
            document.body.appendChild(container);
        }

        var el = document.createElement('div');
        el.textContent = (type === 'heal' ? '+' : '') + damage;

        // Styling based on type
        var color = '#ffffff';
        var fontSize = '20px';
        if (type === 'crit') { color = '#ff4444'; fontSize = '28px'; }
        if (type === 'heal') { color = '#44ff44'; fontSize = '22px'; }

        el.style.cssText = 'position:absolute;color:' + color +
            ';font-size:' + fontSize +
            ';font-family:Arial,sans-serif;font-weight:bold;' +
            'text-shadow:0 0 4px rgba(0,0,0,0.8),0 0 8px ' + color + ';' +
            'pointer-events:none;white-space:nowrap;transition:none;';

        container.appendChild(el);

        this._damageNumbers.push({
            el: el,
            worldPos: worldPos.clone(),
            elapsed: 0,
            lifetime: 1.0,
            offsetY: 0
        });
    },

    /**
     * Update all active particle systems and damage numbers.
     * Call once per frame.
     * @param {number} delta   time in seconds since last frame
     * @param {THREE.Camera} [camera]  optional override
     */
    update: function (delta, camera) {
        var cam = camera || this.camera;

        /* ---- particle systems ---- */
        for (var i = this.systems.length - 1; i >= 0; i--) {
            var sys = this.systems[i];
            sys.elapsed += delta;

            var posAttr = sys.mesh.geometry.getAttribute('position');
            var sizeAttr = sys.mesh.geometry.getAttribute('size');
            var positions = posAttr.array;
            var allDead = true;

            for (var p = 0; p < sys.lives.length; p++) {
                sys.lives[p] -= delta;
                if (sys.lives[p] <= 0) {
                    // Hide dead particles far away
                    sizeAttr.array[p] = 0;
                    continue;
                }
                allDead = false;

                var life01 = sys.lives[p] / sys.maxLives[p]; // 1→0 as particle ages

                // Move
                positions[p * 3]     += sys.velocities[p].x * delta;
                positions[p * 3 + 1] += sys.velocities[p].y * delta;
                positions[p * 3 + 2] += sys.velocities[p].z * delta;

                // Apply gravity for burst/death types
                if (sys.type === 'burst' || sys.type === 'death' || sys.type === 'hit') {
                    sys.velocities[p].y -= 3.0 * delta;
                }

                // Aura particles orbit around origin
                if (sys.type === 'aura') {
                    var angle = sys.elapsed * 2.0 + p * (Math.PI * 2 / sys.lives.length);
                    var radius = 0.8 + Math.sin(sys.elapsed * 1.5 + p) * 0.2;
                    positions[p * 3]     = sys.origin.x + Math.cos(angle) * radius;
                    positions[p * 3 + 1] = sys.origin.y + 0.5 + Math.sin(sys.elapsed * 3 + p * 0.5) * 0.3;
                    positions[p * 3 + 2] = sys.origin.z + Math.sin(angle) * radius;
                    // Aura particles don't die via normal life — set from outside
                }

                // Levelup particles spiral upward in helix
                if (sys.type === 'levelup') {
                    var la = sys.elapsed * 3.0 + p * (Math.PI * 2 / sys.lives.length);
                    var lr = 0.5 + sys.elapsed * 0.5;
                    positions[p * 3]     = sys.origin.x + Math.cos(la) * lr;
                    positions[p * 3 + 1] = sys.origin.y + sys.elapsed * 2.0 + p * 0.04;
                    positions[p * 3 + 2] = sys.origin.z + Math.sin(la) * lr;
                }

                // Shrink as particle ages
                sizeAttr.array[p] *= (0.95 + life01 * 0.05);
            }

            posAttr.needsUpdate = true;
            sizeAttr.needsUpdate = true;

            // Fade global opacity
            var globalLife = 1.0 - (sys.elapsed / (sys.maxLifetime * 1.2));
            sys.mesh.material.opacity = Math.max(0, globalLife);

            if (allDead || sys.elapsed > sys.maxLifetime * 1.5) {
                this.scene.remove(sys.mesh);
                sys.mesh.geometry.dispose();
                sys.mesh.material.dispose();
                this.systems.splice(i, 1);
            }
        }

        /* ---- damage numbers ---- */
        if (cam) {
            for (var d = this._damageNumbers.length - 1; d >= 0; d--) {
                var dn = this._damageNumbers[d];
                dn.elapsed += delta;
                dn.offsetY += delta * 60; // float upward in pixels

                if (dn.elapsed >= dn.lifetime) {
                    if (dn.el.parentNode) dn.el.parentNode.removeChild(dn.el);
                    this._damageNumbers.splice(d, 1);
                    continue;
                }

                // Project world position to screen
                var screenPos = dn.worldPos.clone();
                screenPos.project(cam);
                var sx = (screenPos.x *  0.5 + 0.5) * window.innerWidth;
                var sy = (screenPos.y * -0.5 + 0.5) * window.innerHeight;

                // Apply upward float and fade
                var alpha = 1.0 - (dn.elapsed / dn.lifetime);
                dn.el.style.left = sx + 'px';
                dn.el.style.top  = (sy - dn.offsetY) + 'px';
                dn.el.style.opacity = alpha;
                dn.el.style.transform = 'translate(-50%, -50%) scale(' + (0.8 + alpha * 0.4) + ')';
            }
        }
    },

    /**
     * Remove all particles and damage numbers from the scene.
     */
    clear: function () {
        for (var i = 0; i < this.systems.length; i++) {
            this.scene.remove(this.systems[i].mesh);
            this.systems[i].mesh.geometry.dispose();
            this.systems[i].mesh.material.dispose();
        }
        this.systems = [];

        for (var d = 0; d < this._damageNumbers.length; d++) {
            var el = this._damageNumbers[d].el;
            if (el.parentNode) el.parentNode.removeChild(el);
        }
        this._damageNumbers = [];
    },

    /* ===========================================================
     *  INTERNAL — Presets for each particle type
     * =========================================================== */

    _presets: {

        /* ---- burst: 25 particles exploding outward, 0.5 s ---- */
        burst: {
            color: 0xffaa33,
            count: 25,
            speed: 4.0,
            lifetime: 0.5,
            size: 0.25,
            spread: 0.1,
            velocity: function (i, count, opts) {
                var theta = Math.random() * Math.PI * 2;
                var phi   = Math.random() * Math.PI;
                var sp = opts.speed * (0.5 + Math.random() * 0.5);
                return {
                    x: Math.sin(phi) * Math.cos(theta) * sp,
                    y: Math.sin(phi) * Math.sin(theta) * sp * 0.8 + 1.0,
                    z: Math.cos(phi) * sp
                };
            }
        },

        /* ---- trail: 8 particles with slight spread, 0.3 s ---- */
        trail: {
            color: 0xffcc66,
            count: 8,
            speed: 0.5,
            lifetime: 0.3,
            size: 0.15,
            spread: 0.15,
            velocity: function (i, count, opts) {
                return {
                    x: (Math.random() - 0.5) * opts.speed,
                    y: (Math.random() - 0.5) * opts.speed,
                    z: (Math.random() - 0.5) * opts.speed
                };
            }
        },

        /* ---- aura: 12 particles orbiting, long life ---- */
        aura: {
            color: 0x44aaff,
            count: 12,
            speed: 0,
            lifetime: 5.0,
            size: 0.18,
            spread: 0.8,
            velocity: function () { return { x: 0, y: 0, z: 0 }; }
        },

        /* ---- heal: green particles floating up, 1 s ---- */
        heal: {
            color: 0x44ff66,
            count: 15,
            speed: 1.5,
            lifetime: 1.0,
            size: 0.2,
            spread: 0.5,
            velocity: function (i, count, opts) {
                return {
                    x: (Math.random() - 0.5) * 0.5,
                    y: opts.speed * (0.5 + Math.random() * 0.5),
                    z: (Math.random() - 0.5) * 0.5
                };
            }
        },

        /* ---- fire: orange/red rising with flicker, 0.8 s ---- */
        fire: {
            color: 0xff5511,
            count: 20,
            speed: 2.0,
            lifetime: 0.8,
            size: 0.3,
            spread: 0.3,
            velocity: function (i, count, opts) {
                return {
                    x: (Math.random() - 0.5) * 1.0,
                    y: opts.speed * (0.6 + Math.random() * 0.4),
                    z: (Math.random() - 0.5) * 1.0
                };
            }
        },

        /* ---- ice: blue/white floating slowly, crystalline ---- */
        ice: {
            color: 0xaaddff,
            count: 15,
            speed: 0.8,
            lifetime: 1.0,
            size: 0.2,
            spread: 0.6,
            velocity: function (i, count, opts) {
                return {
                    x: (Math.random() - 0.5) * opts.speed,
                    y: Math.random() * opts.speed * 0.5 + 0.2,
                    z: (Math.random() - 0.5) * opts.speed
                };
            }
        },

        /* ---- hit: 6 white sparks, 0.3 s ---- */
        hit: {
            color: 0xffffff,
            count: 6,
            speed: 5.0,
            lifetime: 0.3,
            size: 0.12,
            spread: 0.05,
            velocity: function (i, count, opts) {
                var theta = Math.random() * Math.PI * 2;
                var sp = opts.speed * (0.5 + Math.random() * 0.5);
                return {
                    x: Math.cos(theta) * sp,
                    y: Math.random() * sp * 0.5 + 1.0,
                    z: Math.sin(theta) * sp
                };
            }
        },

        /* ---- death: 30 particles expanding as ring, 1.5 s ---- */
        death: {
            color: 0xff3333,
            count: 30,
            speed: 3.0,
            lifetime: 1.5,
            size: 0.25,
            spread: 0.1,
            velocity: function (i, count, opts) {
                var angle = (i / count) * Math.PI * 2;
                var sp = opts.speed * (0.8 + Math.random() * 0.4);
                return {
                    x: Math.cos(angle) * sp,
                    y: 0.5 + Math.random() * 0.5,
                    z: Math.sin(angle) * sp
                };
            }
        },

        /* ---- gold: golden sparkle, for loot/powerups ---- */
        gold: {
            color: 0xffdd44,
            count: 15,
            speed: 1.5,
            lifetime: 0.8,
            size: 0.18,
            spread: 0.4,
            velocity: function (i, count, opts) {
                return {
                    x: (Math.random() - 0.5) * opts.speed,
                    y: opts.speed * (0.3 + Math.random() * 0.7),
                    z: (Math.random() - 0.5) * opts.speed
                };
            }
        },

        /* ---- levelup: 50 particles spiraling upward, multi-coloured, 2 s ---- */
        levelup: {
            color: 0xffffff,
            count: 50,
            speed: 1.0,
            lifetime: 2.0,
            size: 0.2,
            spread: 0.3,
            velocity: function () { return { x: 0, y: 0, z: 0 }; }  // motion handled in update()
        }
    },

    /* ===========================================================
     *  INTERNAL — Procedural circle texture
     * =========================================================== */

    /**
     * Generate a soft-edged circle texture using a canvas.
     * @returns {THREE.CanvasTexture}
     */
    _createCircleTexture: function () {
        var size = 64;
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');

        // Radial gradient: white centre fading to transparent
        var half = size / 2;
        var grad = ctx.createRadialGradient(half, half, 0, half, half, half);
        grad.addColorStop(0,   'rgba(255,255,255,1)');
        grad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
        grad.addColorStop(0.7, 'rgba(255,255,255,0.3)');
        grad.addColorStop(1,   'rgba(255,255,255,0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);

        var tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        return tex;
    }
};
