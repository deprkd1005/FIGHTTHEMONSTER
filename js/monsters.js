/* =============================================================================
 * monsters.js — Fight the Monster: Brunei Legends Edition
 * 8 regular monster types + 5 boss types with AI and procedural 3D models
 * Uses global namespace: window.GAME.Monsters
 * Three.js accessed via global THREE
 * ========================================================================== */

window.GAME = window.GAME || {};

GAME.Monsters = {

    /* -----------------------------------------------------------------------
     * Regular monster type definitions
     * -------------------------------------------------------------------- */
    types: {
        galap: {
            name: 'Galap', hp: 60, speed: 2.0, damage: 15, attackRange: 2.5,
            attackSpeed: 1.0, xpValue: 10, behavior: 'charge',
            color: 0x2d6a4f, scale: 1.2
        },
        buaya_putih: {
            name: 'Buaya Putih', hp: 50, speed: 2.5, damage: 20, attackRange: 3.0,
            attackSpeed: 1.2, xpValue: 12, behavior: 'lunge',
            color: 0xe0e0e0, scale: 1.0
        },
        harimau_jadian: {
            name: 'Harimau Jadian', hp: 45, speed: 4.0, damage: 25, attackRange: 2.0,
            attackSpeed: 0.8, xpValue: 15, behavior: 'stalk',
            color: 0x5c2d91, scale: 0.9
        },
        orang_tinggi: {
            name: 'Orang Tinggi', hp: 100, speed: 1.5, damage: 30, attackRange: 4.0,
            attackSpeed: 2.0, xpValue: 20, behavior: 'sweep',
            color: 0x2c2c2c, scale: 2.0
        },
        spirit_warrior: {
            name: 'Spirit Warrior', hp: 40, speed: 2.5, damage: 18, attackRange: 2.5,
            attackSpeed: 1.0, xpValue: 10, behavior: 'chase',
            color: 0x4a0080, scale: 1.0
        },
        fire_imp: {
            name: 'Fire Imp', hp: 30, speed: 3.0, damage: 12, attackRange: 6.0,
            attackSpeed: 1.5, xpValue: 8, behavior: 'ranged',
            color: 0xff4500, scale: 0.7
        },
        ice_wolf: {
            name: 'Ice Wolf', hp: 55, speed: 3.5, damage: 18, attackRange: 2.0,
            attackSpeed: 0.9, xpValue: 14, behavior: 'pack',
            color: 0x87ceeb, scale: 0.8
        },
        dark_mage: {
            name: 'Dark Mage', hp: 35, speed: 2.0, damage: 22, attackRange: 8.0,
            attackSpeed: 2.0, xpValue: 16, behavior: 'ranged',
            color: 0x800080, scale: 1.0
        }
    },

    /* -----------------------------------------------------------------------
     * Boss type definitions
     * -------------------------------------------------------------------- */
    bossTypes: {
        great_naga: {
            name: 'The Great Naga', hp: 400, speed: 2.0, damage: 30,
            attackRange: 5.0, attackSpeed: 1.5, behavior: 'boss_naga',
            color: 0x006400, scale: 3.0, phases: 2
        },
        genali: {
            name: 'Genali the Serpent King', hp: 500, speed: 1.8, damage: 35,
            attackRange: 6.0, attackSpeed: 1.8, behavior: 'boss_serpent',
            color: 0x4b0082, scale: 3.5, phases: 2
        },
        demon_harimau: {
            name: 'The Demon Harimau', hp: 450, speed: 3.0, damage: 40,
            attackRange: 3.0, attackSpeed: 1.0, behavior: 'boss_tiger',
            color: 0x8b0000, scale: 2.5, phases: 2
        },
        orang_tinggi_elder: {
            name: 'Orang Tinggi Elder', hp: 600, speed: 1.2, damage: 45,
            attackRange: 6.0, attackSpeed: 2.5, behavior: 'boss_giant',
            color: 0x1a1a1a, scale: 4.0, phases: 3
        },
        shadow_sultan: {
            name: 'The Shadow Sultan', hp: 800, speed: 2.5, damage: 35,
            attackRange: 5.0, attackSpeed: 1.2, behavior: 'boss_final',
            color: 0x1a0033, scale: 2.0, phases: 3
        }
    },

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
     * Projectile tracking — shared array for all ranged attacks
     * -------------------------------------------------------------------- */
    activeProjectiles: [],

    createProjectile: function (origin, target, damage, speed, color) {
        var geo = new THREE.SphereGeometry(0.15, 8, 6);
        var mat = this._makeMat(color, { emissive: color, emissiveIntensity: 0.8 });
        var mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(origin);

        var light = new THREE.PointLight(color, 0.4, 4);
        mesh.add(light);

        var direction = new THREE.Vector3().subVectors(target, origin).normalize();

        var proj = {
            mesh: mesh,
            direction: direction,
            speed: speed || 8,
            damage: damage,
            lifetime: 5,
            age: 0
        };
        this.activeProjectiles.push(proj);
        return proj;
    },

    updateProjectiles: function (delta, scene) {
        for (var i = this.activeProjectiles.length - 1; i >= 0; i--) {
            var p = this.activeProjectiles[i];
            p.age += delta;
            p.mesh.position.addScaledVector(p.direction, p.speed * delta);

            if (p.age >= p.lifetime) {
                scene.remove(p.mesh);
                if (p.mesh.geometry) p.mesh.geometry.dispose();
                if (p.mesh.material) p.mesh.material.dispose();
                this.activeProjectiles.splice(i, 1);
            }
        }
    },

    /* -----------------------------------------------------------------------
     * Monster mesh builders — one per type
     * -------------------------------------------------------------------- */

    _buildGalap: function (type) {
        var group = new THREE.Group();
        var mat = this._makeMat(type.color, { emissive: type.color, emissiveIntensity: 0.1 });

        // Body — elongated box (scaly reptile)
        var bodyGeo = new THREE.BoxGeometry(0.6, 0.4, 2.0);
        var body = new THREE.Mesh(bodyGeo, mat);
        body.position.set(0, 0.5, 0);
        body.castShadow = true;
        group.add(body);

        // Head
        var headGeo = new THREE.BoxGeometry(0.5, 0.3, 0.5);
        var head = new THREE.Mesh(headGeo, mat);
        head.position.set(0, 0.6, 1.2);
        head.castShadow = true;
        group.add(head);

        // Horn on top
        var hornGeo = new THREE.ConeGeometry(0.1, 0.4, 6);
        var hornMat = this._makeMat(0x1a4a2f, { emissive: 0x00ff44, emissiveIntensity: 0.3 });
        var horn = new THREE.Mesh(hornGeo, hornMat);
        horn.position.set(0, 0.95, 1.2);
        group.add(horn);

        // Eyes
        var eyeGeo = new THREE.SphereGeometry(0.05, 6, 4);
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.8 });
        var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.2, 0.7, 1.4);
        group.add(leftEye);
        var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.2, 0.7, 1.4);
        group.add(rightEye);

        // Tail
        var tailGeo = new THREE.CylinderGeometry(0.1, 0.05, 1.5, 6);
        var tail = new THREE.Mesh(tailGeo, mat);
        tail.position.set(0, 0.4, -1.5);
        tail.rotation.x = Math.PI / 2 + 0.3;
        group.add(tail);

        // Short legs x4
        var legGeo = new THREE.BoxGeometry(0.15, 0.3, 0.15);
        var positions = [[-0.25, 0.15, 0.6], [0.25, 0.15, 0.6], [-0.25, 0.15, -0.4], [0.25, 0.15, -0.4]];
        var legs = [];
        for (var i = 0; i < 4; i++) {
            var leg = new THREE.Mesh(legGeo, mat);
            leg.position.set(positions[i][0], positions[i][1], positions[i][2]);
            group.add(leg);
            legs.push(leg);
        }

        group.scale.set(type.scale, type.scale, type.scale);
        return { group: group, parts: { body: body, head: head, tail: tail, legs: legs } };
    },

    _buildBuayaPutih: function (type) {
        var group = new THREE.Group();
        var mat = this._makeMat(type.color, { emissive: 0xffffff, emissiveIntensity: 0.15 });

        // Flat body
        var bodyGeo = new THREE.BoxGeometry(0.5, 0.2, 2.5);
        var body = new THREE.Mesh(bodyGeo, mat);
        body.position.set(0, 0.3, 0);
        body.castShadow = true;
        group.add(body);

        // Long snout
        var snoutGeo = new THREE.BoxGeometry(0.3, 0.15, 0.8);
        var snout = new THREE.Mesh(snoutGeo, mat);
        snout.position.set(0, 0.3, 1.6);
        group.add(snout);

        // Jaw (lower snout, slightly open)
        var jawGeo = new THREE.BoxGeometry(0.28, 0.08, 0.7);
        var jaw = new THREE.Mesh(jawGeo, mat);
        jaw.position.set(0, 0.18, 1.55);
        jaw.rotation.x = 0.15;
        group.add(jaw);

        // Tail — tapering
        var tailGeo = new THREE.BoxGeometry(0.2, 0.15, 1.5);
        var tail = new THREE.Mesh(tailGeo, mat);
        tail.position.set(0, 0.3, -1.8);
        group.add(tail);

        // Glowing red eyes
        var eyeGeo = new THREE.SphereGeometry(0.06, 6, 4);
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0 });
        var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.15, 0.42, 1.9);
        group.add(leftEye);
        var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.15, 0.42, 1.9);
        group.add(rightEye);

        // Short legs x4
        var legGeo = new THREE.BoxGeometry(0.12, 0.2, 0.12);
        var legPositions = [[-0.25, 0.1, 0.8], [0.25, 0.1, 0.8], [-0.25, 0.1, -0.5], [0.25, 0.1, -0.5]];
        var legs = [];
        for (var i = 0; i < 4; i++) {
            var leg = new THREE.Mesh(legGeo, mat);
            leg.position.set(legPositions[i][0], legPositions[i][1], legPositions[i][2]);
            group.add(leg);
            legs.push(leg);
        }

        group.scale.set(type.scale, type.scale, type.scale);
        return { group: group, parts: { body: body, head: snout, tail: tail, legs: legs } };
    },

    _buildHarimauJadian: function (type) {
        var group = new THREE.Group();
        var mat = this._makeMat(type.color, { emissive: type.color, emissiveIntensity: 0.2 });

        // Cat body
        var bodyGeo = new THREE.BoxGeometry(0.5, 0.5, 1.2);
        var body = new THREE.Mesh(bodyGeo, mat);
        body.position.set(0, 0.7, 0);
        body.castShadow = true;
        group.add(body);

        // Head
        var headGeo = new THREE.SphereGeometry(0.3, 12, 8);
        var head = new THREE.Mesh(headGeo, mat);
        head.position.set(0, 0.9, 0.8);
        head.castShadow = true;
        group.add(head);

        // Pointed ears
        var earGeo = new THREE.ConeGeometry(0.08, 0.2, 4);
        var leftEar = new THREE.Mesh(earGeo, mat);
        leftEar.position.set(-0.15, 1.2, 0.8);
        group.add(leftEar);
        var rightEar = new THREE.Mesh(earGeo, mat);
        rightEar.position.set(0.15, 1.2, 0.8);
        group.add(rightEar);

        // Glowing purple eyes
        var eyeGeo = new THREE.SphereGeometry(0.05, 6, 4);
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xcc00ff, emissive: 0xcc00ff, emissiveIntensity: 1.0 });
        var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.12, 0.95, 1.05);
        group.add(leftEye);
        var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.12, 0.95, 1.05);
        group.add(rightEye);

        // Legs x4
        var legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 6);
        var legPositions = [[-0.2, 0.25, 0.35], [0.2, 0.25, 0.35], [-0.2, 0.25, -0.35], [0.2, 0.25, -0.35]];
        var legs = [];
        for (var i = 0; i < 4; i++) {
            var leg = new THREE.Mesh(legGeo, mat);
            leg.position.set(legPositions[i][0], legPositions[i][1], legPositions[i][2]);
            group.add(leg);
            legs.push(leg);
        }

        // Tail
        var tailGeo = new THREE.CylinderGeometry(0.04, 0.03, 0.8, 6);
        var tail = new THREE.Mesh(tailGeo, mat);
        tail.position.set(0, 0.7, -0.9);
        tail.rotation.x = Math.PI / 2 + 0.5;
        group.add(tail);

        // Shadow aura — semi-transparent sphere
        var auraMat = this._makeMat(0x5c2d91, { transparent: true, opacity: 0.15, emissive: 0x5c2d91, emissiveIntensity: 0.3 });
        var auraGeo = new THREE.SphereGeometry(0.8, 8, 6);
        var aura = new THREE.Mesh(auraGeo, auraMat);
        aura.position.set(0, 0.7, 0);
        group.add(aura);

        group.scale.set(type.scale, type.scale, type.scale);
        return { group: group, parts: { body: body, head: head, tail: tail, legs: legs, aura: aura } };
    },

    _buildOrangTinggi: function (type) {
        var group = new THREE.Group();
        var mat = this._makeMat(type.color, { transparent: true, opacity: 0.7, emissive: type.color, emissiveIntensity: 0.1 });

        // Tall cylindrical body (misty)
        var bodyGeo = new THREE.CylinderGeometry(0.3, 0.4, 3.0, 8);
        var body = new THREE.Mesh(bodyGeo, mat);
        body.position.set(0, 1.5, 0);
        body.castShadow = true;
        group.add(body);

        // Head at top
        var headGeo = new THREE.SphereGeometry(0.4, 10, 8);
        var head = new THREE.Mesh(headGeo, mat);
        head.position.set(0, 4.0, 0);
        head.castShadow = true;
        group.add(head);

        // Glowing white eyes
        var eyeGeo = new THREE.SphereGeometry(0.08, 6, 4);
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.0 });
        var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.15, 4.05, 0.35);
        group.add(leftEye);
        var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.15, 4.05, 0.35);
        group.add(rightEye);

        // Long hanging arms
        var armGeo = new THREE.CylinderGeometry(0.08, 0.06, 2.0, 6);
        var leftArm = new THREE.Mesh(armGeo, mat);
        leftArm.position.set(-0.5, 2.0, 0);
        leftArm.rotation.z = 0.15;
        group.add(leftArm);
        var rightArm = new THREE.Mesh(armGeo, mat);
        rightArm.position.set(0.5, 2.0, 0);
        rightArm.rotation.z = -0.15;
        group.add(rightArm);

        // Large hands (claws)
        var handGeo = new THREE.SphereGeometry(0.12, 6, 4);
        var leftHand = new THREE.Mesh(handGeo, mat);
        leftHand.position.set(-0.55, 0.9, 0);
        group.add(leftHand);
        var rightHand = new THREE.Mesh(handGeo, mat);
        rightHand.position.set(0.55, 0.9, 0);
        group.add(rightHand);

        // Thin legs
        var legGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.0, 6);
        var leftLeg = new THREE.Mesh(legGeo, mat);
        leftLeg.position.set(-0.15, 0.0, 0);
        group.add(leftLeg);
        var rightLeg = new THREE.Mesh(legGeo, mat);
        rightLeg.position.set(0.15, 0.0, 0);
        group.add(rightLeg);

        // Eye lights
        var eyeLight = new THREE.PointLight(0xffffff, 0.3, 5);
        eyeLight.position.set(0, 4.0, 0.4);
        group.add(eyeLight);

        group.scale.set(type.scale, type.scale, type.scale);
        return { group: group, parts: { body: body, head: head, leftArm: leftArm, rightArm: rightArm } };
    },

    _buildSpiritWarrior: function (type) {
        var group = new THREE.Group();
        var mat = this._makeMat(type.color, { transparent: true, opacity: 0.6, emissive: type.color, emissiveIntensity: 0.3 });

        // Humanoid body (ghostly)
        var torsoGeo = new THREE.BoxGeometry(0.6, 0.8, 0.4);
        var torso = new THREE.Mesh(torsoGeo, mat);
        torso.position.set(0, 1.2, 0);
        torso.castShadow = true;
        group.add(torso);

        // Head
        var headGeo = new THREE.SphereGeometry(0.25, 10, 8);
        var head = new THREE.Mesh(headGeo, mat);
        head.position.set(0, 1.85, 0);
        group.add(head);

        // Glowing eyes
        var eyeGeo = new THREE.SphereGeometry(0.04, 6, 4);
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 1.0 });
        var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.1, 1.9, 0.22);
        group.add(leftEye);
        var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.1, 1.9, 0.22);
        group.add(rightEye);

        // Arms
        var armGeo = new THREE.BoxGeometry(0.15, 0.7, 0.15);
        var leftArm = new THREE.Mesh(armGeo, mat);
        leftArm.position.set(-0.5, 1.2, 0);
        group.add(leftArm);
        var rightArm = new THREE.Mesh(armGeo, mat);
        rightArm.position.set(0.5, 1.2, 0);
        group.add(rightArm);

        // Legs
        var legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        var leftLeg = new THREE.Mesh(legGeo, mat);
        leftLeg.position.set(-0.15, 0.4, 0);
        group.add(leftLeg);
        var rightLeg = new THREE.Mesh(legGeo, mat);
        rightLeg.position.set(0.15, 0.4, 0);
        group.add(rightLeg);

        // Ghostly sword
        var swordMat = this._makeMat(0x8800cc, { emissive: 0xaa00ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.7 });
        var swordGeo = new THREE.BoxGeometry(0.06, 0.8, 0.03);
        var sword = new THREE.Mesh(swordGeo, swordMat);
        sword.position.set(0.5, 0.6, 0.15);
        group.add(sword);

        group.scale.set(type.scale, type.scale, type.scale);
        return { group: group, parts: { body: torso, head: head } };
    },

    _buildFireImp: function (type) {
        var group = new THREE.Group();
        var mat = this._makeMat(type.color, { emissive: type.color, emissiveIntensity: 0.5 });

        // Round body
        var bodyGeo = new THREE.SphereGeometry(0.3, 10, 8);
        var body = new THREE.Mesh(bodyGeo, mat);
        body.position.set(0, 0.4, 0);
        body.castShadow = true;
        group.add(body);

        // Tiny arms
        var armGeo = new THREE.BoxGeometry(0.08, 0.3, 0.08);
        var leftArm = new THREE.Mesh(armGeo, mat);
        leftArm.position.set(-0.3, 0.35, 0);
        leftArm.rotation.z = 0.5;
        group.add(leftArm);
        var rightArm = new THREE.Mesh(armGeo, mat);
        rightArm.position.set(0.3, 0.35, 0);
        rightArm.rotation.z = -0.5;
        group.add(rightArm);

        // Big glowing yellow eyes
        var eyeGeo = new THREE.SphereGeometry(0.08, 8, 6);
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 1.0 });
        var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.12, 0.5, 0.22);
        group.add(leftEye);
        var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.12, 0.5, 0.22);
        group.add(rightEye);

        // Tiny legs
        var legGeo = new THREE.BoxGeometry(0.06, 0.15, 0.06);
        var leftLeg = new THREE.Mesh(legGeo, mat);
        leftLeg.position.set(-0.1, 0.07, 0);
        group.add(leftLeg);
        var rightLeg = new THREE.Mesh(legGeo, mat);
        rightLeg.position.set(0.1, 0.07, 0);
        group.add(rightLeg);

        // Flame on top — animated via update
        var flameMat = this._makeMat(0xffaa00, { emissive: 0xff4400, emissiveIntensity: 1.0 });
        var flameGeo = new THREE.ConeGeometry(0.15, 0.3, 6);
        var flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(0, 0.8, 0);
        group.add(flame);

        // Imp light
        var impLight = new THREE.PointLight(0xff4400, 0.4, 4);
        impLight.position.set(0, 0.5, 0);
        group.add(impLight);

        group.scale.set(type.scale, type.scale, type.scale);
        return { group: group, parts: { body: body, flame: flame, light: impLight } };
    },

    _buildIceWolf: function (type) {
        var group = new THREE.Group();
        var mat = this._makeMat(type.color, { emissive: type.color, emissiveIntensity: 0.2 });

        // Body
        var bodyGeo = new THREE.BoxGeometry(0.4, 0.4, 0.8);
        var body = new THREE.Mesh(bodyGeo, mat);
        body.position.set(0, 0.5, 0);
        body.castShadow = true;
        group.add(body);

        // Head with snout
        var headGeo = new THREE.BoxGeometry(0.25, 0.2, 0.3);
        var head = new THREE.Mesh(headGeo, mat);
        head.position.set(0, 0.6, 0.5);
        group.add(head);
        var snoutGeo = new THREE.BoxGeometry(0.15, 0.12, 0.2);
        var snout = new THREE.Mesh(snoutGeo, mat);
        snout.position.set(0, 0.55, 0.7);
        group.add(snout);

        // Eyes
        var eyeGeo = new THREE.SphereGeometry(0.04, 6, 4);
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0x00ccff, emissive: 0x00ccff, emissiveIntensity: 0.8 });
        var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.1, 0.65, 0.62);
        group.add(leftEye);
        var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.1, 0.65, 0.62);
        group.add(rightEye);

        // Legs x4
        var legGeo = new THREE.BoxGeometry(0.1, 0.35, 0.1);
        var legPositions = [[-0.15, 0.17, 0.25], [0.15, 0.17, 0.25], [-0.15, 0.17, -0.25], [0.15, 0.17, -0.25]];
        var legs = [];
        for (var i = 0; i < 4; i++) {
            var leg = new THREE.Mesh(legGeo, mat);
            leg.position.set(legPositions[i][0], legPositions[i][1], legPositions[i][2]);
            group.add(leg);
            legs.push(leg);
        }

        // Crystalline spikes on back
        var spikeMat = this._makeMat(0xaaddff, { emissive: 0x88ccff, emissiveIntensity: 0.5 });
        var spikeGeo = new THREE.ConeGeometry(0.06, 0.2, 4);
        for (var s = 0; s < 3; s++) {
            var spike = new THREE.Mesh(spikeGeo, spikeMat);
            spike.position.set(0, 0.8, -0.2 + s * 0.2);
            group.add(spike);
        }

        // Tail
        var tailGeo = new THREE.CylinderGeometry(0.04, 0.02, 0.4, 6);
        var tail = new THREE.Mesh(tailGeo, mat);
        tail.position.set(0, 0.5, -0.6);
        tail.rotation.x = Math.PI / 2 + 0.3;
        group.add(tail);

        group.scale.set(type.scale, type.scale, type.scale);
        return { group: group, parts: { body: body, head: head, legs: legs } };
    },

    _buildDarkMage: function (type) {
        var group = new THREE.Group();
        var mat = this._makeMat(type.color, { emissive: type.color, emissiveIntensity: 0.3 });

        // Robe body (cone shape)
        var robeGeo = new THREE.ConeGeometry(0.4, 1.5, 8);
        var robe = new THREE.Mesh(robeGeo, mat);
        robe.position.set(0, 0.75, 0);
        robe.castShadow = true;
        group.add(robe);

        // Head (hidden in hood)
        var headGeo = new THREE.SphereGeometry(0.25, 10, 8);
        var headMat = this._makeMat(0x1a001a, { emissive: type.color, emissiveIntensity: 0.1 });
        var head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0, 1.6, 0);
        group.add(head);

        // Hood
        var hoodGeo = new THREE.ConeGeometry(0.3, 0.4, 8);
        var hood = new THREE.Mesh(hoodGeo, mat);
        hood.position.set(0, 1.85, 0);
        group.add(hood);

        // Glowing eyes
        var eyeGeo = new THREE.SphereGeometry(0.04, 6, 4);
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 1.0 });
        var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.08, 1.65, 0.2);
        group.add(leftEye);
        var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.08, 1.65, 0.2);
        group.add(rightEye);

        // Staff
        var staffMat = this._makeMat(0x3a003a, { emissive: type.color, emissiveIntensity: 0.2 });
        var staffGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6);
        var staff = new THREE.Mesh(staffGeo, staffMat);
        staff.position.set(0.4, 0.9, 0);
        group.add(staff);

        // Staff orb
        var orbMat = this._makeMat(0xcc00ff, { emissive: 0xff00ff, emissiveIntensity: 0.8 });
        var orbGeo = new THREE.SphereGeometry(0.1, 8, 6);
        var orb = new THREE.Mesh(orbGeo, orbMat);
        orb.position.set(0.4, 1.7, 0);
        group.add(orb);

        // Orb light
        var orbLight = new THREE.PointLight(0xff00ff, 0.4, 5);
        orbLight.position.copy(orb.position);
        group.add(orbLight);

        group.scale.set(type.scale, type.scale, type.scale);
        return { group: group, parts: { body: robe, head: head, orb: orb } };
    },

    /* -----------------------------------------------------------------------
     * Boss mesh builders
     * -------------------------------------------------------------------- */

    _buildGreatNaga: function (type) {
        var group = new THREE.Group();
        var mat = this._makeMat(type.color, { emissive: type.color, emissiveIntensity: 0.3 });

        // Serpent body — chain of 8 connected spheres
        var segments = [];
        for (var i = 0; i < 8; i++) {
            var radius = 0.8 - i * 0.05;
            var segGeo = new THREE.SphereGeometry(radius, 12, 8);
            var seg = new THREE.Mesh(segGeo, mat);
            seg.position.set(
                Math.sin(i * 0.5) * 1.5,
                0.8 + Math.sin(i * 0.3) * 0.3,
                -i * 1.2
            );
            seg.castShadow = true;
            group.add(seg);
            segments.push(seg);
        }

        // Head — large sphere
        var headGeo = new THREE.SphereGeometry(1.0, 16, 12);
        var head = new THREE.Mesh(headGeo, mat);
        head.position.set(0, 1.5, 2.0);
        head.castShadow = true;
        group.add(head);

        // Crest on head
        var crestMat = this._makeMat(0x00ff44, { emissive: 0x00ff44, emissiveIntensity: 0.5 });
        var crestGeo = new THREE.PlaneGeometry(1.0, 0.5);
        var crest = new THREE.Mesh(crestGeo, crestMat);
        crest.position.set(0, 2.5, 2.0);
        crest.material.side = THREE.DoubleSide;
        group.add(crest);

        // Glowing green eyes
        var eyeGeo = new THREE.SphereGeometry(0.15, 8, 6);
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 1.0 });
        var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.4, 1.7, 2.8);
        group.add(leftEye);
        var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.4, 1.7, 2.8);
        group.add(rightEye);

        // Fangs
        var fangGeo = new THREE.ConeGeometry(0.08, 0.3, 4);
        var fangMat = this._makeMat(0xffffff);
        var leftFang = new THREE.Mesh(fangGeo, fangMat);
        leftFang.position.set(-0.3, 0.8, 2.7);
        leftFang.rotation.x = Math.PI;
        group.add(leftFang);
        var rightFang = new THREE.Mesh(fangGeo, fangMat);
        rightFang.position.set(0.3, 0.8, 2.7);
        rightFang.rotation.x = Math.PI;
        group.add(rightFang);

        // Boss health bar light
        var bossLight = new THREE.PointLight(type.color, 0.6, 10);
        bossLight.position.set(0, 3, 2);
        group.add(bossLight);

        return { group: group, parts: { head: head, segments: segments, crest: crest } };
    },

    _buildGenali: function (type) {
        var group = new THREE.Group();
        var mat = this._makeMat(type.color, { emissive: type.color, emissiveIntensity: 0.4 });

        // Larger serpent with 12 segments
        var segments = [];
        for (var i = 0; i < 12; i++) {
            var radius = 0.9 - i * 0.04;
            var segGeo = new THREE.SphereGeometry(radius, 12, 8);
            var seg = new THREE.Mesh(segGeo, mat);
            seg.position.set(
                Math.sin(i * 0.4) * 2.0,
                0.9 + Math.sin(i * 0.25) * 0.4,
                -i * 1.0
            );
            seg.castShadow = true;
            group.add(seg);
            segments.push(seg);
        }

        // Head
        var headGeo = new THREE.SphereGeometry(1.2, 16, 12);
        var head = new THREE.Mesh(headGeo, mat);
        head.position.set(0, 2.0, 2.5);
        head.castShadow = true;
        group.add(head);

        // Cobra hood
        var hoodMat = this._makeMat(type.color, { emissive: 0x6600cc, emissiveIntensity: 0.5 });
        var hoodGeo = new THREE.PlaneGeometry(1.5, 1.0);
        var hood = new THREE.Mesh(hoodGeo, hoodMat);
        hood.position.set(0, 2.5, 1.8);
        hood.material.side = THREE.DoubleSide;
        group.add(hood);

        // Second hood panel (perpendicular for thickness)
        var hood2 = new THREE.Mesh(hoodGeo, hoodMat);
        hood2.position.set(0, 2.5, 1.8);
        hood2.rotation.y = Math.PI / 2;
        hood2.material.side = THREE.DoubleSide;
        group.add(hood2);

        // Glowing eyes
        var eyeGeo = new THREE.SphereGeometry(0.18, 8, 6);
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0 });
        var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.5, 2.2, 3.2);
        group.add(leftEye);
        var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.5, 2.2, 3.2);
        group.add(rightEye);

        // Fangs
        var fangGeo = new THREE.ConeGeometry(0.1, 0.4, 4);
        var fangMat = this._makeMat(0xeeeeff);
        var leftFang = new THREE.Mesh(fangGeo, fangMat);
        leftFang.position.set(-0.35, 1.0, 3.2);
        leftFang.rotation.x = Math.PI;
        group.add(leftFang);
        var rightFang = new THREE.Mesh(fangGeo, fangMat);
        rightFang.position.set(0.35, 1.0, 3.2);
        rightFang.rotation.x = Math.PI;
        group.add(rightFang);

        // Boss light
        var bossLight = new THREE.PointLight(type.color, 0.8, 12);
        bossLight.position.set(0, 3, 2);
        group.add(bossLight);

        return { group: group, parts: { head: head, segments: segments, hood: hood } };
    },

    _buildDemonHarimau: function (type) {
        var group = new THREE.Group();
        var mat = this._makeMat(type.color, { emissive: type.color, emissiveIntensity: 0.4 });

        // Giant tiger body (scaled up)
        var bodyGeo = new THREE.BoxGeometry(1.5, 1.5, 3.5);
        var body = new THREE.Mesh(bodyGeo, mat);
        body.position.set(0, 1.5, 0);
        body.castShadow = true;
        group.add(body);

        // Head
        var headGeo = new THREE.SphereGeometry(0.9, 14, 10);
        var head = new THREE.Mesh(headGeo, mat);
        head.position.set(0, 2.2, 2.2);
        head.castShadow = true;
        group.add(head);

        // Horns (extra, demon version)
        var hornGeo = new THREE.ConeGeometry(0.12, 0.6, 6);
        var hornMat = this._makeMat(0x330000, { emissive: 0xff0000, emissiveIntensity: 0.5 });
        var leftHorn = new THREE.Mesh(hornGeo, hornMat);
        leftHorn.position.set(-0.4, 3.0, 2.2);
        leftHorn.rotation.z = 0.3;
        group.add(leftHorn);
        var rightHorn = new THREE.Mesh(hornGeo, hornMat);
        rightHorn.position.set(0.4, 3.0, 2.2);
        rightHorn.rotation.z = -0.3;
        group.add(rightHorn);

        // Ears
        var earGeo = new THREE.ConeGeometry(0.15, 0.35, 4);
        var leftEar = new THREE.Mesh(earGeo, mat);
        leftEar.position.set(-0.5, 3.0, 2.0);
        group.add(leftEar);
        var rightEar = new THREE.Mesh(earGeo, mat);
        rightEar.position.set(0.5, 3.0, 2.0);
        group.add(rightEar);

        // Flaming eyes
        var eyeGeo = new THREE.SphereGeometry(0.12, 8, 6);
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.0 });
        var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.35, 2.4, 2.9);
        group.add(leftEye);
        var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.35, 2.4, 2.9);
        group.add(rightEye);

        // Legs x4
        var legGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8);
        var legPositions = [[-0.6, 0.5, 1.0], [0.6, 0.5, 1.0], [-0.6, 0.5, -1.0], [0.6, 0.5, -1.0]];
        for (var i = 0; i < 4; i++) {
            var leg = new THREE.Mesh(legGeo, mat);
            leg.position.set(legPositions[i][0], legPositions[i][1], legPositions[i][2]);
            group.add(leg);
        }

        // Shadow cloak (transparent dark sphere)
        var cloakMat = this._makeMat(0x000000, { transparent: true, opacity: 0.2, emissive: 0x330000, emissiveIntensity: 0.3 });
        var cloakGeo = new THREE.SphereGeometry(2.5, 10, 8);
        var cloak = new THREE.Mesh(cloakGeo, cloakMat);
        cloak.position.set(0, 1.5, 0);
        group.add(cloak);

        // Boss light
        var bossLight = new THREE.PointLight(0xff2200, 0.8, 12);
        bossLight.position.set(0, 3, 2);
        group.add(bossLight);

        return { group: group, parts: { body: body, head: head, cloak: cloak } };
    },

    _buildOrangTinggiElder: function (type) {
        var group = new THREE.Group();
        var mat = this._makeMat(type.color, { transparent: true, opacity: 0.7, emissive: type.color, emissiveIntensity: 0.2 });

        // MASSIVE tall body
        var bodyGeo = new THREE.CylinderGeometry(0.5, 0.7, 5.0, 10);
        var body = new THREE.Mesh(bodyGeo, mat);
        body.position.set(0, 2.5, 0);
        body.castShadow = true;
        group.add(body);

        // Head
        var headGeo = new THREE.SphereGeometry(0.6, 12, 10);
        var head = new THREE.Mesh(headGeo, mat);
        head.position.set(0, 6.0, 0);
        head.castShadow = true;
        group.add(head);

        // Lightning eyes
        var eyeGeo = new THREE.SphereGeometry(0.12, 8, 6);
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 1.0 });
        var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.25, 6.1, 0.5);
        group.add(leftEye);
        var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.25, 6.1, 0.5);
        group.add(rightEye);

        // 4 arms (elder has extra pair)
        var armGeo = new THREE.CylinderGeometry(0.1, 0.08, 2.5, 6);
        var armPositions = [
            [-0.8, 3.5, 0, 0.2],
            [0.8, 3.5, 0, -0.2],
            [-0.7, 2.5, 0, 0.3],
            [0.7, 2.5, 0, -0.3]
        ];
        var arms = [];
        for (var a = 0; a < 4; a++) {
            var arm = new THREE.Mesh(armGeo, mat);
            arm.position.set(armPositions[a][0], armPositions[a][1], armPositions[a][2]);
            arm.rotation.z = armPositions[a][3];
            group.add(arm);
            arms.push(arm);
        }

        // Storm clouds around head
        var cloudMat = this._makeMat(0x333344, { transparent: true, opacity: 0.4, emissive: 0x222233, emissiveIntensity: 0.2 });
        for (var c = 0; c < 3; c++) {
            var cloudGeo = new THREE.SphereGeometry(0.8 + Math.random() * 0.4, 8, 6);
            var cloud = new THREE.Mesh(cloudGeo, cloudMat);
            cloud.position.set(
                Math.cos(c * 2.1) * 1.0,
                6.5 + Math.random() * 0.5,
                Math.sin(c * 2.1) * 1.0
            );
            group.add(cloud);
        }

        // Legs
        var legGeo = new THREE.CylinderGeometry(0.12, 0.15, 1.5, 6);
        var leftLeg = new THREE.Mesh(legGeo, mat);
        leftLeg.position.set(-0.25, 0.0, 0);
        group.add(leftLeg);
        var rightLeg = new THREE.Mesh(legGeo, mat);
        rightLeg.position.set(0.25, 0.0, 0);
        group.add(rightLeg);

        // Boss light
        var bossLight = new THREE.PointLight(0xffff00, 0.6, 15);
        bossLight.position.set(0, 6, 0);
        group.add(bossLight);

        return { group: group, parts: { body: body, head: head, arms: arms } };
    },

    _buildShadowSultan: function (type) {
        var group = new THREE.Group();
        var mat = this._makeMat(type.color, { emissive: type.color, emissiveIntensity: 0.4 });

        // Dark humanoid body — royal armor silhouette
        var torsoGeo = new THREE.BoxGeometry(0.9, 1.1, 0.6);
        var torso = new THREE.Mesh(torsoGeo, mat);
        torso.position.set(0, 1.4, 0);
        torso.castShadow = true;
        group.add(torso);

        // Shoulder armor
        var shoulderGeo = new THREE.BoxGeometry(0.35, 0.2, 0.35);
        var shoulderMat = this._makeMat(0x220044, { emissive: 0x440088, emissiveIntensity: 0.4 });
        var leftShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
        leftShoulder.position.set(-0.65, 1.85, 0);
        group.add(leftShoulder);
        var rightShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
        rightShoulder.position.set(0.65, 1.85, 0);
        group.add(rightShoulder);

        // Head
        var headGeo = new THREE.SphereGeometry(0.35, 14, 10);
        var headMat = this._makeMat(0x0a0015, { emissive: type.color, emissiveIntensity: 0.3 });
        var head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0, 2.2, 0);
        group.add(head);

        // Dark crown with purple gems
        var crownMat = this._makeMat(0x1a0033, { emissive: 0x660099, emissiveIntensity: 0.6 });
        var crownGeo = new THREE.TorusGeometry(0.28, 0.05, 8, 16);
        var crown = new THREE.Mesh(crownGeo, crownMat);
        crown.position.set(0, 2.5, 0);
        crown.rotation.x = Math.PI / 2;
        group.add(crown);

        // Crown spikes with gems
        var gemMat = this._makeMat(0xaa00ff, { emissive: 0xcc00ff, emissiveIntensity: 1.0 });
        var spikeGeo = new THREE.ConeGeometry(0.06, 0.2, 6);
        var gemGeo = new THREE.SphereGeometry(0.04, 6, 4);
        for (var i = 0; i < 5; i++) {
            var angle = (i / 5) * Math.PI * 2;
            var spike = new THREE.Mesh(spikeGeo, crownMat);
            spike.position.set(
                Math.cos(angle) * 0.28,
                2.65,
                Math.sin(angle) * 0.28
            );
            group.add(spike);
            var gem = new THREE.Mesh(gemGeo, gemMat);
            gem.position.set(
                Math.cos(angle) * 0.28,
                2.75,
                Math.sin(angle) * 0.28
            );
            group.add(gem);
        }

        // Glowing eyes
        var eyeGeo = new THREE.SphereGeometry(0.06, 6, 4);
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 1.0 });
        var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.12, 2.25, 0.3);
        group.add(leftEye);
        var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.12, 2.25, 0.3);
        group.add(rightEye);

        // Arms
        var armGeo = new THREE.BoxGeometry(0.2, 0.9, 0.2);
        var leftArm = new THREE.Mesh(armGeo, mat);
        leftArm.position.set(-0.65, 1.3, 0);
        group.add(leftArm);
        var rightArmPivot = new THREE.Group();
        rightArmPivot.position.set(0.65, 1.8, 0);
        var rightArm = new THREE.Mesh(armGeo, mat);
        rightArm.position.set(0, -0.4, 0);
        rightArmPivot.add(rightArm);
        group.add(rightArmPivot);

        // Dark sword
        var swordMat = this._makeMat(0x220044, { emissive: 0x660099, emissiveIntensity: 0.6 });
        var swordGeo = new THREE.BoxGeometry(0.1, 1.2, 0.04);
        var sword = new THREE.Mesh(swordGeo, swordMat);
        sword.position.set(0, -1.0, 0.15);
        rightArmPivot.add(sword);

        // Legs
        var legGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
        var leftLeg = new THREE.Mesh(legGeo, mat);
        leftLeg.position.set(-0.2, 0.4, 0);
        group.add(leftLeg);
        var rightLeg = new THREE.Mesh(legGeo, mat);
        rightLeg.position.set(0.2, 0.4, 0);
        group.add(rightLeg);

        // Shadow cape
        var capeMat = this._makeMat(0x0a0015, { transparent: true, opacity: 0.5, emissive: type.color, emissiveIntensity: 0.2 });
        var capeGeo = new THREE.PlaneGeometry(1.2, 1.5);
        var cape = new THREE.Mesh(capeGeo, capeMat);
        cape.position.set(0, 1.3, -0.35);
        group.add(cape);

        // Floating slightly off ground
        group.position.y = 0.3;

        // Boss light
        var bossLight = new THREE.PointLight(0xaa00ff, 0.8, 10);
        bossLight.position.set(0, 2.5, 0);
        group.add(bossLight);

        return { group: group, parts: { body: torso, head: head, rightArmPivot: rightArmPivot, cape: cape, crown: crown } };
    },

    /* -----------------------------------------------------------------------
     * _buildMonsterMesh — dispatcher that picks the right builder
     * -------------------------------------------------------------------- */
    _buildMonsterMesh: function (typeKey, type, isBoss) {
        if (isBoss) {
            switch (typeKey) {
                case 'great_naga':       return this._buildGreatNaga(type);
                case 'genali':           return this._buildGenali(type);
                case 'demon_harimau':    return this._buildDemonHarimau(type);
                case 'orang_tinggi_elder': return this._buildOrangTinggiElder(type);
                case 'shadow_sultan':    return this._buildShadowSultan(type);
                default: return this._buildSpiritWarrior(type);
            }
        } else {
            switch (typeKey) {
                case 'galap':            return this._buildGalap(type);
                case 'buaya_putih':      return this._buildBuayaPutih(type);
                case 'harimau_jadian':   return this._buildHarimauJadian(type);
                case 'orang_tinggi':     return this._buildOrangTinggi(type);
                case 'spirit_warrior':   return this._buildSpiritWarrior(type);
                case 'fire_imp':         return this._buildFireImp(type);
                case 'ice_wolf':         return this._buildIceWolf(type);
                case 'dark_mage':        return this._buildDarkMage(type);
                default: return this._buildSpiritWarrior(type);
            }
        }
    },

    /* -----------------------------------------------------------------------
     * AI behavior — _updateBehavior called from monster.update
     * -------------------------------------------------------------------- */
    _behaviors: {
        /* --- charge: move straight toward player, attack when in range --- */
        charge: function (monster, delta, playerPosition) {
            var dir = new THREE.Vector3().subVectors(playerPosition, monster.mesh.position);
            var dist = dir.length();
            dir.normalize();

            // Face the player
            monster.mesh.lookAt(playerPosition.x, monster.mesh.position.y, playerPosition.z);

            if (dist <= monster.attackRange) {
                monster.state = 'attack';
                monster.attackTimer -= delta;
                if (monster.attackTimer <= 0) {
                    monster.attackTimer = monster.attackSpeed;
                    monster._pendingAttack = true;
                }
            } else {
                monster.state = 'chase';
                monster.mesh.position.addScaledVector(dir, monster.speed * delta);
            }
        },

        /* --- lunge: circle at distance, then quick dash attack --- */
        lunge: function (monster, delta, playerPosition) {
            var dir = new THREE.Vector3().subVectors(playerPosition, monster.mesh.position);
            var dist = dir.length();
            dir.normalize();

            monster.mesh.lookAt(playerPosition.x, monster.mesh.position.y, playerPosition.z);

            if (!monster._lungeTimer) monster._lungeTimer = 0;
            monster._lungeTimer += delta;

            if (monster._isLunging) {
                // Quick dash toward player
                monster.mesh.position.addScaledVector(dir, monster.speed * 3.0 * delta);
                monster._lungeTime -= delta;
                if (monster._lungeTime <= 0 || dist <= monster.attackRange) {
                    monster._isLunging = false;
                    monster._lungeTimer = 0;
                    if (dist <= monster.attackRange + 1) {
                        monster._pendingAttack = true;
                        monster.attackTimer = monster.attackSpeed;
                    }
                }
            } else if (monster._lungeTimer > 2.0 && dist < 8) {
                // Start lunge
                monster._isLunging = true;
                monster._lungeTime = 0.4;
            } else {
                // Circle at distance
                var perpendicular = new THREE.Vector3(-dir.z, 0, dir.x);
                if (dist > 5) {
                    monster.mesh.position.addScaledVector(dir, monster.speed * 0.5 * delta);
                } else if (dist < 3) {
                    monster.mesh.position.addScaledVector(dir, -monster.speed * 0.5 * delta);
                }
                monster.mesh.position.addScaledVector(perpendicular, monster.speed * 0.8 * delta);
                monster.state = 'chase';
            }
        },

        /* --- stalk: sneak up then surprise pounce --- */
        stalk: function (monster, delta, playerPosition) {
            var dir = new THREE.Vector3().subVectors(playerPosition, monster.mesh.position);
            var dist = dir.length();
            dir.normalize();

            monster.mesh.lookAt(playerPosition.x, monster.mesh.position.y, playerPosition.z);

            if (!monster._stalkTimer) monster._stalkTimer = 0;
            monster._stalkTimer += delta;

            if (monster._isPouncing) {
                monster.mesh.position.addScaledVector(dir, monster.speed * 2.5 * delta);
                monster._pounceTime -= delta;
                if (monster._pounceTime <= 0 || dist <= monster.attackRange) {
                    monster._isPouncing = false;
                    monster._stalkTimer = 0;
                    if (dist <= monster.attackRange + 1) {
                        monster._pendingAttack = true;
                        monster.attackTimer = monster.attackSpeed;
                    }
                }
            } else if (dist <= monster.attackRange) {
                monster.state = 'attack';
                monster.attackTimer -= delta;
                if (monster.attackTimer <= 0) {
                    monster.attackTimer = monster.attackSpeed;
                    monster._pendingAttack = true;
                }
            } else if (dist < 5 && monster._stalkTimer > 1.5) {
                // Pounce!
                monster._isPouncing = true;
                monster._pounceTime = 0.3;
            } else {
                // Slow approach with offset to avoid direct path
                var offset = new THREE.Vector3(-dir.z, 0, dir.x);
                var sineOffset = Math.sin(monster._stalkTimer * 2) * 0.5;
                monster.mesh.position.addScaledVector(dir, monster.speed * 0.4 * delta);
                monster.mesh.position.addScaledVector(offset, sineOffset * delta);
                monster.state = 'chase';
            }
        },

        /* --- sweep: slow approach, wide sweeping attacks --- */
        sweep: function (monster, delta, playerPosition) {
            var dir = new THREE.Vector3().subVectors(playerPosition, monster.mesh.position);
            var dist = dir.length();
            dir.normalize();

            monster.mesh.lookAt(playerPosition.x, monster.mesh.position.y, playerPosition.z);

            if (dist <= monster.attackRange) {
                monster.state = 'attack';
                monster.attackTimer -= delta;
                if (monster.attackTimer <= 0) {
                    monster.attackTimer = monster.attackSpeed;
                    monster._pendingAttack = true;
                    monster._sweepAttack = true; // wider range
                }
            } else {
                monster.state = 'chase';
                monster.mesh.position.addScaledVector(dir, monster.speed * delta);
            }
        },

        /* --- chase: direct chase with minor path adjustment --- */
        chase: function (monster, delta, playerPosition) {
            var dir = new THREE.Vector3().subVectors(playerPosition, monster.mesh.position);
            var dist = dir.length();
            dir.normalize();

            monster.mesh.lookAt(playerPosition.x, monster.mesh.position.y, playerPosition.z);

            if (dist <= monster.attackRange) {
                monster.state = 'attack';
                monster.attackTimer -= delta;
                if (monster.attackTimer <= 0) {
                    monster.attackTimer = monster.attackSpeed;
                    monster._pendingAttack = true;
                }
            } else {
                monster.state = 'chase';
                // Slight zigzag
                if (!monster._chaseTime) monster._chaseTime = Math.random() * Math.PI * 2;
                monster._chaseTime += delta;
                var offset = new THREE.Vector3(-dir.z, 0, dir.x);
                var zig = Math.sin(monster._chaseTime * 3) * 0.2;
                monster.mesh.position.addScaledVector(dir, monster.speed * delta);
                monster.mesh.position.addScaledVector(offset, zig * delta);
            }
        },

        /* --- ranged: keep distance, fire projectiles --- */
        ranged: function (monster, delta, playerPosition) {
            var dir = new THREE.Vector3().subVectors(playerPosition, monster.mesh.position);
            var dist = dir.length();
            dir.normalize();

            monster.mesh.lookAt(playerPosition.x, monster.mesh.position.y, playerPosition.z);

            // Try to maintain ideal distance
            var idealDist = monster.attackRange * 0.7;
            if (dist < idealDist - 1) {
                // Too close, back away
                monster.mesh.position.addScaledVector(dir, -monster.speed * 0.8 * delta);
                monster.state = 'chase';
            } else if (dist > monster.attackRange) {
                // Too far, approach
                monster.mesh.position.addScaledVector(dir, monster.speed * 0.6 * delta);
                monster.state = 'chase';
            } else {
                // In range — strafe and shoot
                var perpendicular = new THREE.Vector3(-dir.z, 0, dir.x);
                if (!monster._strafeDir) monster._strafeDir = 1;
                if (!monster._strafeDirTimer) monster._strafeDirTimer = 0;
                monster._strafeDirTimer += delta;
                if (monster._strafeDirTimer > 2) {
                    monster._strafeDir *= -1;
                    monster._strafeDirTimer = 0;
                }
                monster.mesh.position.addScaledVector(perpendicular, monster.speed * 0.5 * monster._strafeDir * delta);

                monster.state = 'attack';
                monster.attackTimer -= delta;
                if (monster.attackTimer <= 0) {
                    monster.attackTimer = monster.attackSpeed;
                    monster._pendingProjectile = true;
                }
            }
        },

        /* --- pack: flanking chase behavior --- */
        pack: function (monster, delta, playerPosition) {
            var dir = new THREE.Vector3().subVectors(playerPosition, monster.mesh.position);
            var dist = dir.length();
            dir.normalize();

            monster.mesh.lookAt(playerPosition.x, monster.mesh.position.y, playerPosition.z);

            if (dist <= monster.attackRange) {
                monster.state = 'attack';
                monster.attackTimer -= delta;
                if (monster.attackTimer <= 0) {
                    monster.attackTimer = monster.attackSpeed;
                    monster._pendingAttack = true;
                }
            } else {
                monster.state = 'chase';
                // Flank — offset angle from direct path
                if (!monster._flankAngle) monster._flankAngle = (Math.random() - 0.5) * 1.2;
                var perpendicular = new THREE.Vector3(-dir.z, 0, dir.x);
                monster.mesh.position.addScaledVector(dir, monster.speed * 0.9 * delta);
                monster.mesh.position.addScaledVector(perpendicular, monster.speed * monster._flankAngle * delta);
            }
        },

        /* --- Boss: Naga — circle arena, periodic lunge --- */
        boss_naga: function (monster, delta, playerPosition) {
            var dir = new THREE.Vector3().subVectors(playerPosition, monster.mesh.position);
            var dist = dir.length();
            dir.normalize();

            monster.mesh.lookAt(playerPosition.x, monster.mesh.position.y, playerPosition.z);

            if (!monster._bossTimer) monster._bossTimer = 0;
            monster._bossTimer += delta;

            // Phase change at 50% hp
            if (monster.hp < monster.maxHp * 0.5 && monster.currentPhase === 0) {
                monster.currentPhase = 1;
                monster.speed *= 1.3;
                monster.damage = Math.round(monster.damage * 1.2);
            }

            // Circling pattern
            var perpendicular = new THREE.Vector3(-dir.z, 0, dir.x);

            if (monster._isLunging) {
                monster.mesh.position.addScaledVector(dir, monster.speed * 2.5 * delta);
                monster._lungeTime -= delta;
                if (monster._lungeTime <= 0 || dist <= monster.attackRange) {
                    monster._isLunging = false;
                    monster._bossTimer = 0;
                    if (dist <= monster.attackRange + 2) {
                        monster._pendingAttack = true;
                        monster.attackTimer = monster.attackSpeed;
                    }
                }
            } else if (monster._bossTimer > 3.0) {
                // Lunge attack
                monster._isLunging = true;
                monster._lungeTime = 0.6;
            } else {
                // Circle and maintain distance
                if (dist > 8) {
                    monster.mesh.position.addScaledVector(dir, monster.speed * 0.6 * delta);
                } else if (dist < 4) {
                    monster.mesh.position.addScaledVector(dir, -monster.speed * 0.3 * delta);
                }
                monster.mesh.position.addScaledVector(perpendicular, monster.speed * 0.7 * delta);
            }

            // Phase 2 special: occasional ranged attack
            if (monster.currentPhase >= 1) {
                if (!monster._specialTimer) monster._specialTimer = 0;
                monster._specialTimer += delta;
                if (monster._specialTimer > 4) {
                    monster._specialTimer = 0;
                    monster._pendingProjectile = true;
                }
            }

            // Animate serpent segments (undulating)
            if (monster.parts.segments) {
                for (var s = 0; s < monster.parts.segments.length; s++) {
                    var seg = monster.parts.segments[s];
                    var baseX = Math.sin((s * 0.5) + monster._bossTimer * 2) * 1.5;
                    var baseY = 0.8 + Math.sin((s * 0.3) + monster._bossTimer * 1.5) * 0.3;
                    seg.position.x = baseX;
                    seg.position.y = baseY;
                }
            }
        },

        /* --- Boss: Serpent — similar to naga but with poison --- */
        boss_serpent: function (monster, delta, playerPosition) {
            // Reuse naga behavior with enhancements
            GAME.Monsters._behaviors.boss_naga(monster, delta, playerPosition);

            // Additional: more frequent projectiles (poison)
            if (!monster._poisonTimer) monster._poisonTimer = 0;
            monster._poisonTimer += delta;
            if (monster._poisonTimer > 2.5) {
                monster._poisonTimer = 0;
                monster._pendingProjectile = true;
            }
        },

        /* --- Boss: Tiger — dash attacks, phase 2 shadow clones --- */
        boss_tiger: function (monster, delta, playerPosition) {
            var dir = new THREE.Vector3().subVectors(playerPosition, monster.mesh.position);
            var dist = dir.length();
            dir.normalize();

            monster.mesh.lookAt(playerPosition.x, monster.mesh.position.y, playerPosition.z);

            if (!monster._bossTimer) monster._bossTimer = 0;
            monster._bossTimer += delta;

            // Phase change at 50% hp
            if (monster.hp < monster.maxHp * 0.5 && monster.currentPhase === 0) {
                monster.currentPhase = 1;
                monster.speed *= 1.4;
                monster._spawnClones = true;
            }

            if (monster._isDashing) {
                monster.mesh.position.addScaledVector(monster._dashDir, monster.speed * 3.0 * delta);
                monster._dashTime -= delta;
                if (monster._dashTime <= 0) {
                    monster._isDashing = false;
                    monster._bossTimer = 0;
                    monster._pendingAttack = true;
                }
            } else if (monster._bossTimer > 2.0 && dist < 12) {
                // Dash attack
                monster._isDashing = true;
                monster._dashDir = dir.clone();
                monster._dashTime = 0.35;
            } else {
                if (dist > monster.attackRange) {
                    monster.mesh.position.addScaledVector(dir, monster.speed * delta);
                } else {
                    monster.attackTimer -= delta;
                    if (monster.attackTimer <= 0) {
                        monster.attackTimer = monster.attackSpeed;
                        monster._pendingAttack = true;
                    }
                }
            }
        },

        /* --- Boss: Giant — ground pounds, phase 2 summon minions --- */
        boss_giant: function (monster, delta, playerPosition) {
            var dir = new THREE.Vector3().subVectors(playerPosition, monster.mesh.position);
            var dist = dir.length();
            dir.normalize();

            monster.mesh.lookAt(playerPosition.x, monster.mesh.position.y, playerPosition.z);

            if (!monster._bossTimer) monster._bossTimer = 0;
            monster._bossTimer += delta;

            // Phase changes
            if (monster.hp < monster.maxHp * 0.6 && monster.currentPhase === 0) {
                monster.currentPhase = 1;
                monster._spawnMinions = true;
            }
            if (monster.hp < monster.maxHp * 0.3 && monster.currentPhase === 1) {
                monster.currentPhase = 2;
                monster.speed *= 1.3;
                monster.damage = Math.round(monster.damage * 1.3);
            }

            if (dist <= monster.attackRange) {
                monster.state = 'attack';
                monster.attackTimer -= delta;
                if (monster.attackTimer <= 0) {
                    monster.attackTimer = monster.attackSpeed;
                    monster._pendingAttack = true;
                    monster._groundPound = true;
                }
            } else {
                monster.state = 'chase';
                monster.mesh.position.addScaledVector(dir, monster.speed * delta);
            }

            // Periodic shockwave
            if (monster._bossTimer > 5.0) {
                monster._bossTimer = 0;
                monster._pendingShockwave = true;
            }
        },

        /* --- Boss: Final — mirrors, teleports, multi-phase --- */
        boss_final: function (monster, delta, playerPosition) {
            var dir = new THREE.Vector3().subVectors(playerPosition, monster.mesh.position);
            var dist = dir.length();
            dir.normalize();

            monster.mesh.lookAt(playerPosition.x, monster.mesh.position.y, playerPosition.z);

            if (!monster._bossTimer) monster._bossTimer = 0;
            monster._bossTimer += delta;

            // Phase changes
            if (monster.hp < monster.maxHp * 0.6 && monster.currentPhase === 0) {
                monster.currentPhase = 1;
                monster.speed *= 1.3;
                monster.attackSpeed *= 0.8;
            }
            if (monster.hp < monster.maxHp * 0.3 && monster.currentPhase === 1) {
                monster.currentPhase = 2;
                monster._spawnPillars = true;
                monster.damage = Math.round(monster.damage * 1.3);
            }

            // Teleport periodically
            if (!monster._teleportTimer) monster._teleportTimer = 0;
            monster._teleportTimer += delta;
            if (monster._teleportTimer > 4.0 && dist > 3) {
                monster._teleportTimer = 0;
                // Teleport near player
                var teleportPos = playerPosition.clone();
                var offset = new THREE.Vector3(
                    (Math.random() - 0.5) * 6,
                    0,
                    (Math.random() - 0.5) * 6
                );
                teleportPos.add(offset);
                monster.mesh.position.copy(teleportPos);
            }

            // Attack behavior
            if (dist <= monster.attackRange) {
                monster.state = 'attack';
                monster.attackTimer -= delta;
                if (monster.attackTimer <= 0) {
                    monster.attackTimer = monster.attackSpeed;
                    monster._pendingAttack = true;
                }
            } else {
                monster.state = 'chase';
                monster.mesh.position.addScaledVector(dir, monster.speed * delta);
            }

            // Phase 2+: fire dark projectiles
            if (monster.currentPhase >= 1) {
                if (!monster._projectileTimer) monster._projectileTimer = 0;
                monster._projectileTimer += delta;
                if (monster._projectileTimer > 2.0) {
                    monster._projectileTimer = 0;
                    monster._pendingProjectile = true;
                }
            }

            // Shadow Sultan arm swing animation (mirror player)
            if (monster.parts.rightArmPivot) {
                var swing = Math.sin(monster._bossTimer * 4) * 0.3;
                monster.parts.rightArmPivot.rotation.x = swing;
            }

            // Cape wave
            if (monster.parts.cape) {
                monster.parts.cape.rotation.y = Math.sin(monster._bossTimer * 2) * 0.15;
            }
        }
    },

    /* -----------------------------------------------------------------------
     * createMonster — main factory
     * -------------------------------------------------------------------- */
    createMonster: function (typeKey, position, isBoss) {
        var typeDef;
        if (isBoss) {
            typeDef = this.bossTypes[typeKey];
        } else {
            typeDef = this.types[typeKey];
        }

        if (!typeDef) {
            console.error('Monsters.createMonster: unknown type', typeKey);
            return null;
        }

        // Deep copy the type so we can mutate
        var type = JSON.parse(JSON.stringify(typeDef));

        // Build mesh
        var built = this._buildMonsterMesh(typeKey, type, isBoss);
        var mesh = built.group;
        var parts = built.parts;

        mesh.name = (isBoss ? 'boss_' : 'monster_') + typeKey;
        mesh.position.copy(position);

        // Shadow under monster
        var shadowSize = type.scale * 0.6;
        var shadowGeo = new THREE.CircleGeometry(shadowSize, 12);
        var shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 });
        var shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.02 - mesh.position.y;
        mesh.add(shadow);

        // ---- Monster object ----
        var monster = {
            typeKey: typeKey,
            name: type.name,
            isBoss: !!isBoss,

            // 3D
            mesh: mesh,
            parts: parts,

            // Stats
            hp: type.hp,
            maxHp: type.hp,
            speed: type.speed,
            damage: type.damage,
            attackRange: type.attackRange,
            attackSpeed: type.attackSpeed,
            xpValue: type.xpValue || 0,
            behavior: type.behavior,
            color: type.color,
            scale: type.scale,

            // Boss phases
            phases: type.phases || 1,
            currentPhase: 0,

            // State
            stunned: false,
            stunnedTimer: 0,
            attackTimer: type.attackSpeed,
            state: 'idle',
            target: null,
            healthDropChance: isBoss ? 1.0 : 0.15,

            // Attack flags (set by behavior, consumed by game loop)
            _pendingAttack: false,
            _pendingProjectile: false,
            _pendingShockwave: false,
            _sweepAttack: false,
            _groundPound: false,
            _spawnClones: false,
            _spawnMinions: false,
            _spawnPillars: false,

            // Damage flash
            _flashTimer: 0,
            _originalEmissives: null,

            // Animation
            animationTime: 0,

            /* -----------------------------------------------------------
             * update(delta, playerPosition) — AI + animation
             * -------------------------------------------------------- */
            update: function (delta, playerPosition) {
                if (this.hp <= 0) return;

                this.animationTime += delta;

                // Stunned state
                if (this.stunned) {
                    this.stunnedTimer -= delta;
                    if (this.stunnedTimer <= 0) {
                        this.stunned = false;
                    }
                    // Wobble while stunned
                    this.mesh.rotation.z = Math.sin(this.animationTime * 15) * 0.15;
                    return;
                } else {
                    this.mesh.rotation.z = 0;
                }

                // Run AI behavior
                var behaviorFn = GAME.Monsters._behaviors[this.behavior];
                if (behaviorFn && playerPosition) {
                    behaviorFn(this, delta, playerPosition);
                }

                // Keep inside arena
                var arenaSize = (GAME.Levels && GAME.Levels.arenaSize) ? GAME.Levels.arenaSize : 35;
                this.mesh.position.x = Math.max(-arenaSize, Math.min(arenaSize, this.mesh.position.x));
                this.mesh.position.z = Math.max(-arenaSize, Math.min(arenaSize, this.mesh.position.z));

                // Idle bob — use absolute set, NOT additive (fixes drift bug)
                if (this.state !== 'attack' && !this.isBoss) {
                    var bob = Math.sin(this.animationTime * 2.5) * 0.05;
                    this.mesh.position.y = bob;
                }

                // Boss breathing/hover effect
                if (this.isBoss) {
                    var bossBob = Math.sin(this.animationTime * 1.5) * 0.08;
                    this.mesh.position.y = bossBob + 0.3;
                }

                // Fire imp flame flicker
                if (this.typeKey === 'fire_imp' && this.parts.flame) {
                    this.parts.flame.scale.y = 0.8 + Math.random() * 0.4;
                    this.parts.flame.scale.x = 0.8 + Math.random() * 0.3;
                    this.parts.flame.rotation.y = Math.random() * 0.5;
                    if (this.parts.light) {
                        this.parts.light.intensity = 0.3 + Math.random() * 0.3;
                    }
                }

                // Harimau Jadian aura pulse
                if (this.typeKey === 'harimau_jadian' && this.parts.aura) {
                    var auraScale = 1.0 + Math.sin(this.animationTime * 3) * 0.15;
                    this.parts.aura.scale.set(auraScale, auraScale, auraScale);
                    this.parts.aura.material.opacity = 0.1 + Math.sin(this.animationTime * 4) * 0.05;
                }

                // Spirit warrior ghostly float
                if (this.typeKey === 'spirit_warrior') {
                    this.mesh.position.y = 0.15 + Math.sin(this.animationTime * 2) * 0.12;
                }

                // Dark mage orb glow pulse
                if (this.typeKey === 'dark_mage' && this.parts.orb) {
                    var orbPulse = 0.9 + Math.sin(this.animationTime * 5) * 0.15;
                    this.parts.orb.scale.set(orbPulse, orbPulse, orbPulse);
                }

                // Walking animation for quadrupeds
                if (this.parts.legs && this.state === 'chase') {
                    for (var l = 0; l < this.parts.legs.length; l++) {
                        var offset = l * (Math.PI / 2);
                        this.parts.legs[l].rotation.x = Math.sin(this.animationTime * 8 + offset) * 0.4;
                    }
                } else if (this.parts.legs) {
                    // Return legs to neutral when not chasing
                    for (var l = 0; l < this.parts.legs.length; l++) {
                        this.parts.legs[l].rotation.x *= 0.9;
                    }
                }

                // Humanoid arm sway when chasing
                if (this.parts.leftArm && this.state === 'chase') {
                    this.parts.leftArm.rotation.x = Math.sin(this.animationTime * 6) * 0.3;
                }
                if (this.parts.rightArm && this.state === 'chase') {
                    this.parts.rightArm.rotation.x = -Math.sin(this.animationTime * 6) * 0.3;
                }

                // Boss serpent segment undulation
                if (this.parts.segments) {
                    for (var s = 0; s < this.parts.segments.length; s++) {
                        this.parts.segments[s].position.x = Math.sin(this.animationTime * 2 + s * 0.5) * (1.5 + s * 0.1);
                        this.parts.segments[s].position.y = 0.8 + Math.sin(this.animationTime * 1.5 + s * 0.3) * 0.4;
                    }
                }

                // Boss cape flutter (Shadow Sultan)
                if (this.parts.cape) {
                    this.parts.cape.rotation.y = Math.sin(this.animationTime * 3) * 0.15;
                }

                // Damage flash
                if (this._flashTimer > 0) {
                    this._flashTimer -= delta;
                    if (this._flashTimer <= 0) {
                        this._restoreEmissives();
                    }
                }
            },

            /* -----------------------------------------------------------
             * takeDamage(amount) — receive damage
             * -------------------------------------------------------- */
            takeDamage: function (amount) {
                if (this.hp <= 0) return 0;

                var actualDamage = Math.max(1, Math.round(amount));
                this.hp = Math.max(0, this.hp - actualDamage);

                // Flash red
                this._setEmissive(0xff0000, 1.0);
                this._flashTimer = 0.1;

                return actualDamage;
            },

            /* -----------------------------------------------------------
             * isDead()
             * -------------------------------------------------------- */
            isDead: function () {
                return this.hp <= 0;
            },

            /* -----------------------------------------------------------
             * getAttackInfo() — returns current attack data
             * -------------------------------------------------------- */
            getAttackInfo: function () {
                var range = this.attackRange;
                var type = 'melee';

                if (this._sweepAttack) {
                    range = this.attackRange * 1.5;
                    type = 'sweep';
                    this._sweepAttack = false;
                }
                if (this._groundPound) {
                    range = this.attackRange * 1.2;
                    type = 'ground_pound';
                    this._groundPound = false;
                }

                return {
                    damage: this.damage,
                    position: this.mesh.position.clone(),
                    range: range,
                    type: type
                };
            },

            /* -----------------------------------------------------------
             * stun(duration) — stun the monster
             * -------------------------------------------------------- */
            stun: function (duration) {
                this.stunned = true;
                this.stunnedTimer = duration;
                this.state = 'stunned';

                // Visual: flash white briefly
                this._setEmissive(0xffff00, 0.6);
                this._flashTimer = 0.3;
            },

            /* -----------------------------------------------------------
             * Emissive flash helpers (same pattern as heroes)
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

            canAttack: function () {
                return this._pendingAttack;
            },

            resetAttackTimer: function () {
                this._pendingAttack = false;
                this._pendingProjectile = false;
            },

            shouldShoot: function () {
                return this._pendingProjectile;
            }
        };

        return monster;
    }
};
