/* =============================================================================
 * heroes.js — Fight the Monster: Brunei Legends Edition
 * 4 playable Brunei legendary heroes with procedural 3D geometry
 * Uses global namespace: window.GAME.Heroes
 * Three.js accessed via global THREE
 * ========================================================================== */

window.GAME = window.GAME || {};

GAME.Heroes = {

    /* -----------------------------------------------------------------------
     * Hero Definitions — stats, powers, visual config
     * -------------------------------------------------------------------- */
    definitions: [
        {
            name: 'Awang Semaun',
            title: 'The Legendary Warrior',
            description: 'Superhuman warrior of Brunei. Pengiran Temenggong, protector of the Sultanate.',
            hp: 150, maxHp: 150,
            mana: 100, maxMana: 100,
            speed: 3.5,
            attackDamage: 25,
            attackRange: 3.0,
            attackSpeed: 0.4,
            color: 0xFFD700,
            accentColor: 0xFF8C00,
            powers: [
                { name: "Warrior's Might", key: '1', cooldown: 8, manaCost: 30, damage: 60, range: 5, type: 'aoe_stun', description: 'Ground slam that stuns nearby enemies', icon: '⚡' },
                { name: 'Invincible Rage', key: '2', cooldown: 15, manaCost: 50, duration: 5, damageBoost: 2.0, type: 'buff', description: 'Temporary invulnerability and double damage', icon: '🔥' }
            ]
        },
        {
            name: 'Awang Alak Betatar',
            title: 'The First Sultan',
            description: 'Founder of Brunei Sultanate. Sultan Muhammad Shah, the wise leader.',
            hp: 120, maxHp: 120,
            mana: 120, maxMana: 120,
            speed: 3.0,
            attackDamage: 20,
            attackRange: 3.5,
            attackSpeed: 0.5,
            color: 0xFFF8DC,
            accentColor: 0xFFD700,
            powers: [
                { name: "Sultan's Decree", key: '1', cooldown: 10, manaCost: 35, healAmount: 40, speedBoost: 1.5, duration: 5, type: 'heal_buff', description: 'Rallying cry that heals and boosts speed', icon: '👑' },
                { name: 'Golden Crown Blast', key: '2', cooldown: 12, manaCost: 45, damage: 80, range: 8, type: 'beam', description: 'Radiant beam of royal energy', icon: '✨' }
            ]
        },
        {
            name: 'Puteri Kinangan',
            title: 'The Mystic Princess',
            description: 'Legendary princess with mystical water powers and connection to nature spirits.',
            hp: 85, maxHp: 85,
            mana: 150, maxMana: 150,
            speed: 4.0,
            attackDamage: 30,
            attackRange: 10.0,
            attackSpeed: 0.6,
            color: 0x457b9d,
            accentColor: 0x2d6a4f,
            powers: [
                { name: 'Healing Monsoon', key: '1', cooldown: 12, manaCost: 40, healAmount: 50, range: 6, duration: 3, type: 'heal_aoe', description: 'Rain of healing water over area', icon: '💧' },
                { name: "Naga's Fury", key: '2', cooldown: 14, manaCost: 55, damage: 70, range: 8, type: 'summon', description: 'Summon a water serpent to attack enemies', icon: '🐉' }
            ]
        },
        {
            name: 'Panglima Awang',
            title: 'The World Voyager',
            description: 'The warrior who sailed across the world. Swift as the ocean wind.',
            hp: 100, maxHp: 100,
            mana: 110, maxMana: 110,
            speed: 5.0,
            attackDamage: 22,
            attackRange: 3.0,
            attackSpeed: 0.25,
            color: 0x0077b6,
            accentColor: 0x00b4d8,
            powers: [
                { name: 'Ocean Wave', key: '1', cooldown: 7, manaCost: 25, damage: 40, range: 6, knockback: 5, type: 'aoe_push', description: 'Pushing wave of water', icon: '🌊' },
                { name: 'Voyager Dash', key: '2', cooldown: 5, manaCost: 20, damage: 35, dashCount: 3, type: 'dash_chain', description: 'Teleport strike chain through enemies', icon: '⚔️' }
            ]
        }
    ],

    /* -----------------------------------------------------------------------
     * Shared material factory
     * -------------------------------------------------------------------- */
    _makeMat: function (color, opts) {
        var cfg = {
            color: color,
            metalness: (opts && opts.metalness !== undefined) ? opts.metalness : 0.4,
            roughness: (opts && opts.roughness !== undefined) ? opts.roughness : 0.5
        };
        if (opts && opts.emissive !== undefined) {
            cfg.emissive = opts.emissive;
            cfg.emissiveIntensity = (opts.emissiveIntensity !== undefined) ? opts.emissiveIntensity : 0.3;
        }
        if (opts && opts.transparent) {
            cfg.transparent = true;
            cfg.opacity = (opts.opacity !== undefined) ? opts.opacity : 0.6;
            cfg.side = THREE.DoubleSide;
        }
        return new THREE.MeshStandardMaterial(cfg);
    },

    /* -----------------------------------------------------------------------
     * _buildBody — shared humanoid body builder
     * Returns { group, parts } where parts has named references
     * -------------------------------------------------------------------- */
    _buildBody: function (def, bodyScale) {
        var group = new THREE.Group();
        var parts = {};
        var mat = this._makeMat(def.color);
        var accentMat = this._makeMat(def.accentColor, { emissive: def.accentColor, emissiveIntensity: 0.15 });
        var skinMat = this._makeMat(0xd4a373);

        // Head
        var headGeo = new THREE.SphereGeometry(0.35, 16, 12);
        var head = new THREE.Mesh(headGeo, skinMat);
        head.position.set(0, 2.0, 0);
        head.castShadow = true;
        group.add(head);
        parts.head = head;

        // Eyes — small dark spheres
        var eyeGeo = new THREE.SphereGeometry(0.04, 8, 6);
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.12, 2.05, 0.3);
        group.add(leftEye);
        var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.12, 2.05, 0.3);
        group.add(rightEye);

        // Torso
        var torsoGeo = new THREE.BoxGeometry(0.8, 1.0, 0.5);
        var torso = new THREE.Mesh(torsoGeo, mat);
        torso.position.set(0, 1.2, 0);
        torso.castShadow = true;
        group.add(torso);
        parts.torso = torso;

        // Left Arm
        var armGeo = new THREE.BoxGeometry(0.2, 0.8, 0.2);
        var leftArm = new THREE.Mesh(armGeo, skinMat);
        leftArm.position.set(-0.6, 1.2, 0);
        leftArm.castShadow = true;
        group.add(leftArm);
        parts.leftArm = leftArm;

        // Right Arm (weapon arm) — wrapped in a pivot for animation
        var rightArmPivot = new THREE.Group();
        rightArmPivot.position.set(0.6, 1.6, 0);
        var rightArm = new THREE.Mesh(armGeo, skinMat);
        rightArm.position.set(0, -0.4, 0);
        rightArm.castShadow = true;
        rightArmPivot.add(rightArm);
        group.add(rightArmPivot);
        parts.rightArmPivot = rightArmPivot;
        parts.rightArm = rightArm;

        // Left Leg
        var legGeo = new THREE.BoxGeometry(0.25, 0.7, 0.25);
        var leftLeg = new THREE.Mesh(legGeo, mat);
        leftLeg.position.set(-0.2, 0.35, 0);
        leftLeg.castShadow = true;
        group.add(leftLeg);
        parts.leftLeg = leftLeg;

        // Right Leg
        var rightLeg = new THREE.Mesh(legGeo, mat);
        rightLeg.position.set(0.2, 0.35, 0);
        rightLeg.castShadow = true;
        group.add(rightLeg);
        parts.rightLeg = rightLeg;

        // Apply body scale
        if (bodyScale && bodyScale !== 1.0) {
            group.scale.set(bodyScale, bodyScale, bodyScale);
        }

        return { group: group, parts: parts, mat: mat, accentMat: accentMat, skinMat: skinMat };
    },

    /* -----------------------------------------------------------------------
     * Hero-specific mesh builders
     * -------------------------------------------------------------------- */
    _buildAwangSemaun: function (def) {
        var result = this._buildBody(def, 1.1);
        var group = result.group;
        var parts = result.parts;

        // Traditional headband (cone on head)
        var headbandGeo = new THREE.ConeGeometry(0.4, 0.3, 8);
        var headbandMat = this._makeMat(def.accentColor, { emissive: def.accentColor, emissiveIntensity: 0.2 });
        var headband = new THREE.Mesh(headbandGeo, headbandMat);
        headband.position.set(0, 2.35, 0);
        group.add(headband);

        // Keris (wavy dagger) — approximated with a scaled box
        var kerisMat = this._makeMat(0xFFD700, { emissive: 0xFFD700, emissiveIntensity: 0.4 });
        var kerisGeo = new THREE.BoxGeometry(0.1, 1.2, 0.05);
        var keris = new THREE.Mesh(kerisGeo, kerisMat);
        keris.position.set(0, -0.6, 0.15);
        // Add subtle wave deformation via vertices
        var kerisPos = keris.geometry.attributes.position;
        for (var i = 0; i < kerisPos.count; i++) {
            var y = kerisPos.getY(i);
            kerisPos.setX(i, kerisPos.getX(i) + Math.sin(y * 5) * 0.03);
        }
        kerisPos.needsUpdate = true;
        keris.geometry.computeVertexNormals();
        parts.rightArmPivot.add(keris);
        parts.weapon = keris;

        // Keris guard (crosspiece)
        var guardGeo = new THREE.BoxGeometry(0.2, 0.06, 0.08);
        var guard = new THREE.Mesh(guardGeo, kerisMat);
        guard.position.set(0, -0.05, 0.15);
        parts.rightArmPivot.add(guard);

        return { group: group, parts: parts };
    },

    _buildAlakBetatar: function (def) {
        var result = this._buildBody(def, 1.0);
        var group = result.group;
        var parts = result.parts;

        // Crown — torus with spikes
        var crownMat = this._makeMat(0xFFD700, { emissive: 0xFFD700, emissiveIntensity: 0.5 });
        var crownGeo = new THREE.TorusGeometry(0.25, 0.05, 8, 16);
        var crown = new THREE.Mesh(crownGeo, crownMat);
        crown.position.set(0, 2.3, 0);
        crown.rotation.x = Math.PI / 2;
        group.add(crown);

        // Crown spikes (5 small cones around torus)
        var spikeGeo = new THREE.ConeGeometry(0.05, 0.15, 6);
        for (var i = 0; i < 5; i++) {
            var angle = (i / 5) * Math.PI * 2;
            var spike = new THREE.Mesh(spikeGeo, crownMat);
            spike.position.set(
                Math.cos(angle) * 0.25,
                2.4,
                Math.sin(angle) * 0.25
            );
            group.add(spike);
        }

        // Royal sword
        var swordMat = this._makeMat(0xE0E0E0, { emissive: 0xFFFFFF, emissiveIntensity: 0.2 });
        var swordGeo = new THREE.BoxGeometry(0.08, 1.0, 0.04);
        var sword = new THREE.Mesh(swordGeo, swordMat);
        sword.position.set(0, -0.6, 0.15);
        parts.rightArmPivot.add(sword);
        parts.weapon = sword;

        // Sword guard
        var sgGeo = new THREE.BoxGeometry(0.2, 0.05, 0.06);
        var sg = new THREE.Mesh(sgGeo, crownMat);
        sg.position.set(0, -0.1, 0.15);
        parts.rightArmPivot.add(sg);

        // Cape — semi-transparent golden plane behind body
        var capeMat = this._makeMat(0xFFD700, { transparent: true, opacity: 0.5, emissive: 0xFFD700, emissiveIntensity: 0.1 });
        var capeGeo = new THREE.PlaneGeometry(0.8, 1.0);
        var cape = new THREE.Mesh(capeGeo, capeMat);
        cape.position.set(0, 1.3, -0.3);
        group.add(cape);
        parts.cape = cape;

        return { group: group, parts: parts };
    },

    _buildPuteriKinangan: function (def) {
        // Slightly narrower torso
        var result = this._buildBody(def, 1.0);
        var group = result.group;
        var parts = result.parts;

        // Narrow the torso
        parts.torso.scale.set(0.85, 1.0, 0.9);

        // Hair behind head
        var hairMat = this._makeMat(0x1a1a2e);
        var hairGeo = new THREE.BoxGeometry(0.3, 0.6, 0.2);
        var hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.set(0, 1.95, -0.25);
        group.add(hair);

        // Flowing skirt
        var skirtMat = this._makeMat(def.color, { transparent: true, opacity: 0.7, emissive: def.color, emissiveIntensity: 0.15 });
        var skirtGeo = new THREE.PlaneGeometry(0.6, 0.8);
        var skirtFront = new THREE.Mesh(skirtGeo, skirtMat);
        skirtFront.position.set(0, 0.55, 0.2);
        group.add(skirtFront);
        var skirtBack = new THREE.Mesh(skirtGeo, skirtMat);
        skirtBack.position.set(0, 0.55, -0.2);
        group.add(skirtBack);
        var skirtLeft = new THREE.Mesh(skirtGeo, skirtMat);
        skirtLeft.position.set(-0.25, 0.55, 0);
        skirtLeft.rotation.y = Math.PI / 2;
        group.add(skirtLeft);
        var skirtRight = new THREE.Mesh(skirtGeo, skirtMat);
        skirtRight.position.set(0.25, 0.55, 0);
        skirtRight.rotation.y = Math.PI / 2;
        group.add(skirtRight);
        parts.skirt = [skirtFront, skirtBack, skirtLeft, skirtRight];

        // Spirit staff
        var staffMat = this._makeMat(0x8B4513, { emissive: 0x2d6a4f, emissiveIntensity: 0.2 });
        var staffGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8);
        var staff = new THREE.Mesh(staffGeo, staffMat);
        staff.position.set(0, -0.4, 0.15);
        parts.rightArmPivot.add(staff);

        // Glowing orb on top of staff
        var orbMat = this._makeMat(def.accentColor, { emissive: def.color, emissiveIntensity: 0.8 });
        var orbGeo = new THREE.SphereGeometry(0.15, 12, 8);
        var orb = new THREE.Mesh(orbGeo, orbMat);
        orb.position.set(0, -1.15, 0.15);
        parts.rightArmPivot.add(orb);
        parts.weapon = orb;

        // Small point light on the orb
        var orbLight = new THREE.PointLight(def.color, 0.5, 4);
        orbLight.position.copy(orb.position);
        parts.rightArmPivot.add(orbLight);
        parts.orbLight = orbLight;

        // Tiara/headpiece
        var tiaraGeo = new THREE.TorusGeometry(0.2, 0.03, 6, 12, Math.PI);
        var tiaraMat = this._makeMat(0xC0C0C0, { emissive: 0x457b9d, emissiveIntensity: 0.3 });
        var tiara = new THREE.Mesh(tiaraGeo, tiaraMat);
        tiara.position.set(0, 2.25, 0.1);
        tiara.rotation.x = -0.2;
        group.add(tiara);

        return { group: group, parts: parts };
    },

    _buildPanglimaAwang: function (def) {
        var result = this._buildBody(def, 1.0);
        var group = result.group;
        var parts = result.parts;

        // Leaner body
        parts.torso.scale.set(0.9, 1.0, 0.9);

        // Bandana on head
        var bandanaMat = this._makeMat(def.accentColor, { emissive: def.accentColor, emissiveIntensity: 0.2 });
        var bandanaGeo = new THREE.BoxGeometry(0.4, 0.08, 0.4);
        var bandana = new THREE.Mesh(bandanaGeo, bandanaMat);
        bandana.position.set(0, 2.15, 0);
        group.add(bandana);

        // Bandana tail trailing behind
        var tailMat = this._makeMat(def.accentColor, { transparent: true, opacity: 0.7 });
        var tailGeo = new THREE.PlaneGeometry(0.1, 0.5);
        var tail = new THREE.Mesh(tailGeo, tailMat);
        tail.position.set(0, 2.0, -0.3);
        tail.rotation.x = 0.3;
        group.add(tail);
        parts.bandanaTail = tail;

        // Right blade (attached to right arm)
        var bladeMat = this._makeMat(0x00E5FF, { emissive: 0x00b4d8, emissiveIntensity: 0.5 });
        var bladeGeo = new THREE.BoxGeometry(0.06, 0.7, 0.03);
        var rightBlade = new THREE.Mesh(bladeGeo, bladeMat);
        rightBlade.position.set(0, -0.55, 0.12);
        parts.rightArmPivot.add(rightBlade);
        parts.weapon = rightBlade;

        // Left blade (attached to left arm)
        var leftBlade = new THREE.Mesh(bladeGeo, bladeMat);
        leftBlade.position.set(0, -0.2, 0.12);
        // Create a pivot for the left arm too
        var leftArmGroup = new THREE.Group();
        leftArmGroup.position.copy(parts.leftArm.position);
        parts.leftArm.position.set(0, 0, 0);
        leftArmGroup.add(parts.leftArm);
        leftArmGroup.add(leftBlade);
        group.add(leftArmGroup);
        parts.leftArmPivot = leftArmGroup;
        parts.leftBlade = leftBlade;

        // Add point light to blades
        var bladeLight = new THREE.PointLight(0x00b4d8, 0.3, 3);
        bladeLight.position.set(0.6, 1.0, 0.15);
        group.add(bladeLight);

        return { group: group, parts: parts };
    },

    /* -----------------------------------------------------------------------
     * createHero — main factory, returns a full hero object
     * -------------------------------------------------------------------- */
    createHero: function (index) {
        var def = this.definitions[index];
        if (!def) {
            console.error('Heroes.createHero: invalid index', index);
            return null;
        }

        // Build hero-specific mesh
        var built;
        switch (index) {
            case 0: built = this._buildAwangSemaun(def); break;
            case 1: built = this._buildAlakBetatar(def); break;
            case 2: built = this._buildPuteriKinangan(def); break;
            case 3: built = this._buildPanglimaAwang(def); break;
            default: built = this._buildBody(def, 1.0); break;
        }

        var mesh = built.group;
        var parts = built.parts;
        mesh.name = 'hero_' + def.name.replace(/\s/g, '_');

        // Create shadow underneath hero
        var shadowGeo = new THREE.CircleGeometry(0.5, 16);
        var shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 });
        var shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.02;
        mesh.add(shadow);

        // ---- Hero object ----
        var hero = {
            // Definition reference
            def: def,
            name: def.name,
            title: def.title,
            description: def.description,
            heroIndex: index,

            // 3D
            mesh: mesh,
            parts: parts,

            // Stats (mutable copies)
            hp: def.hp,
            maxHp: def.maxHp,
            mana: def.mana,
            maxMana: def.maxMana,
            speed: def.speed,
            baseSpeed: def.speed,
            attackDamage: def.attackDamage,
            attackRange: def.attackRange,
            attackSpeed: def.attackSpeed,
            powers: JSON.parse(JSON.stringify(def.powers)),

            // Combat state
            attackCooldown: 0,
            powerCooldowns: [0, 0],
            isInvincible: false,
            damageMultiplier: 1.0,
            combo: 0,
            comboTimer: 0,

            // Movement / animation state
            animationTime: 0,
            facing: new THREE.Vector3(0, 0, -1),
            velocity: new THREE.Vector3(),
            isDodging: false,
            dodgeCooldown: 0,
            dodgeTimer: 0,
            isAttacking: false,
            attackAnimTimer: 0,

            // Buff timers
            buffTimers: [],

            // Damage flash
            _flashTimer: 0,
            _originalEmissives: null,

            // Power glow
            _powerGlowTimer: 0,

            // Score
            score: 0,

            // Mana regeneration
            manaRegenRate: 3, // per second
            manaRegenTimer: 0,

            /* -----------------------------------------------------------
             * update(delta) — tick cooldowns, animations, buffs
             * -------------------------------------------------------- */
            update: function (delta) {
                this.animationTime += delta;

                // --- Idle bob & Breathing animation ---
                var isMoving = this.velocity.length() > 0.1;
                if (!this.isDodging && !this.isAttacking) {
                    if (isMoving) {
                        // Tilt body forward slightly when running
                        this.mesh.rotation.x = 0.15;
                        this.mesh.position.y = Math.sin(this.animationTime * 12) * 0.08; // faster bob when running
                    } else {
                        // Reset tilt, slower bob, scale torso for breathing
                        this.mesh.rotation.x = 0;
                        var bob = Math.sin(this.animationTime * 3.0) * 0.03;
                        this.mesh.position.y = bob;
                        
                        if (this.parts.torso) {
                            this.parts.torso.scale.y = 1.0 + Math.sin(this.animationTime * 3.0) * 0.025;
                            this.parts.torso.scale.x = 1.0 + Math.sin(this.animationTime * 3.0) * 0.01;
                        }
                    }
                }

                // --- Attack animation ---
                if (this.isAttacking) {
                    this.attackAnimTimer -= delta;
                    var progress = 1.0 - Math.max(0, this.attackAnimTimer / 0.2);
                    if (progress < 0.5) {
                        // Swing forward
                        this.parts.rightArmPivot.rotation.x = -1.5 * (progress * 2);
                    } else {
                        // Swing back
                        this.parts.rightArmPivot.rotation.x = -1.5 * (1.0 - (progress - 0.5) * 2);
                    }
                    if (this.attackAnimTimer <= 0) {
                        this.isAttacking = false;
                        this.parts.rightArmPivot.rotation.x = 0;
                    }
                }

                // --- Dodge roll ---
                if (this.isDodging) {
                    this.dodgeTimer -= delta;
                    var dodgeProgress = 1.0 - Math.max(0, this.dodgeTimer / 0.3);
                    this.mesh.rotation.z = dodgeProgress * Math.PI * 2;
                    if (this.dodgeTimer <= 0) {
                        this.isDodging = false;
                        this.mesh.rotation.z = 0;
                    }
                }

                // --- Cooldowns ---
                if (this.attackCooldown > 0) {
                    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
                }
                for (var i = 0; i < this.powerCooldowns.length; i++) {
                    if (this.powerCooldowns[i] > 0) {
                        this.powerCooldowns[i] = Math.max(0, this.powerCooldowns[i] - delta);
                    }
                }
                if (this.dodgeCooldown > 0) {
                    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - delta);
                }

                // --- Combo timer ---
                if (this.combo > 0) {
                    this.comboTimer -= delta;
                    if (this.comboTimer <= 0) {
                        this.combo = 0;
                    }
                }

                // --- Buff timers ---
                for (var b = this.buffTimers.length - 1; b >= 0; b--) {
                    this.buffTimers[b].remaining -= delta;
                    if (this.buffTimers[b].remaining <= 0) {
                        var buff = this.buffTimers[b];
                        if (buff.type === 'invincible') {
                            this.isInvincible = false;
                            this.damageMultiplier = 1.0;
                        }
                        if (buff.type === 'speed') {
                            this.speed = this.baseSpeed;
                        }
                        this.buffTimers.splice(b, 1);
                    }
                }

                // --- Mana regeneration ---
                this.manaRegenTimer += delta;
                if (this.manaRegenTimer >= 1.0) {
                    this.manaRegenTimer -= 1.0;
                    this.restoreMana(this.manaRegenRate);
                }

                // --- Damage flash ---
                if (this._flashTimer > 0) {
                    this._flashTimer -= delta;
                    if (this._flashTimer <= 0) {
                        this._restoreEmissives();
                    }
                }

                // --- Power glow ---
                if (this._powerGlowTimer > 0) {
                    this._powerGlowTimer -= delta;
                    if (this._powerGlowTimer <= 0) {
                        this._restoreEmissives();
                    }
                }

                // --- Walking leg animation ---
                if (isMoving && !this.isDodging) {
                    var legSwing = Math.sin(this.animationTime * 10) * 0.45;
                    if (this.parts.leftLeg) this.parts.leftLeg.rotation.x = legSwing;
                    if (this.parts.rightLeg) this.parts.rightLeg.rotation.x = -legSwing;
                    if (!this.isAttacking && this.parts.leftArm) {
                        this.parts.leftArm.rotation.x = -legSwing * 0.6;
                    }
                    if (!this.isAttacking && this.parts.rightArmPivot) {
                        this.parts.rightArmPivot.rotation.x = legSwing * 0.3;
                    }
                } else {
                    if (this.parts.leftLeg) this.parts.leftLeg.rotation.x = 0;
                    if (this.parts.rightLeg) this.parts.rightLeg.rotation.x = 0;
                    if (!this.isAttacking && this.parts.leftArm) {
                        this.parts.leftArm.rotation.x = 0;
                    }
                    if (!this.isAttacking && this.parts.rightArmPivot) {
                        this.parts.rightArmPivot.rotation.x = 0;
                    }
                }

                // --- Puteri Kinangan orb pulse ---
                if (this.heroIndex === 2 && this.parts.weapon) {
                    var pulse = 0.8 + Math.sin(this.animationTime * 3) * 0.2;
                    this.parts.weapon.material.emissiveIntensity = pulse;
                    if (this.parts.orbLight) {
                        this.parts.orbLight.intensity = 0.3 + Math.sin(this.animationTime * 3) * 0.2;
                    }
                }

                // --- Panglima Awang bandana physics ---
                if (this.heroIndex === 3 && this.parts.bandanaTail) {
                    this.parts.bandanaTail.rotation.x = 0.3 + Math.sin(this.animationTime * 4) * 0.15;
                }

                // --- Alak Betatar cape wave ---
                if (this.heroIndex === 1 && this.parts.cape) {
                    this.parts.cape.rotation.y = Math.sin(this.animationTime * 2) * 0.1;
                }
            },

            /* -----------------------------------------------------------
             * attack() — basic attack
             * -------------------------------------------------------- */
            attack: function () {
                if (this.attackCooldown > 0 || this.isDodging || this.isAttacking) return null;

                this.attackCooldown = this.attackSpeed;
                this.isAttacking = true;
                this.attackAnimTimer = 0.2;

                // Combo tracking
                this.combo++;
                this.comboTimer = 2.0;

                var comboMultiplier = 1.0 + (Math.min(this.combo, 10) * 0.05);

                return {
                    damage: Math.round(this.attackDamage * this.damageMultiplier * comboMultiplier),
                    range: this.attackRange,
                    position: this.mesh.position.clone(),
                    direction: this.facing.clone(),
                    isRanged: (this.heroIndex === 2), // Puteri is ranged
                    combo: this.combo
                };
            },

            /* -----------------------------------------------------------
             * usePower(powerIndex) — activate special ability
             * -------------------------------------------------------- */
            usePower: function (powerIndex) {
                if (powerIndex < 0 || powerIndex >= this.powers.length) return null;
                if (this.powerCooldowns[powerIndex] > 0) return null;
                if (this.isDodging) return null;

                var power = this.powers[powerIndex];
                if (this.mana < power.manaCost) return null;

                // Consume mana and start cooldown
                this.mana -= power.manaCost;
                this.powerCooldowns[powerIndex] = power.cooldown;

                // Power glow effect
                this._setEmissive(this.def.color, 0.8);
                this._powerGlowTimer = 0.5;

                // Apply immediate buff effects
                if (power.type === 'buff') {
                    this.isInvincible = true;
                    this.damageMultiplier = power.damageBoost || 2.0;
                    this.buffTimers.push({
                        type: 'invincible',
                        remaining: power.duration || 5
                    });
                }
                if (power.type === 'heal_buff') {
                    this.heal(power.healAmount || 0);
                    if (power.speedBoost) {
                        this.speed = this.baseSpeed * power.speedBoost;
                        this.buffTimers.push({
                            type: 'speed',
                            remaining: power.duration || 5
                        });
                    }
                }
                if (power.type === 'heal_aoe') {
                    this.heal(power.healAmount || 0);
                }

                return {
                    power: power,
                    position: this.mesh.position.clone(),
                    direction: this.facing.clone(),
                    heroIndex: this.heroIndex
                };
            },

            /* -----------------------------------------------------------
             * dodge() — dodge roll
             * -------------------------------------------------------- */
            dodge: function () {
                if (this.dodgeCooldown > 0 || this.isDodging || this.isAttacking) return false;

                this.isDodging = true;
                this.dodgeTimer = 0.3;
                this.dodgeCooldown = 1.0;
                this.isInvincible = true;

                // After dodge finishes, remove invincibility (unless buffed)
                var self = this;
                this.buffTimers.push({
                    type: 'dodge_invincible',
                    remaining: 0.3,
                });

                // Override: after dodge, check if a buff is keeping invincibility
                setTimeout(function () {
                    var hasBuff = false;
                    for (var i = 0; i < self.buffTimers.length; i++) {
                        if (self.buffTimers[i].type === 'invincible') hasBuff = true;
                    }
                    if (!hasBuff) self.isInvincible = false;
                }, 350);

                return true;
            },

            /* -----------------------------------------------------------
             * takeDamage(amount) — receive damage
             * -------------------------------------------------------- */
            takeDamage: function (amount) {
                if (this.isInvincible) return 0;
                if (this.hp <= 0) return 0;

                var actualDamage = Math.max(1, Math.round(amount));
                this.hp = Math.max(0, this.hp - actualDamage);

                // Reset combo on hit
                this.combo = 0;
                this.comboTimer = 0;

                // Flash red
                this._setEmissive(0xff0000, 1.0);
                this._flashTimer = 0.1;

                return actualDamage;
            },

            /* -----------------------------------------------------------
             * heal(amount) — restore HP
             * -------------------------------------------------------- */
            heal: function (amount) {
                if (this.hp <= 0) return;
                this.hp = Math.min(this.maxHp, this.hp + Math.round(amount));
            },

            /* -----------------------------------------------------------
             * restoreMana(amount) — restore mana
             * -------------------------------------------------------- */
            restoreMana: function (amount) {
                this.mana = Math.min(this.maxMana, this.mana + Math.round(amount));
            },

            /* -----------------------------------------------------------
             * isDead()
             * -------------------------------------------------------- */
            isDead: function () {
                return this.hp <= 0;
            },

            /* -----------------------------------------------------------
             * Emissive flash helpers
             * -------------------------------------------------------- */
            _setEmissive: function (color, intensity) {
                if (!this._originalEmissives) {
                    this._originalEmissives = [];
                    this.mesh.traverse(function (child) {
                        if (child.isMesh && child.material && child.material.emissive) {
                            this._originalEmissives.push({
                                mesh: child,
                                emissive: child.material.emissive.getHex(),
                                emissiveIntensity: child.material.emissiveIntensity
                            });
                        }
                    }.bind(this));
                }
                var c = new THREE.Color(color);
                this.mesh.traverse(function (child) {
                    if (child.isMesh && child.material && child.material.emissive) {
                        child.material.emissive.copy(c);
                        child.material.emissiveIntensity = intensity;
                    }
                });
            },

            _restoreEmissives: function () {
                if (!this._originalEmissives) return;
                for (var i = 0; i < this._originalEmissives.length; i++) {
                    var entry = this._originalEmissives[i];
                    entry.mesh.material.emissive.setHex(entry.emissive);
                    entry.mesh.material.emissiveIntensity = entry.emissiveIntensity;
                }
            },

            /* -----------------------------------------------------------
             * reset() — fully restore hero to starting state
             * -------------------------------------------------------- */
            reset: function () {
                this.hp = this.maxHp;
                this.mana = this.maxMana;
                this.speed = this.baseSpeed;
                this.attackCooldown = 0;
                this.powerCooldowns = [0, 0];
                this.isInvincible = false;
                this.damageMultiplier = 1.0;
                this.combo = 0;
                this.comboTimer = 0;
                this.isDodging = false;
                this.dodgeCooldown = 0;
                this.isAttacking = false;
                this.buffTimers = [];
                this._flashTimer = 0;
                this._powerGlowTimer = 0;
                this._restoreEmissives();
                this.mesh.rotation.set(0, 0, 0);
                this.mesh.position.set(0, 0, 0);
                this.velocity.set(0, 0, 0);
            }
        };

        return hero;
    }
};
