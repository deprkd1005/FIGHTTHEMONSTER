/* =============================================================================
 * levels.js — Fight the Monster: Brunei Legends Edition
 * 5 iconic Brunei locations as game levels with procedural environments
 * Uses global namespace: window.GAME.Levels
 * Three.js accessed via global THREE
 * ========================================================================== */

window.GAME = window.GAME || {};

GAME.Levels = {
    // Arena half-size (bounds are from -arenaSize to +arenaSize)
    arenaSize: 35,

    definitions: [
        // =====================================================================
        // LEVEL 0: KAMPONG AYER (The Water Village)
        // =====================================================================
        {
            name: 'Kampong Ayer',
            subtitle: 'The Water Village',
            description: 'Defend the cultural heart of Brunei from the creatures of the deep.',
            skyColor: 0x87ceeb,    // clear sky blue
            fogColor: 0xe0f2fe,    // light blue-white morning fog
            fogNear: 40,
            fogFar: 100,
            ambientLight: 0xffffff, // clean white ambient light
            ambientIntensity: 0.65,
            directionalColor: 0xfffdf0, // warm morning sunlight
            directionalIntensity: 1.0,
            groundColor: 0x2478c8,  // vibrant blue river water
            waves: [
                [{ type: 'galap', count: 3 }],
                [{ type: 'galap', count: 3 }, { type: 'buaya_putih', count: 2 }],
                [{ type: 'buaya_putih', count: 4 }, { type: 'galap', count: 2 }]
            ],
            bossType: 'great_naga',
            fact: 'Kampong Ayer has been the heart of Brunei for over 1,000 years, earning the title "Venice of the East".',
            createEnvironment(group) {
                // GROUND: Large water plane with segments for wave simulation
                const waterGeo = new THREE.PlaneGeometry(120, 120, 32, 32);
                const waterMat = new THREE.MeshStandardMaterial({
                    color: this.groundColor,
                    emissive: 0x071b30,
                    metalness: 0.15,
                    roughness: 0.5,
                    flatShading: true
                });
                const water = new THREE.Mesh(waterGeo, waterMat);
                water.rotation.x = -Math.PI / 2;
                water.position.y = -0.12;
                water.receiveShadow = true;
                water.name = 'water_wave';
                group.add(water);

                // Central fighting platform (wooden docks)
                const platformMat = new THREE.MeshStandardMaterial({ color: 0x543a2b, roughness: 0.85 });
                const stiltMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.9 });
                const wallMat = new THREE.MeshStandardMaterial({ color: 0x7c5a43, roughness: 0.8 });
                const roofMat = new THREE.MeshStandardMaterial({ color: 0x422f25, roughness: 0.9 });

                // Central Deck (16x16)
                const centralDeckGeo = new THREE.BoxGeometry(16, 0.15, 16);
                const centralDeck = new THREE.Mesh(centralDeckGeo, platformMat);
                centralDeck.position.set(0, 0.05, 0);
                centralDeck.receiveShadow = true;
                centralDeck.castShadow = true;
                group.add(centralDeck);

                // Central platform stilts
                const stiltGeoLow = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 6);
                const stiltCoords = [
                    {x: -7, z: -7}, {x: 7, z: -7}, {x: -7, z: 7}, {x: 7, z: 7},
                    {x: -7, z: 0}, {x: 7, z: 0}, {x: 0, z: -7}, {x: 0, z: 7}
                ];
                stiltCoords.forEach(c => {
                    const stilt = new THREE.Mesh(stiltGeoLow, stiltMat);
                    stilt.position.set(c.x, -0.7, c.z);
                    group.add(stilt);
                });

                // Piers/Walkways extending from center
                const pierNSGeo = new THREE.BoxGeometry(3.0, 0.15, 8.0);
                const pierWEGeo = new THREE.BoxGeometry(8.0, 0.15, 3.0);

                // North pier
                const northPier = new THREE.Mesh(pierNSGeo, platformMat);
                northPier.position.set(0, 0.05, -12);
                northPier.receiveShadow = true;
                northPier.castShadow = true;
                group.add(northPier);

                // South pier
                const southPier = new THREE.Mesh(pierNSGeo, platformMat);
                southPier.position.set(0, 0.05, 12);
                southPier.receiveShadow = true;
                southPier.castShadow = true;
                group.add(southPier);

                // West pier
                const westPier = new THREE.Mesh(pierWEGeo, platformMat);
                westPier.position.set(-12, 0.05, 0);
                westPier.receiveShadow = true;
                westPier.castShadow = true;
                group.add(westPier);

                // East pier
                const eastPier = new THREE.Mesh(pierWEGeo, platformMat);
                eastPier.position.set(12, 0.05, 0);
                eastPier.receiveShadow = true;
                eastPier.castShadow = true;
                group.add(eastPier);

                // Add stilts under piers
                const pierStiltCoords = [
                    {x: 0, z: -15}, {x: 0, z: -11},
                    {x: 0, z: 15}, {x: 0, z: 11},
                    {x: -15, z: 0}, {x: -11, z: 0},
                    {x: 15, z: 0}, {x: 11, z: 0}
                ];
                pierStiltCoords.forEach(c => {
                    const stilt = new THREE.Mesh(stiltGeoLow, stiltMat);
                    stilt.position.set(c.x, -0.7, c.z);
                    group.add(stilt);
                });

                // Houses positions closer to center
                const housePositions = [
                    { x: -22, z: -20, type: 'north-west' },
                    { x: 22, z: -20, type: 'north-east' },
                    { x: -24, z: 0,   type: 'west' },
                    { x: 24, z: 0,   type: 'east' },
                    { x: -22, z: 20,  type: 'south-west' },
                    { x: 22, z: 20,  type: 'south-east' }
                ];

                const stiltGeoHouse = new THREE.CylinderGeometry(0.1, 0.1, 2.5, 6);

                housePositions.forEach((pos, idx) => {
                    const houseGroup = new THREE.Group();
                    houseGroup.position.set(pos.x, 0, pos.z);

                    // Decks are stilted at y = 1.5
                    const stiltOffsets = [
                        { x: -1.2, z: -1.2 },
                        { x: 1.2, z: -1.2 },
                        { x: -1.2, z: 1.2 },
                        { x: 1.2, z: 1.2 }
                    ];
                    stiltOffsets.forEach(offset => {
                        const stilt = new THREE.Mesh(stiltGeoHouse, stiltMat);
                        stilt.position.set(offset.x, 1.25, offset.z);
                        stilt.castShadow = true;
                        stilt.receiveShadow = true;
                        houseGroup.add(stilt);
                    });

                    // Platform/Deck
                    const deckGeo = new THREE.BoxGeometry(3.2, 0.2, 3.2);
                    const deck = new THREE.Mesh(deckGeo, platformMat);
                    deck.position.set(0, 2.5, 0);
                    deck.castShadow = true;
                    deck.receiveShadow = true;
                    houseGroup.add(deck);

                    // House Body
                    const bodyGeo = new THREE.BoxGeometry(2.6, 2.0, 2.6);
                    const body = new THREE.Mesh(bodyGeo, wallMat);
                    body.position.set(0, 3.6, 0);
                    body.castShadow = true;
                    body.receiveShadow = true;
                    houseGroup.add(body);

                    // Roof (Traditional Gable approximation)
                    const roofGeo = new THREE.ConeGeometry(2.2, 1.6, 4);
                    const roof = new THREE.Mesh(roofGeo, roofMat);
                    roof.position.set(0, 5.4, 0);
                    roof.rotation.y = Math.PI / 4;
                    roof.castShadow = true;
                    houseGroup.add(roof);

                    // Lantern & Point Light (Warm glowing light)
                    const lanternGeo = new THREE.SphereGeometry(0.18, 8, 8);
                    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
                    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
                    lantern.position.set(0, 3.5, 1.4);
                    houseGroup.add(lantern);

                    // Dynamic light on all houses to illuminate the village beautifully
                    const light = new THREE.PointLight(0xffaa00, 1.2, 15);
                    light.position.set(0, 3.5, 1.6);
                    light.name = 'envLight';
                    houseGroup.add(light);

                    // Random slight rotation
                    houseGroup.rotation.y = (Math.random() - 0.5) * 0.15;
                    group.add(houseGroup);

                    // Add ramp-bridges connecting houses to piers
                    if (pos.type === 'west') {
                        // Connect West pier (ends at x=-16) to house (at x=-24)
                        const rampGeo = new THREE.BoxGeometry(8.2, 0.15, 1.5);
                        const ramp = new THREE.Mesh(rampGeo, platformMat);
                        ramp.position.set(-20, 1.275, 0);
                        ramp.rotation.z = Math.atan2(2.5 - 0.05, 8);
                        ramp.receiveShadow = true;
                        group.add(ramp);
                    } else if (pos.type === 'east') {
                        // Connect East pier (ends at x=16) to house (at x=24)
                        const rampGeo = new THREE.BoxGeometry(8.2, 0.15, 1.5);
                        const ramp = new THREE.Mesh(rampGeo, platformMat);
                        ramp.position.set(20, 1.275, 0);
                        ramp.rotation.z = -Math.atan2(2.5 - 0.05, 8);
                        ramp.receiveShadow = true;
                        group.add(ramp);
                    } else if (pos.type === 'north-west') {
                        // Diagonal bridge
                        const bridgeGeo = new THREE.BoxGeometry(1.5, 0.15, 12.0);
                        const bridge = new THREE.Mesh(bridgeGeo, platformMat);
                        bridge.position.set(-11, 1.275, -16);
                        bridge.rotation.y = Math.PI / 4;
                        bridge.rotation.x = Math.atan2(2.5 - 0.05, 12);
                        bridge.receiveShadow = true;
                        group.add(bridge);
                    } else if (pos.type === 'north-east') {
                        // Diagonal bridge
                        const bridgeGeo = new THREE.BoxGeometry(1.5, 0.15, 12.0);
                        const bridge = new THREE.Mesh(bridgeGeo, platformMat);
                        bridge.position.set(11, 1.275, -16);
                        bridge.rotation.y = -Math.PI / 4;
                        bridge.rotation.x = Math.atan2(2.5 - 0.05, 12);
                        bridge.receiveShadow = true;
                        group.add(bridge);
                    }
                });

                // BOATS (simple floating traditional water taxis / 'perahu' moored near piers)
                const boatGeo = new THREE.BoxGeometry(0.8, 0.4, 2.6);
                const boatMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.8 });
                const boatPositions = [
                    { x: -10, z: 4, rot: 0.8 },
                    { x: 10, z: -4, rot: -0.4 },
                    { x: -4, z: -10, rot: 1.5 },
                    { x: 4, z: 10, rot: -1.2 }
                ];
                boatPositions.forEach(bPos => {
                    const boat = new THREE.Mesh(boatGeo, boatMat);
                    boat.position.set(bPos.x, 0.15, bPos.z);
                    boat.rotation.y = bPos.rot;
                    boat.castShadow = true;
                    group.add(boat);
                });

                // BACKGROUND MOSQUE SILHOUETTE (Omar Ali Mosque Dome in distance)
                const mosqueGroup = new THREE.Group();
                mosqueGroup.position.set(0, 2, -55);

                const domeGeo = new THREE.SphereGeometry(6.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
                const domeMat = new THREE.MeshStandardMaterial({
                    color: 0xffd700,
                    emissive: 0xffd700,
                    emissiveIntensity: 0.35,
                    roughness: 0.15
                });
                const dome = new THREE.Mesh(domeGeo, domeMat);
                dome.scale.set(1, 0.8, 1);
                mosqueGroup.add(dome);

                const baseGeo = new THREE.CylinderGeometry(6.8, 6.8, 2, 24);
                const baseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
                const base = new THREE.Mesh(baseGeo, baseMat);
                base.position.y = -1;
                mosqueGroup.add(base);

                // Add subtle point light to the dome so it glows in the distance
                const mosqueLight = new THREE.PointLight(0xffd700, 1.5, 30);
                mosqueLight.position.set(0, 5, 0);
                mosqueLight.name = 'envLight';
                mosqueGroup.add(mosqueLight);

                group.add(mosqueGroup);
            }
        },

        // =====================================================================
        // LEVEL 1: TASEK MERIMBUN (The Black Lake)
        // =====================================================================
        {
            name: 'Tasek Merimbun',
            subtitle: 'The Black Lake',
            description: 'Venture into the sacred black waters where ancient creatures lurk.',
            skyColor: 0xcae8d5,    // misty light green-blue sky
            fogColor: 0xe6f4ea,    // dense morning mist fog
            fogNear: 25,
            fogFar: 75,
            ambientLight: 0xffffff, // swamp morning light
            ambientIntensity: 0.6,
            directionalColor: 0xfff0db, // soft warm sun rays
            directionalIntensity: 0.75,
            groundColor: 0x1d3a27,  // clear dark green swamp water
            waves: [
                [{ type: 'buaya_putih', count: 3 }, { type: 'spirit_warrior', count: 1 }],
                [{ type: 'buaya_putih', count: 2 }, { type: 'harimau_jadian', count: 2 }],
                [{ type: 'harimau_jadian', count: 3 }, { type: 'spirit_warrior', count: 3 }]
            ],
            bossType: 'genali',
            fact: 'Tasek Merimbun is Brunei\'s largest natural lake and is designated as an ASEAN Heritage Park.',
            createEnvironment(group) {
                // GROUND: Swamp water plane with segments for wave simulation
                const waterGeo = new THREE.PlaneGeometry(120, 120, 32, 32);
                const waterMat = new THREE.MeshStandardMaterial({
                    color: this.groundColor,
                    emissive: 0x051a0b,
                    metalness: 0.15,
                    roughness: 0.5,
                    flatShading: true
                });
                const water = new THREE.Mesh(waterGeo, waterMat);
                water.rotation.x = -Math.PI / 2;
                water.position.y = -0.12;
                water.receiveShadow = true;
                water.name = 'water_wave';
                group.add(water);

                // Central Mossy Stone platform (fighting area)
                const platformGeo = new THREE.BoxGeometry(14, 0.15, 14);
                const platformMat = new THREE.MeshStandardMaterial({ color: 0x323c34, roughness: 0.85 });
                const platform = new THREE.Mesh(platformGeo, platformMat);
                platform.position.set(0, 0.05, 0);
                platform.receiveShadow = true;
                platform.castShadow = true;
                group.add(platform);

                // TWISTED JUNGLE TREES (18 trees brought closer to surround the play area)
                const trunkGeo = new THREE.CylinderGeometry(0.25, 0.45, 6, 8);
                const trunkMat = new THREE.MeshStandardMaterial({ color: 0x241d17, roughness: 0.95 });
                const canopyMat = new THREE.MeshStandardMaterial({ color: 0x142a18, roughness: 0.9 });

                const treePositions = [];
                for (let i = 0; i < 18; i++) {
                    const angle = (i / 18) * Math.PI * 2;
                    const r = 16 + Math.random() * 8; // Brought closer!
                    treePositions.push({
                        x: Math.cos(angle) * r,
                        z: Math.sin(angle) * r,
                        scale: 0.85 + Math.random() * 0.4
                    });
                }

                treePositions.forEach(tPos => {
                    const treeGroup = new THREE.Group();
                    treeGroup.position.set(tPos.x, 0, tPos.z);
                    treeGroup.scale.set(tPos.scale, tPos.scale, tPos.scale);

                    // Trunk
                    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
                    trunk.position.y = 3;
                    trunk.rotation.z = (Math.random() - 0.5) * 0.2;
                    trunk.rotation.x = (Math.random() - 0.5) * 0.2;
                    trunk.castShadow = true;
                    trunk.receiveShadow = true;
                    treeGroup.add(trunk);

                    // Canopy (overlapping green spheres)
                    const sphereGeo = new THREE.SphereGeometry(2.0, 8, 8);
                    const leaf1 = new THREE.Mesh(sphereGeo, canopyMat);
                    leaf1.position.set(0, 5.5, 0);
                    leaf1.castShadow = true;
                    treeGroup.add(leaf1);

                    const leaf2 = new THREE.Mesh(sphereGeo, canopyMat);
                    leaf2.position.set(-0.8, 6.2, 0.5);
                    leaf2.scale.set(0.8, 0.8, 0.8);
                    leaf2.castShadow = true;
                    treeGroup.add(leaf2);

                    const leaf3 = new THREE.Mesh(sphereGeo, canopyMat);
                    leaf3.position.set(0.7, 6.5, -0.6);
                    leaf3.scale.set(0.85, 0.85, 0.85);
                    leaf3.castShadow = true;
                    treeGroup.add(leaf3);

                    // Roots
                    const rootGeo = new THREE.CylinderGeometry(0.06, 0.14, 2, 4);
                    for (let j = 0; j < 3; j++) {
                        const root = new THREE.Mesh(rootGeo, trunkMat);
                        root.rotation.z = 0.5;
                        root.rotation.y = (j * Math.PI * 2) / 3;
                        root.position.set(Math.cos((j * Math.PI * 2) / 3) * 0.5, 0.4, Math.sin((j * Math.PI * 2) / 3) * 0.5);
                        treeGroup.add(root);
                    }

                    group.add(treeGroup);
                });

                // LILY PADS (scattered circles brought closer)
                const padGeo = new THREE.CircleGeometry(0.7, 8);
                const padMat = new THREE.MeshStandardMaterial({ color: 0x1a3d24, roughness: 0.8, side: THREE.DoubleSide });
                for (let i = 0; i < 15; i++) {
                    const pad = new THREE.Mesh(padGeo, padMat);
                    const angle = Math.random() * Math.PI * 2;
                    const r = 2 + Math.random() * 15;
                    pad.position.set(Math.cos(angle) * r, 0.02, Math.sin(angle) * r);
                    pad.rotation.x = -Math.PI / 2;
                    pad.rotation.z = Math.random() * Math.PI;
                    pad.scale.set(0.7 + Math.random() * 0.6, 0.7 + Math.random() * 0.6, 1);
                    group.add(pad);
                }

                // ANCIENT MOSS STONES
                const stoneGeo = new THREE.DodecahedronGeometry(1.2, 0);
                const stoneMat = new THREE.MeshStandardMaterial({ color: 0x2d3a2e, roughness: 0.9 });
                const stonePositions = [
                    { x: -9, z: -10, s: 1.2 },
                    { x: 10, z: -6, s: 1.6 },
                    { x: -11, z: 8, s: 1.4 },
                    { x: 7, z: 11, s: 1.0 }
                ];
                stonePositions.forEach(sPos => {
                    const stone = new THREE.Mesh(stoneGeo, stoneMat);
                    stone.position.set(sPos.x, 0.3, sPos.z);
                    stone.scale.set(sPos.s, sPos.s * 0.7, sPos.s);
                    stone.rotation.set(Math.random(), Math.random(), Math.random());
                    stone.castShadow = true;
                    stone.receiveShadow = true;
                    group.add(stone);
                });

                // FIREFLIES (bioluminescent green ambient lights brought closer)
                const fireflyGeo = new THREE.SphereGeometry(0.06, 6, 6);
                const fireflyMat = new THREE.MeshBasicMaterial({ color: 0x66ff66 });
                for (let i = 0; i < 8; i++) {
                    const firefly = new THREE.Mesh(fireflyGeo, fireflyMat);
                    const angle = Math.random() * Math.PI * 2;
                    const r = 6 + Math.random() * 12;
                    firefly.position.set(Math.cos(angle) * r, 1.0 + Math.random() * 2.0, Math.sin(angle) * r);

                    const light = new THREE.PointLight(0x44ff44, 0.6, 8);
                    light.position.set(0, 0, 0);
                    light.name = 'envLight';
                    firefly.add(light);

                    group.add(firefly);
                }

                // Swamp Mist effect (flat low-opacity planes)
                const mistGeo = new THREE.PlaneGeometry(50, 50);
                const mistMat = new THREE.MeshBasicMaterial({
                    color: 0x1b2d20,
                    transparent: true,
                    opacity: 0.08,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });
                const mist = new THREE.Mesh(mistGeo, mistMat);
                mist.position.set(0, 0.4, 0);
                mist.rotation.x = -Math.PI / 2;
                group.add(mist);
            }
        },

        // =====================================================================
        // LEVEL 2: BUKIT AMBOG FOREST (Haunted Forest)
        // =====================================================================
        {
            name: 'Bukit Ambog',
            subtitle: 'The Haunted Forest',
            description: 'Brave the cursed jungle where the Harimau Jadian prowls.',
            skyColor: 0xbbf7d0,    // fresh light green morning sky
            fogColor: 0xf0fdf4,    // misty green-white fog
            fogNear: 20,
            fogFar: 60,
            ambientLight: 0xffffff, // bright forest light
            ambientIntensity: 0.6,
            directionalColor: 0xfffbeb, // bright daylight sun
            directionalIntensity: 0.9,
            groundColor: 0x854d0e,  // rich jungle soil
            waves: [
                [{ type: 'harimau_jadian', count: 3 }, { type: 'spirit_warrior', count: 2 }],
                [{ type: 'harimau_jadian', count: 2 }, { type: 'orang_tinggi', count: 1 }, { type: 'spirit_warrior', count: 2 }],
                [{ type: 'orang_tinggi', count: 2 }, { type: 'harimau_jadian', count: 3 }, { type: 'dark_mage', count: 1 }]
            ],
            bossType: 'demon_harimau',
            fact: 'Bukit Ambog in Tutong is a place steeped in local legend, said to be home to supernatural beings.',
            createEnvironment(group) {
                // GROUND: Forest Soil
                const groundGeo = new THREE.PlaneGeometry(120, 120);
                const groundMat = new THREE.MeshStandardMaterial({
                    color: this.groundColor,
                    roughness: 0.95,
                    metalness: 0.05
                });
                const ground = new THREE.Mesh(groundGeo, groundMat);
                ground.rotation.x = -Math.PI / 2;
                ground.receiveShadow = true;
                group.add(ground);

                // Central Altar Clearing Platform (ancient round stone clearing)
                const altarGeo = new THREE.CylinderGeometry(10, 10.2, 0.15, 12);
                const altarMat = new THREE.MeshStandardMaterial({ color: 0x555c56, roughness: 0.85 });
                const altar = new THREE.Mesh(altarGeo, altarMat);
                altar.position.set(0, 0.075, 0);
                altar.receiveShadow = true;
                altar.castShadow = true;
                group.add(altar);

                // DENSE FOREST TREES (24 trees brought closer to surround the arena)
                const trunkGeo = new THREE.CylinderGeometry(0.35, 0.6, 8, 8);
                const trunkMat = new THREE.MeshStandardMaterial({ color: 0x302217, roughness: 0.95 });
                const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0c2211, roughness: 0.9 });

                const treePositions = [];
                for (let i = 0; i < 24; i++) {
                    const angle = (i / 24) * Math.PI * 2;
                    const r = 18 + Math.random() * 8; // Brought closer!
                    treePositions.push({
                        x: Math.cos(angle) * r,
                        z: Math.sin(angle) * r,
                        scale: 0.9 + Math.random() * 0.5
                    });
                }

                treePositions.forEach(tPos => {
                    const treeGroup = new THREE.Group();
                    treeGroup.position.set(tPos.x, 0, tPos.z);
                    treeGroup.scale.set(tPos.scale, tPos.scale, tPos.scale);

                    // Trunk
                    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
                    trunk.position.y = 4;
                    trunk.castShadow = true;
                    trunk.receiveShadow = true;
                    treeGroup.add(trunk);

                    // Large Foliage
                    const folGeo = new THREE.SphereGeometry(3.2, 8, 8);
                    const leaf = new THREE.Mesh(folGeo, canopyMat);
                    leaf.position.set(0, 7.5, 0);
                    leaf.castShadow = true;
                    treeGroup.add(leaf);

                    const leafTop = new THREE.Mesh(folGeo, canopyMat);
                    leafTop.position.set(0, 9.8, 0);
                    leafTop.scale.set(0.7, 0.7, 0.7);
                    leafTop.castShadow = true;
                    treeGroup.add(leafTop);

                    // Vines hanging down
                    const vineGeo = new THREE.CylinderGeometry(0.02, 0.02, 4.5, 4);
                    const vineMat = new THREE.MeshStandardMaterial({ color: 0x142b1a, roughness: 0.9 });
                    for (let v = 0; v < 2; v++) {
                        const vine = new THREE.Mesh(vineGeo, vineMat);
                        const angleV = Math.random() * Math.PI * 2;
                        vine.position.set(Math.cos(angleV) * 2.2, 5.0, Math.sin(angleV) * 2.2);
                        treeGroup.add(vine);
                    }

                    group.add(treeGroup);
                });

                // FALLEN LOGS
                const logGeo = new THREE.CylinderGeometry(0.4, 0.35, 5, 8);
                const logPositions = [
                    { x: -10, z: 9, rotY: 0.5 },
                    { x: 12, z: -10, rotY: -0.8 },
                    { x: 3, z: 15, rotY: 1.9 }
                ];
                logPositions.forEach(lPos => {
                    const log = new THREE.Mesh(logGeo, trunkMat);
                    log.position.set(lPos.x, 0.3, lPos.z);
                    log.rotation.x = Math.PI / 2;
                    log.rotation.y = lPos.rotY;
                    log.castShadow = true;
                    log.receiveShadow = true;
                    group.add(log);
                });

                // GLOWING MUSHROOMS
                const stemGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.35, 5);
                const capGeo = new THREE.SphereGeometry(0.18, 6, 6, 0, Math.PI * 2, 0, Math.PI / 2);
                const stemMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
                const capMat = new THREE.MeshBasicMaterial({ color: 0x33ff88 });

                const shroomPositions = [
                    { x: -5, z: -6 }, { x: -4, z: 10 }, { x: 9, z: 5 }, { x: 6, z: -8 }
                ];
                shroomPositions.forEach(sPos => {
                    const shroom = new THREE.Group();
                    shroom.position.set(sPos.x, 0, sPos.z);

                    const stem = new THREE.Mesh(stemGeo, stemMat);
                    stem.position.y = 0.175;
                    shroom.add(stem);

                    const cap = new THREE.Mesh(capGeo, capMat);
                    cap.position.y = 0.35;
                    shroom.add(cap);

                    const light = new THREE.PointLight(0x00ff66, 0.6, 5);
                    light.position.set(0, 0.35, 0);
                    light.name = 'envLight';
                    shroom.add(light);

                    group.add(shroom);
                });

                // MOONLIGHT SHAFTS (represented as beautiful daylight forest sunbeams)
                const shaftPositions = [
                    { x: -6, z: -6 },
                    { x: 7, z: 7 },
                    { x: -3, z: 9 }
                ];
                shaftPositions.forEach(sPos => {
                    const spotLight = new THREE.SpotLight(0xfffbeb, 1.0);
                    spotLight.position.set(sPos.x, 22, sPos.z);
                    spotLight.target.position.set(sPos.x, 0, sPos.z);
                    spotLight.angle = 0.22;
                    spotLight.penumbra = 0.8;
                    spotLight.name = 'envLight';
                    group.add(spotLight);
                    group.add(spotLight.target);
                });
            }
        },

        // =====================================================================
        // LEVEL 3: OMAR ALI SAIFUDDIEN MOSQUE (The Sacred Grounds)
        // =====================================================================
        {
            name: 'Omar Ali Saifuddien',
            subtitle: 'The Sacred Grounds',
            description: 'Protect the sacred grounds of the golden mosque from the shadow invasion.',
            skyColor: 0x38bdf8,    // clear vibrant blue sky
            fogColor: 0xf0f9ff,    // light white-blue fog
            fogNear: 50,
            fogFar: 120,
            ambientLight: 0xffffff, // bright daytime ambient light
            ambientIntensity: 0.6,
            directionalColor: 0xfffae6, // golden afternoon sun
            directionalIntensity: 1.0,
            groundColor: 0xf5f5f4,  // gleaming white marble courtyard
            waves: [
                [{ type: 'spirit_warrior', count: 4 }, { type: 'dark_mage', count: 1 }],
                [{ type: 'spirit_warrior', count: 3 }, { type: 'dark_mage', count: 2 }, { type: 'orang_tinggi', count: 1 }],
                [{ type: 'dark_mage', count: 3 }, { type: 'orang_tinggi', count: 2 }, { type: 'spirit_warrior', count: 3 }]
            ],
            bossType: 'orang_tinggi_elder',
            fact: 'The Omar Ali Saifuddien Mosque, completed in 1958, is considered one of the most beautiful mosques in Asia Pacific.',
            createEnvironment(group) {
                // GROUND: Large marble courtyard
                const groundGeo = new THREE.PlaneGeometry(120, 120);
                const groundMat = new THREE.MeshStandardMaterial({
                    color: this.groundColor,
                    roughness: 0.25,
                    metalness: 0.25
                });
                const ground = new THREE.Mesh(groundGeo, groundMat);
                ground.rotation.x = -Math.PI / 2;
                ground.receiveShadow = true;
                group.add(ground);

                // LAGOON (Z = -20) with segments for wave simulation
                const lagoonGeo = new THREE.CircleGeometry(16, 32);
                const lagoonMat = new THREE.MeshStandardMaterial({
                    color: 0x38bdf8,
                    metalness: 0.15,
                    roughness: 0.4,
                    flatShading: true
                });
                const lagoon = new THREE.Mesh(lagoonGeo, lagoonMat);
                lagoon.position.set(0, 0.01, -22);
                lagoon.rotation.x = -Math.PI / 2;
                lagoon.name = 'reflecting_pool';
                group.add(lagoon);

                // CENTRAL MOSQUE (Background z = -36)
                const mosque = new THREE.Group();
                mosque.position.set(0, 0, -36);

                // White Marble main structure block
                const baseGeo = new THREE.BoxGeometry(22, 5, 12);
                const whiteMarbleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
                const base = new THREE.Mesh(baseGeo, whiteMarbleMat);
                base.position.y = 2.5;
                base.castShadow = true;
                base.receiveShadow = true;
                mosque.add(base);

                // Main Golden Dome
                const domeGeo = new THREE.SphereGeometry(6.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
                const goldMat = new THREE.MeshStandardMaterial({
                    color: 0xffd700,
                    emissive: 0xffd700,
                    emissiveIntensity: 0.35,
                    roughness: 0.15,
                    metalness: 0.8
                });
                const dome = new THREE.Mesh(domeGeo, goldMat);
                dome.position.y = 5.0;
                dome.scale.set(1, 0.9, 1);
                dome.castShadow = true;
                mosque.add(dome);

                // Minarets (4 corners of mosque base)
                const minaretGeo = new THREE.CylinderGeometry(0.5, 0.5, 14, 8);
                const smallDomeGeo = new THREE.ConeGeometry(0.7, 1.4, 8);

                const minOffsets = [
                    { x: -10, z: -5 },
                    { x: 10, z: -5 },
                    { x: -10, z: 5 },
                    { x: 10, z: 5 }
                ];
                minOffsets.forEach(offset => {
                    const minaret = new THREE.Mesh(minaretGeo, whiteMarbleMat);
                    minaret.position.set(offset.x, 7, offset.z);
                    minaret.castShadow = true;
                    mosque.add(minaret);

                    const smallDome = new THREE.Mesh(smallDomeGeo, goldMat);
                    smallDome.position.set(offset.x, 14.7, offset.z);
                    smallDome.castShadow = true;
                    mosque.add(smallDome);
                });

                group.add(mosque);

                // HISTORIC ROYAL BARGE (in the lagoon)
                const barge = new THREE.Group();
                barge.position.set(0, 0.2, -22);

                const hullGeo = new THREE.BoxGeometry(3.0, 0.8, 10.0);
                const hull = new THREE.Mesh(hullGeo, goldMat);
                hull.castShadow = true;
                barge.add(hull);

                // Canopy on the barge
                const pillarGeo = new THREE.CylinderGeometry(0.08, 0.08, 2, 4);
                const roofGeo = new THREE.BoxGeometry(2.4, 0.25, 4.0);
                const woodMat = new THREE.MeshStandardMaterial({ color: 0x543a2b, roughness: 0.8 });

                const p1 = new THREE.Mesh(pillarGeo, woodMat); p1.position.set(-1.0, 1.4, -1.5); barge.add(p1);
                const p2 = new THREE.Mesh(pillarGeo, woodMat); p2.position.set(1.0, 1.4, -1.5); barge.add(p2);
                const p3 = new THREE.Mesh(pillarGeo, woodMat); p3.position.set(-1.0, 1.4, 1.5); barge.add(p3);
                const p4 = new THREE.Mesh(pillarGeo, woodMat); p4.position.set(1.0, 1.4, 1.5); barge.add(p4);

                const broof = new THREE.Mesh(roofGeo, goldMat);
                broof.position.set(0, 2.5, 0);
                barge.add(broof);

                group.add(barge);

                // MARBLE PILLARS & COURTYARD LIGHTS (8 around playing field edges)
                const pillarGeoArena = new THREE.CylinderGeometry(0.4, 0.4, 6, 8);
                const pillarMatArena = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
                const capMatArena = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.2 });

                const pillPositions = [
                    { x: -25, z: -20 }, { x: 25, z: -20 },
                    { x: -30, z: 0 }, { x: 30, z: 0 },
                    { x: -25, z: 20 }, { x: 25, z: 20 },
                    { x: -12, z: 28 }, { x: 12, z: 28 }
                ];
                pillPositions.forEach(pPos => {
                    const colGroup = new THREE.Group();
                    colGroup.position.set(pPos.x, 0, pPos.z);

                    // Column
                    const col = new THREE.Mesh(pillarGeoArena, pillarMatArena);
                    col.position.y = 3;
                    col.castShadow = true;
                    col.receiveShadow = true;
                    colGroup.add(col);

                    // Golden Cap
                    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 1.0), capMatArena);
                    cap.position.y = 6.15;
                    colGroup.add(cap);

                    // Lamp Light
                    const light = new THREE.PointLight(0xffea9c, 0.8, 14);
                    light.position.set(0, 5.8, 0);
                    light.name = 'envLight';
                    colGroup.add(light);

                    group.add(colGroup);
                });

                // CRESCENT MOON & STAR (floating high in background)
                const skyObj = new THREE.Group();
                skyObj.position.set(-18, 28, -45);

                const moonGeo = new THREE.TorusGeometry(3.0, 0.3, 8, 24, Math.PI * 1.15);
                const moon = new THREE.Mesh(moonGeo, goldMat);
                moon.rotation.z = -Math.PI / 4;
                skyObj.add(moon);

                const starGeo = new THREE.OctahedronGeometry(0.6, 0);
                const star = new THREE.Mesh(starGeo, goldMat);
                star.position.set(3.2, 0.8, 0);
                skyObj.add(star);

                group.add(skyObj);
            }
        },

        // =====================================================================
        // LEVEL 4: ISTANA NURUL IMAN (The Final Stand)
        // =====================================================================
        {
            name: 'Istana Nurul Iman',
            subtitle: 'The Final Stand',
            description: 'The Shadow Sultan attacks the Royal Palace. Defend the throne of Brunei in this final battle!',
            skyColor: 0xfef08a,    // bright royal golden noon sky
            fogColor: 0xfffbeb,    // warm ambient fog
            fogNear: 40,
            fogFar: 90,
            ambientLight: 0xffffff, // bright midday ambient
            ambientIntensity: 0.65,
            directionalColor: 0xfffbeb, // midday sun
            directionalIntensity: 1.1,
            groundColor: 0xfae8ff,  // polished light-lavender marble courtyard
            waves: [
                [{ type: 'spirit_warrior', count: 3 }, { type: 'dark_mage', count: 2 }, { type: 'harimau_jadian', count: 2 }],
                [{ type: 'orang_tinggi', count: 2 }, { type: 'dark_mage', count: 3 }, { type: 'spirit_warrior', count: 3 }],
                [{ type: 'fire_imp', count: 4 }, { type: 'orang_tinggi', count: 2 }, { type: 'dark_mage', count: 2 }, { type: 'spirit_warrior', count: 2 }]
            ],
            bossType: 'shadow_sultan',
            fact: 'Istana Nurul Iman is the official residence of the Sultan of Brunei and the largest residential palace in the world.',
            createEnvironment(group) {
                // GROUND: Polished light-lavender marble courtyard
                const groundGeo = new THREE.PlaneGeometry(120, 120);
                const groundMat = new THREE.MeshStandardMaterial({
                    color: this.groundColor,
                    roughness: 0.35,
                    metalness: 0.2
                });
                const ground = new THREE.Mesh(groundGeo, groundMat);
                ground.rotation.x = -Math.PI / 2;
                ground.receiveShadow = true;
                group.add(ground);

                // THE PALACE FACADE (Background z = -40)
                const palace = new THREE.Group();
                palace.position.set(0, 0, -40);

                // Main Hall Block
                const mainHallGeo = new THREE.BoxGeometry(45, 10, 15);
                const goldWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf3ebd3, roughness: 0.25 });
                const mainHall = new THREE.Mesh(mainHallGeo, goldWhiteMat);
                mainHall.position.y = 5.0;
                mainHall.castShadow = true;
                palace.add(mainHall);

                // Vaulted Golden Roof
                const roofGeo = new THREE.SphereGeometry(11, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
                const goldMat = new THREE.MeshStandardMaterial({
                    color: 0xffd700,
                    emissive: 0xffd700,
                    emissiveIntensity: 0.3,
                    roughness: 0.15,
                    metalness: 0.85
                });
                const roof = new THREE.Mesh(roofGeo, goldMat);
                roof.position.set(0, 9.8, 0);
                roof.scale.set(1.4, 0.7, 1);
                roof.castShadow = true;
                palace.add(roof);

                // Palace side wings
                const wingGeo = new THREE.BoxGeometry(18, 7.5, 10);
                const leftWing = new THREE.Mesh(wingGeo, goldWhiteMat);
                leftWing.position.set(-30, 3.75, 2.0);
                leftWing.castShadow = true;
                palace.add(leftWing);

                const rightWing = new THREE.Mesh(wingGeo, goldWhiteMat);
                rightWing.position.set(30, 3.75, 2.0);
                rightWing.castShadow = true;
                palace.add(rightWing);

                group.add(palace);

                // FIRE BRAZIERS (4 at arena corners)
                const brazierPositions = [
                    { x: -24, z: -24 }, { x: 24, z: -24 },
                    { x: -24, z: 24 }, { x: 24, z: 24 }
                ];
                const standGeo = new THREE.ConeGeometry(0.7, 1.4, 4);
                const standMat = new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.9, metalness: 0.5 });
                const fireGeo = new THREE.SphereGeometry(0.25, 8, 8);
                const fireMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });

                brazierPositions.forEach(bPos => {
                    const brazier = new THREE.Group();
                    brazier.position.set(bPos.x, 0, bPos.z);

                    // Stand
                    const stand = new THREE.Mesh(standGeo, standMat);
                    stand.position.y = 0.7;
                    stand.castShadow = true;
                    brazier.add(stand);

                    // Flame mesh
                    const flame = new THREE.Mesh(fireGeo, fireMat);
                    flame.position.y = 1.5;
                    brazier.add(flame);

                    // Dynamic Light
                    const light = new THREE.PointLight(0xff6600, 1.6, 18);
                    light.position.set(0, 1.6, 0);
                    light.name = 'envLight';
                    brazier.add(light);

                    group.add(brazier);
                });

                // DARK ENERGY PILLARS (Pulsing shadow energy from Shadow invasion)
                const pillarGeo = new THREE.CylinderGeometry(0.35, 0.35, 9, 8);
                const pillarMat = new THREE.MeshStandardMaterial({
                    color: 0x4c1d95,
                    emissive: 0x9900ff,
                    emissiveIntensity: 0.6,
                    roughness: 0.2
                });
                const shadowPositions = [
                    { x: -16, z: -10 }, { x: 16, z: -10 },
                    { x: -18, z: 12 }, { x: 18, z: 12 }
                ];
                shadowPositions.forEach(sPos => {
                    const sp = new THREE.Mesh(pillarGeo, pillarMat);
                    sp.position.set(sPos.x, 4.5, sPos.z);
                    sp.castShadow = true;

                    // Add evil purple point light
                    const plight = new THREE.PointLight(0xaa00ff, 1.0, 10);
                    plight.position.set(0, 0, 0);
                    plight.name = 'envLight';
                    sp.add(plight);

                    group.add(sp);
                });

                // STORM CLOUDS (Dramatic dark shapes against bright sky)
                const cloudGeo = new THREE.SphereGeometry(12, 12, 8);
                const cloudMat = new THREE.MeshStandardMaterial({
                    color: 0x64748b,
                    transparent: true,
                    opacity: 0.55,
                    roughness: 1.0
                });
                const cloudPositions = [
                    { x: -25, y: 26, z: -25 },
                    { x: 25, y: 28, z: -25 },
                    { x: 0, y: 30, z: -35 }
                ];
                cloudPositions.forEach(cPos => {
                    const cloud = new THREE.Mesh(cloudGeo, cloudMat);
                    cloud.position.set(cPos.x, cPos.y, cPos.z);
                    cloud.scale.set(1.6, 0.4, 1.2);
                    group.add(cloud);
                });
            }
        }
    ]
};
