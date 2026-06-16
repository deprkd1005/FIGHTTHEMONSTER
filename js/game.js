// ============================================================
// MAIN GAME CONTROLLER — Fight the Monster: Brunei Legends Edition
// State machine, game loop, Three.js scene management
// ============================================================
window.GAME = window.GAME || {};

GAME.Main = {
    // State machine
    state: 'LOADING', // LOADING, TITLE, HERO_SELECT, LEVEL_INTRO, PLAYING, LEVEL_COMPLETE, GAME_OVER, VICTORY

    // Three.js core
    scene: null,
    camera: null,
    renderer: null,
    clock: null,

    // Game objects
    hero: null,
    monsters: [],
    selectedHeroIndex: 0,
    currentLevel: 0,
    currentWave: 0,
    totalScore: 0,

    // Wave state
    waveActive: false,
    waveClearTimer: 0,
    bossSpawned: false,
    bossDefeated: false,

    // Camera
    cameraOffset: new THREE.Vector3(0, 18, 14),
    cameraLookOffset: new THREE.Vector3(0, 0, -2),

    // Environment group (for cleanup)
    environmentGroup: null,

    // Cultural facts for level complete screens
    bruneiFacts: [
        'Kampong Ayer has been the heart of Brunei for over 1,000 years, earning the title "Venice of the East".',
        'Tasek Merimbun is Brunei\'s largest natural lake and is designated as an ASEAN Heritage Park.',
        'Bukit Ambog in Tutong is steeped in local legend, said to be home to supernatural beings.',
        'The Omar Ali Saifuddien Mosque, completed in 1958, is one of the most beautiful mosques in Asia Pacific.',
        'Istana Nurul Iman is the official residence of the Sultan of Brunei and the largest residential palace in the world.'
    ],

    // ============================================================
    // INITIALIZATION
    // ============================================================
    init() {
        this.clock = new THREE.Clock();

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        const container = document.getElementById('game-container');
        container.appendChild(this.renderer.domElement);

        // Create scene
        this.scene = new THREE.Scene();

        // Create camera
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
        this.camera.position.set(0, 18, 14);
        this.camera.lookAt(0, 0, -2);

        // Init subsystems
        GAME.Input.init();
        GAME.Audio.init();
        GAME.Particles.init(this.scene);

        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Setup UI event listeners
        this.setupUI();

        // Simulate loading
        setTimeout(() => {
            this.setState('TITLE');
        }, 2500);

        // Start game loop
        this.gameLoop();
    },

    // ============================================================
    // UI SETUP
    // ============================================================
    setupUI() {
        // Title screen
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                GAME.Audio.play('click');
                this.setState('HERO_SELECT');
            });
        }

        const howtoBtn = document.getElementById('howto-btn');
        if (howtoBtn) {
            howtoBtn.addEventListener('click', () => {
                GAME.Audio.play('click');
                this.showScreen('howto-screen');
            });
        }

        const howtoBackBtn = document.getElementById('howto-back-btn');
        if (howtoBackBtn) {
            howtoBackBtn.addEventListener('click', () => {
                GAME.Audio.play('click');
                this.showScreen('title-screen');
            });
        }

        // Hero selection
        const heroCards = document.querySelectorAll('.hero-card');
        heroCards.forEach(card => {
            card.addEventListener('click', () => {
                GAME.Audio.play('click');
                heroCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedHeroIndex = parseInt(card.dataset.hero);
                this.updateHeroDetail();
            });
        });

        // Select first hero by default
        if (heroCards.length > 0) {
            heroCards[0].classList.add('selected');
            this.selectedHeroIndex = 0;
        }

        const selectHeroBtn = document.getElementById('select-hero-btn');
        if (selectHeroBtn) {
            selectHeroBtn.addEventListener('click', () => {
                GAME.Audio.play('powerup');
                this.startGame();
            });
        }

        // Level complete
        const nextLevelBtn = document.getElementById('next-level-btn');
        if (nextLevelBtn) {
            nextLevelBtn.addEventListener('click', () => {
                GAME.Audio.play('click');
                this.currentLevel++;
                if (this.currentLevel < GAME.Levels.definitions.length) {
                    this.startLevel();
                } else {
                    this.setState('VICTORY');
                }
            });
        }

        // Game over
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                GAME.Audio.play('click');
                this.startLevel();
            });
        }

        const changeHeroBtn = document.getElementById('change-hero-btn');
        if (changeHeroBtn) {
            changeHeroBtn.addEventListener('click', () => {
                GAME.Audio.play('click');
                this.cleanup();
                this.setState('HERO_SELECT');
            });
        }

        // Victory
        const playAgainBtn = document.getElementById('play-again-btn');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                GAME.Audio.play('click');
                this.currentLevel = 0;
                this.totalScore = 0;
                this.cleanup();
                this.setState('HERO_SELECT');
            });
        }
    },

    updateHeroDetail() {
        const detail = document.getElementById('hero-detail');
        if (!detail || !GAME.Heroes) return;
        const def = GAME.Heroes.definitions[this.selectedHeroIndex];
        if (!def) return;

        // Enable the select hero button
        const selectHeroBtn = document.getElementById('select-hero-btn');
        if (selectHeroBtn) selectHeroBtn.disabled = false;

        detail.innerHTML = `
            <h3 style="color: #FFD700; margin-bottom: 8px;">${def.name}</h3>
            <p style="color: rgba(255,255,255,0.7); font-style: italic; margin-bottom: 12px;">${def.description}</p>
            <div style="display: flex; gap: 20px; justify-content: center; margin-bottom: 12px;">
                <span>❤️ HP: ${def.hp}</span>
                <span>⚡ SPD: ${Math.round(def.speed * 20)}</span>
                <span>⚔️ ATK: ${def.attackDamage}</span>
                <span>💎 MANA: ${def.mana}</span>
            </div>
            <div style="display: flex; gap: 20px; justify-content: center;">
                <div style="text-align: center; background: rgba(255,215,0,0.1); padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(255,215,0,0.2);">
                    <div style="font-size: 1.5rem;">${def.powers[0].icon}</div>
                    <div style="font-size: 0.8rem; color: #FFD700; font-weight: 600;">[1] ${def.powers[0].name}</div>
                    <div style="font-size: 0.7rem; color: rgba(255,255,255,0.5);">${def.powers[0].description}</div>
                </div>
                <div style="text-align: center; background: rgba(255,215,0,0.1); padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(255,215,0,0.2);">
                    <div style="font-size: 1.5rem;">${def.powers[1].icon}</div>
                    <div style="font-size: 0.8rem; color: #FFD700; font-weight: 600;">[2] ${def.powers[1].name}</div>
                    <div style="font-size: 0.7rem; color: rgba(255,255,255,0.5);">${def.powers[1].description}</div>
                </div>
            </div>
        `;
    },

    // ============================================================
    // STATE MANAGEMENT
    // ============================================================
    setState(newState) {
        this.state = newState;

        switch (newState) {
            case 'TITLE':
                this.showScreen('title-screen');
                break;
            case 'HERO_SELECT':
                this.showScreen('hero-select-screen');
                this.updateHeroDetail();
                break;
            case 'LEVEL_INTRO':
                this.showLevelIntro();
                break;
            case 'PLAYING':
                this.hideAllScreens();
                this.showHUD(true);
                break;
            case 'LEVEL_COMPLETE':
                this.showLevelComplete();
                break;
            case 'GAME_OVER':
                this.showGameOver();
                break;
            case 'VICTORY':
                this.showVictory();
                break;
        }
    },

    showScreen(screenId) {
        this.hideAllScreens();
        this.showHUD(false);
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('active');
        }
    },

    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    },

    showHUD(show) {
        const hud = document.getElementById('hud');
        if (hud) {
            if (show) {
                hud.classList.add('active');
            } else {
                hud.classList.remove('active');
            }
        }
    },

    // ============================================================
    // GAME START
    // ============================================================
    startGame() {
        this.currentLevel = 0;
        this.totalScore = 0;
        this.startLevel();
    },

    startLevel() {
        // Cleanup previous
        this.cleanup();

        // Build level environment
        const levelDef = GAME.Levels.definitions[this.currentLevel];
        if (!levelDef) return;

        // Setup scene
        this.scene.background = new THREE.Color(levelDef.skyColor);
        this.scene.fog = new THREE.Fog(levelDef.fogColor, levelDef.fogNear, levelDef.fogFar);

        // Create realistic starry sky dome
        const skyGeo = new THREE.SphereGeometry(110, 32, 15);
        const skyMat = new THREE.MeshBasicMaterial({
            color: levelDef.skyColor,
            side: THREE.BackSide,
            fog: false
        });
        const skyDome = new THREE.Mesh(skyGeo, skyMat);
        skyDome.name = 'sky_dome';
        this.scene.add(skyDome);

        // Create atmospheric light particles (subtle daylight motes)
        const starsGeo = new THREE.BufferGeometry();
        const starsCount = 120;
        const starPositions = new Float32Array(starsCount * 3);

        for (let i = 0; i < starsCount; i++) {
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const r = 80 + Math.random() * 20;
            
            starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            starPositions[i * 3 + 1] = Math.abs(r * Math.sin(phi) * Math.sin(theta)); // sky dome (y >= 0)
            starPositions[i * 3 + 2] = r * Math.cos(phi);
        }

        starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        const starsMat = new THREE.PointsMaterial({
            color: 0xfff8dc,
            size: 0.8,
            transparent: true,
            opacity: 0.15,
            sizeAttenuation: true,
            fog: false
        });
        
        const starfield = new THREE.Points(starsGeo, starsMat);
        starfield.name = 'starfield';
        this.scene.add(starfield);

        // Lighting
        const ambient = new THREE.AmbientLight(levelDef.ambientLight, levelDef.ambientIntensity);
        ambient.name = 'envLight';
        this.scene.add(ambient);

        const directional = new THREE.DirectionalLight(levelDef.directionalColor, levelDef.directionalIntensity);
        directional.position.set(10, 20, 10);
        directional.castShadow = true;
        directional.shadow.mapSize.width = 1024;
        directional.shadow.mapSize.height = 1024;
        directional.shadow.camera.near = 0.5;
        directional.shadow.camera.far = 80;
        directional.shadow.camera.left = -40;
        directional.shadow.camera.right = 40;
        directional.shadow.camera.top = 40;
        directional.shadow.camera.bottom = -40;
        directional.name = 'envLight';
        this.scene.add(directional);

        // Build environment
        this.environmentGroup = new THREE.Group();
        this.environmentGroup.name = 'environment';
        this.scene.add(this.environmentGroup);

        if (levelDef.createEnvironment) {
            levelDef.createEnvironment(this.environmentGroup);
        }

        // Create hero
        this.hero = GAME.Heroes.createHero(this.selectedHeroIndex);
        this.hero.mesh.position.set(0, 0, 0);
        this.scene.add(this.hero.mesh);

        // Init combat
        GAME.Combat.init(this.scene, this.camera);
        GAME.Combat.setHero(this.hero);
        GAME.Combat.originalCameraPos = this.camera.position.clone();

        // Reset wave state
        this.monsters = [];
        this.currentWave = 0;
        this.waveActive = false;
        this.waveClearTimer = 0;
        this.bossSpawned = false;
        this.bossDefeated = false;

        // Update HUD
        this.updateHUDStatic();

        // Show level intro
        this.setState('LEVEL_INTRO');

        // Play music
        GAME.Audio.playMusic(this.currentLevel);
    },

    updateHUDStatic() {
        const levelDef = GAME.Levels.definitions[this.currentLevel];
        const heroDef = GAME.Heroes.definitions[this.selectedHeroIndex];

        const heroName = document.getElementById('hud-hero-name');
        if (heroName) heroName.textContent = heroDef.name;

        const levelBanner = document.getElementById('level-banner');
        if (levelBanner) levelBanner.textContent = levelDef.name;

        // Power slot icons & names
        const p1Icon = document.querySelector('#power1-slot .power-icon');
        const p1Name = document.querySelector('#power1-slot .power-name');
        const p2Icon = document.querySelector('#power2-slot .power-icon');
        const p2Name = document.querySelector('#power2-slot .power-name');

        if (p1Icon) p1Icon.textContent = heroDef.powers[0].icon;
        if (p1Name) p1Name.textContent = heroDef.powers[0].name;
        if (p2Icon) p2Icon.textContent = heroDef.powers[1].icon;
        if (p2Name) p2Name.textContent = heroDef.powers[1].name;

        // Hide boss health
        const bossContainer = document.getElementById('boss-health-container');
        if (bossContainer) bossContainer.classList.remove('active');
    },

    showLevelIntro() {
        const levelDef = GAME.Levels.definitions[this.currentLevel];
        const numEl = document.getElementById('level-intro-number');
        const nameEl = document.getElementById('level-intro-name');
        const descEl = document.getElementById('level-intro-desc');

        if (numEl) numEl.textContent = `LEVEL ${this.currentLevel + 1}`;
        if (nameEl) nameEl.textContent = levelDef.name;
        if (descEl) descEl.textContent = levelDef.description;

        this.showScreen('level-intro-screen');

        // Auto-transition to playing
        setTimeout(() => {
            if (this.state === 'LEVEL_INTRO') {
                this.setState('PLAYING');
                this.spawnWave();
            }
        }, 3000);
    },

    showLevelComplete() {
        GAME.Audio.stopMusic();
        GAME.Audio.play('levelup');

        const scoreEl = document.getElementById('level-complete-score');
        const factEl = document.getElementById('level-complete-fact');

        if (scoreEl) scoreEl.textContent = `Score: ${this.totalScore + (this.hero ? this.hero.score : 0)}`;
        if (factEl) factEl.textContent = this.bruneiFacts[this.currentLevel] || '';

        // Add hero score to total
        if (this.hero) {
            this.totalScore += this.hero.score;
        }

        this.showScreen('level-complete-screen');
        this.showHUD(false);
    },

    showGameOver() {
        GAME.Audio.stopMusic();
        GAME.Audio.play('death');

        const scoreEl = document.getElementById('game-over-score');
        if (scoreEl) scoreEl.textContent = `Score: ${this.totalScore + (this.hero ? this.hero.score : 0)}`;

        this.showScreen('game-over-screen');
        this.showHUD(false);
    },

    showVictory() {
        GAME.Audio.stopMusic();
        GAME.Audio.play('levelup');

        const scoreEl = document.getElementById('victory-score');
        if (scoreEl) scoreEl.textContent = `Final Score: ${this.totalScore}`;

        this.showScreen('victory-screen');
        this.showHUD(false);
    },

    // ============================================================
    // WAVE SPAWNING
    // ============================================================
    spawnWave() {
        const levelDef = GAME.Levels.definitions[this.currentLevel];
        if (!levelDef) return;

        if (this.currentWave < levelDef.waves.length) {
            // Normal wave
            const waveData = levelDef.waves[this.currentWave];
            this.spawnMonsters(waveData);
            this.waveActive = true;

            // Update wave display
            const waveDisp = document.getElementById('wave-display');
            if (waveDisp) waveDisp.textContent = `Wave ${this.currentWave + 1} / ${levelDef.waves.length}`;
        } else if (!this.bossSpawned) {
            // Boss wave
            this.spawnBoss(levelDef.bossType);
            this.bossSpawned = true;
            this.waveActive = true;

            const waveDisp = document.getElementById('wave-display');
            if (waveDisp) waveDisp.textContent = 'BOSS FIGHT!';
        }
    },

    spawnMonsters(waveData) {
        const arenaSize = GAME.Levels.arenaSize || 35;

        for (const group of waveData) {
            for (let i = 0; i < group.count; i++) {
                // Random position at arena edges
                const angle = Math.random() * Math.PI * 2;
                const distance = arenaSize * 0.6 + Math.random() * arenaSize * 0.2;
                const x = Math.cos(angle) * distance;
                const z = Math.sin(angle) * distance;

                const monster = GAME.Monsters.createMonster(group.type, new THREE.Vector3(x, 0, z), false);
                if (monster) {
                    this.scene.add(monster.mesh);
                    this.monsters.push(monster);
                }
            }
        }

        GAME.Combat.setMonsters(this.monsters);
    },

    spawnBoss(bossType) {
        const boss = GAME.Monsters.createMonster(bossType, new THREE.Vector3(0, 0, -20), true);
        if (boss) {
            this.scene.add(boss.mesh);
            this.monsters.push(boss);
            GAME.Combat.setMonsters(this.monsters);

            // Show boss health bar
            const bossContainer = document.getElementById('boss-health-container');
            const bossName = document.getElementById('boss-name');
            if (bossContainer) bossContainer.classList.add('active');
            if (bossName) bossName.textContent = boss.name;
        }
    },

    // ============================================================
    // GAME LOOP
    // ============================================================
    gameLoop() {
        requestAnimationFrame(() => this.gameLoop());

        const delta = Math.min(this.clock.getDelta(), 0.05); // Cap delta

        if (this.state === 'PLAYING') {
            this.updatePlaying(delta);
        }

        // Always render
        if (this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }

        // Reset input one-shots
        GAME.Input.update();
    },

    updatePlaying(delta) {
        if (!this.hero || this.hero.isDead()) {
            this.setState('GAME_OVER');
            return;
        }

        // ---- Hero Input ----
        this.handleHeroInput(delta);

        // ---- Hero Update ----
        this.hero.update(delta);

        // ---- Monster Update ----
        this.updateMonsters(delta);

        // ---- Combat Update ----
        GAME.Combat.update(delta);

        // ---- Particles ----
        GAME.Particles.update(delta, this.camera);

        // ---- Camera Follow ----
        this.updateCamera(delta);

        // ---- HUD Update ----
        this.updateHUD();

        // ---- Wave Check ----
        this.checkWaveComplete(delta);

        // ---- Water Waves ----
        if (this.currentLevel === 0 || this.currentLevel === 1 || this.currentLevel === 3) {
            this.animateWater(this.clock.getElapsedTime());
        }

        // ---- Stars Twinkle & Rotation ----
        this.updateSky(delta);
    },

    updateSky(delta) {
        const stars = this.scene.getObjectByName('starfield');
        if (stars) {
            stars.rotation.y += delta * 0.005;
            stars.material.opacity = 0.12 + Math.sin(this.clock.getElapsedTime() * 1.5) * 0.06;
        }
    },

    animateWater(time) {
        if (!this.environmentGroup) return;
        this.environmentGroup.traverse(child => {
            if (child.name === 'water_wave' && child.geometry) {
                const posAttr = child.geometry.attributes.position;
                if (posAttr) {
                    for (let i = 0; i < posAttr.count; i++) {
                        const x = posAttr.getX(i);
                        const y = posAttr.getY(i);
                        const z = Math.sin(x * 0.1 + time * 1.2) * 0.05 + Math.cos(y * 0.1 + time * 0.9) * 0.05;
                        posAttr.setZ(i, z);
                    }
                    posAttr.needsUpdate = true;
                }
            }
        });
    },

    // ============================================================
    // HERO INPUT
    // ============================================================
    handleHeroInput(delta) {
        const hero = this.hero;
        if (!hero || hero.isDodging) return;

        // Movement
        const moveDir = new THREE.Vector3();
        const speed = hero.speed * (hero.speedMultiplier || 1.0);

        if (GAME.Input.keys.w) moveDir.z -= 1;
        if (GAME.Input.keys.s) moveDir.z += 1;
        if (GAME.Input.keys.a) moveDir.x -= 1;
        if (GAME.Input.keys.d) moveDir.x += 1;

        if (moveDir.length() > 0) {
            moveDir.normalize();
            hero.facing.copy(moveDir);

            // Update hero velocity for animation
            hero.velocity.copy(moveDir).multiplyScalar(speed);

            const movement = moveDir.multiplyScalar(speed * delta);
            hero.mesh.position.add(movement);

            // Arena bounds
            const bounds = GAME.Levels.arenaSize || 35;
            hero.mesh.position.x = Math.max(-bounds, Math.min(bounds, hero.mesh.position.x));
            hero.mesh.position.z = Math.max(-bounds, Math.min(bounds, hero.mesh.position.z));

            // Face movement direction
            const angle = Math.atan2(hero.facing.x, hero.facing.z);
            hero.mesh.rotation.y = angle;
        } else {
            hero.velocity.set(0, 0, 0);
        }

        // Attack — aim toward mouse cursor
        if (GAME.Input.mouse.clicked) {
            // Raycast mouse onto ground plane (y=0) so attacks aim where you click
            const mouseVec = new THREE.Vector2(GAME.Input.mouse.x, GAME.Input.mouse.y);
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouseVec, this.camera);
            const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            const groundPoint = new THREE.Vector3();
            raycaster.ray.intersectPlane(groundPlane, groundPoint);

            if (groundPoint) {
                // Face hero toward mouse target
                const aimDir = new THREE.Vector3()
                    .subVectors(groundPoint, hero.mesh.position)
                    .setY(0);
                if (aimDir.lengthSq() > 0.01) {
                    aimDir.normalize();
                    hero.facing.copy(aimDir);
                    hero.mesh.rotation.y = Math.atan2(aimDir.x, aimDir.z);
                }
            }

            const attackInfo = hero.attack();
            if (attackInfo) {
                GAME.Audio.play('slash');
                GAME.Combat.heroAttack(attackInfo);

                // Mana regen on attack
                hero.restoreMana(2);

                // For ranged heroes, create projectile toward the mouse target
                if (hero.attackRange > 5) {
                    const projPos = hero.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0));
                    const projTarget = groundPoint
                        ? groundPoint.clone().setY(1.5)
                        : projPos.clone().add(hero.facing.clone().multiplyScalar(hero.attackRange));
                    GAME.Combat.createProjectile(projPos, projTarget, hero.attackDamage * (hero.damageMultiplier || 1), 18, hero.color, 'hero');
                }
            }
        }

        // Powers
        if (GAME.Input.keys.digit1) {
            const powerResult = hero.usePower(0);
            if (powerResult) {
                GAME.Combat.executePower(powerResult, hero.mesh.position.clone(), hero.facing.clone());
            }
        }
        if (GAME.Input.keys.digit2) {
            const powerResult = hero.usePower(1);
            if (powerResult) {
                GAME.Combat.executePower(powerResult, hero.mesh.position.clone(), hero.facing.clone());
            }
        }

        // Dodge
        if (GAME.Input.keys.space) {
            hero.dodge();
        }
    },

    // ============================================================
    // MONSTER UPDATE
    // ============================================================
    updateMonsters(delta) {
        const heroPos = this.hero ? this.hero.mesh.position : new THREE.Vector3();

        for (let i = this.monsters.length - 1; i >= 0; i--) {
            const monster = this.monsters[i];

            if (monster.isDead()) {
                // Fade out and remove
                monster.mesh.traverse(child => {
                    if (child.isMesh && child.material) {
                        child.material.transparent = true;
                        child.material.opacity -= delta * 3;
                    }
                });

                if (!monster._fadeTimer) monster._fadeTimer = 0;
                monster._fadeTimer += delta;

                if (monster._fadeTimer > 0.5) {
                    this.scene.remove(monster.mesh);
                    monster.mesh.traverse(child => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) child.material.dispose();
                    });
                    this.monsters.splice(i, 1);
                    GAME.Combat.setMonsters(this.monsters);
                }
                continue;
            }

            // AI update
            monster.update(delta, heroPos);

            // Check monster attack
            if (monster.canAttack && monster.canAttack()) {
                const attacked = GAME.Combat.monsterAttackHero(monster);
                if (attacked) {
                    monster.resetAttackTimer();
                }
            }

            // Ranged monster shooting
            if (monster.shouldShoot && monster.shouldShoot()) {
                const origin = monster.mesh.position.clone();
                GAME.Combat.createProjectile(origin, heroPos.clone(), monster.damage, 8, monster.color, 'monster');
                monster.resetAttackTimer();
                GAME.Audio.play('fireball');
            }

            // Arena bounds for monsters
            const bounds = GAME.Levels.arenaSize || 35;
            monster.mesh.position.x = Math.max(-bounds, Math.min(bounds, monster.mesh.position.x));
            monster.mesh.position.z = Math.max(-bounds, Math.min(bounds, monster.mesh.position.z));

            // Update boss health bar
            if (monster.isBoss) {
                const bossHealthFill = document.getElementById('boss-health-fill');
                if (bossHealthFill) {
                    bossHealthFill.style.width = `${(monster.hp / monster.maxHp) * 100}%`;
                }
            }
        }
    },

    // ============================================================
    // WAVE MANAGEMENT
    // ============================================================
    checkWaveComplete(delta) {
        if (!this.waveActive) return;

        // Check if all monsters are dead
        const aliveMonsters = this.monsters.filter(m => !m.isDead());

        if (aliveMonsters.length === 0) {
            this.waveClearTimer += delta;

            if (this.waveClearTimer > 0.5) {
                this.waveActive = false;
                this.waveClearTimer = 0;

                const levelDef = GAME.Levels.definitions[this.currentLevel];

                if (this.bossSpawned) {
                    // Boss defeated — level complete
                    this.bossDefeated = true;

                    // Hide boss health bar
                    const bossContainer = document.getElementById('boss-health-container');
                    if (bossContainer) bossContainer.classList.remove('active');

                    if (this.currentLevel >= GAME.Levels.definitions.length - 1) {
                        // Final level complete — VICTORY!
                        if (this.hero) this.totalScore += this.hero.score;
                        this.setState('VICTORY');
                    } else {
                        this.setState('LEVEL_COMPLETE');
                    }
                } else {
                    // Next wave
                    this.currentWave++;

                    // Mana regen between waves
                    if (this.hero) this.hero.restoreMana(20);

                    this.spawnWave();
                }
            }
        } else {
            this.waveClearTimer = 0;
        }
    },

    // ============================================================
    // CAMERA
    // ============================================================
    updateCamera(delta) {
        if (!this.hero) return;

        const targetPos = this.hero.mesh.position.clone().add(this.cameraOffset);
        this.camera.position.lerp(targetPos, 5 * delta);

        const lookTarget = this.hero.mesh.position.clone().add(this.cameraLookOffset);
        this.camera.lookAt(lookTarget);

        // Update combat camera reference for shake
        GAME.Combat.originalCameraPos = targetPos.clone();
    },

    // ============================================================
    // HUD UPDATE
    // ============================================================
    updateHUD() {
        if (!this.hero) return;

        // Health bar
        const healthFill = document.getElementById('health-fill');
        const healthText = document.getElementById('health-text');
        if (healthFill) healthFill.style.width = `${(this.hero.hp / this.hero.maxHp) * 100}%`;
        if (healthText) healthText.textContent = `${Math.ceil(this.hero.hp)} / ${this.hero.maxHp}`;

        // Mana bar
        const manaFill = document.getElementById('mana-fill');
        const manaText = document.getElementById('mana-text');
        if (manaFill) manaFill.style.width = `${(this.hero.mana / this.hero.maxMana) * 100}%`;
        if (manaText) manaText.textContent = `${Math.ceil(this.hero.mana)} / ${this.hero.maxMana}`;

        // Score
        const scoreDisp = document.getElementById('score-display');
        if (scoreDisp) scoreDisp.textContent = this.totalScore + (this.hero.score || 0);

        // Combo
        const comboDisp = document.getElementById('combo-display');
        const combo = GAME.Combat.getCombo();
        if (comboDisp) {
            if (combo > 1) {
                comboDisp.textContent = `${combo}x COMBO!`;
                comboDisp.classList.add('active');
            } else {
                comboDisp.classList.remove('active');
            }
        }

        // Power cooldowns
        this.updatePowerSlot('power1-slot', 0);
        this.updatePowerSlot('power2-slot', 1);
    },

    updatePowerSlot(slotId, powerIndex) {
        const slot = document.getElementById(slotId);
        if (!slot || !this.hero) return;

        const cooldown = this.hero.powerCooldowns[powerIndex];
        const maxCooldown = this.hero.powers[powerIndex].cooldown;
        const overlay = slot.querySelector('.power-cooldown-overlay');

        if (cooldown > 0) {
            slot.classList.remove('ready');
            slot.classList.add('on-cooldown');
            if (overlay) {
                overlay.style.display = 'flex';
                overlay.textContent = Math.ceil(cooldown);
            }
        } else {
            slot.classList.add('ready');
            slot.classList.remove('on-cooldown');
            if (overlay) overlay.style.display = 'none';
        }
    },

    // ============================================================
    // CLEANUP
    // ============================================================
    cleanup() {
        // Remove hero
        if (this.hero && this.hero.mesh) {
            this.scene.remove(this.hero.mesh);
        }
        this.hero = null;

        // Remove monsters
        for (const monster of this.monsters) {
            if (monster.mesh) {
                this.scene.remove(monster.mesh);
                monster.mesh.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
            }
        }
        this.monsters = [];

        // Remove environment
        if (this.environmentGroup) {
            this.scene.remove(this.environmentGroup);
            this.environmentGroup.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
            this.environmentGroup = null;
        }

        // Remove lights
        const lightsToRemove = [];
        this.scene.traverse(child => {
            if (child.name === 'envLight') lightsToRemove.push(child);
        });
        lightsToRemove.forEach(l => this.scene.remove(l));

        // Remove sky and stars
        const sky = this.scene.getObjectByName('sky_dome');
        if (sky) {
            this.scene.remove(sky);
            if (sky.geometry) sky.geometry.dispose();
            if (sky.material) sky.material.dispose();
        }
        const stars = this.scene.getObjectByName('starfield');
        if (stars) {
            this.scene.remove(stars);
            if (stars.geometry) stars.geometry.dispose();
            if (stars.material) stars.material.dispose();
        }

        // Clear combat
        if (GAME.Combat) GAME.Combat.clear();

        // Clear particles
        if (GAME.Particles) GAME.Particles.clear();

        // Stop music
        GAME.Audio.stopMusic();

        // Clear fog
        this.scene.fog = null;
    }
};

// ============================================================
// BOOT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
    GAME.Main.init();
});
