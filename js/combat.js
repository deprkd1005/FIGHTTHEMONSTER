// ============================================================
// COMBAT SYSTEM — Fight the Monster: Brunei Legends Edition
// Handles hit detection, damage, combos, health drops, shake
// ============================================================
window.GAME = window.GAME || {};

GAME.Combat = {
    scene: null,
    hero: null,
    monsters: [],
    projectiles: [],
    healthDrops: [],
    combo: 0,
    comboTimer: 0,
    comboTimeout: 2.0,
    shakeIntensity: 0,
    shakeDuration: 0,
    shakeTimer: 0,
    originalCameraPos: null,
    camera: null,

    init(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.originalCameraPos = camera.position.clone();
        this.projectiles = [];
        this.healthDrops = [];
        this.combo = 0;
        this.comboTimer = 0;
        this.shakeIntensity = 0;
    },

    setHero(hero) {
        this.hero = hero;
    },

    setMonsters(monsters) {
        this.monsters = monsters;
    },

    // ---- Hero attacks monsters ----
    heroAttack(attackInfo) {
        if (!attackInfo || !this.monsters.length) return;

        const heroPos = this.hero.mesh.position;
        const facing = this.hero.facing;
        let hitCount = 0;

        for (let i = this.monsters.length - 1; i >= 0; i--) {
            const monster = this.monsters[i];
            if (!monster || monster.isDead()) continue;

            const monsterPos = monster.mesh.position;
            const dist = heroPos.distanceTo(monsterPos);

            // Check range
            if (dist > attackInfo.range) continue;

            // For melee, check facing direction (narrower ~60 degree cone)
            if (attackInfo.type === 'melee') {
                const toMonster = new THREE.Vector3().subVectors(monsterPos, heroPos).normalize();
                const dot = facing.dot(toMonster);
                if (dot < 0.5) continue; // ~60 degree half-angle — must face the monster
            }

            // Calculate damage with combo multiplier
            const comboMultiplier = 1 + (this.combo * 0.1);
            const damageMultiplier = this.hero.damageMultiplier || 1.0;
            const baseDamage = attackInfo.damage * damageMultiplier * comboMultiplier;

            // Critical hit chance (10%)
            const isCrit = Math.random() < 0.1;
            const finalDamage = Math.floor(isCrit ? baseDamage * 2 : baseDamage);

            monster.takeDamage(finalDamage);
            hitCount++;

            // Particle effect at monster position
            if (GAME.Particles) {
                GAME.Particles.emit('hit', monsterPos.clone().add(new THREE.Vector3(0, 1, 0)), {
                    color: isCrit ? 0xff4444 : 0xffd700,
                    count: isCrit ? 12 : 6
                });
            }

            // Floating damage number
            if (GAME.Particles) {
                GAME.Particles.createDamageNumber(
                    monsterPos.clone().add(new THREE.Vector3(0, 2.5, 0)),
                    finalDamage,
                    isCrit ? 'crit' : 'normal'
                );
            }

            // Audio
            if (GAME.Audio) {
                GAME.Audio.play('hit');
                if (isCrit) GAME.Audio.play('combo');
            }

            // Knockback
            if (attackInfo.knockback) {
                const pushDir = new THREE.Vector3().subVectors(monsterPos, heroPos).normalize();
                monster.mesh.position.add(pushDir.multiplyScalar(attackInfo.knockback));
            }

            // Check if monster died
            if (monster.isDead()) {
                this.onMonsterKill(monster, i);
            }

            // For non-AOE attacks, only hit one target
            if (!attackInfo.aoe) break;
        }

        if (hitCount > 0) {
            this.combo++;
            this.comboTimer = this.comboTimeout;

            // Screen shake on hit
            this.triggerShake(0.1 + (hitCount * 0.05), 0.15);

            // Audio for combo
            if (this.combo > 2 && GAME.Audio) {
                GAME.Audio.play('combo');
            }
        }

        return hitCount;
    },

    // ---- Monster attacks hero ----
    monsterAttackHero(monster) {
        if (!this.hero || this.hero.isDead() || this.hero.isInvincible || this.hero.isDodging) return false;

        const dist = monster.mesh.position.distanceTo(this.hero.mesh.position);
        if (dist > monster.attackRange) return false;

        const damage = monster.damage;
        this.hero.takeDamage(damage);

        // Effects
        if (GAME.Particles) {
            GAME.Particles.emit('burst', this.hero.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), {
                color: 0xe63946,
                count: 8
            });
            GAME.Particles.createDamageNumber(
                this.hero.mesh.position.clone().add(new THREE.Vector3(0, 2.5, 0)),
                damage,
                'normal'
            );
        }

        if (GAME.Audio) GAME.Audio.play('hit');

        // Knockback hero slightly
        const pushDir = new THREE.Vector3()
            .subVectors(this.hero.mesh.position, monster.mesh.position)
            .normalize()
            .multiplyScalar(1.5);
        this.hero.mesh.position.add(pushDir);

        // Reset combo on hit
        this.combo = 0;

        // Screen shake
        this.triggerShake(0.2, 0.2);

        return true;
    },

    // ---- Special power effects ----
    executePower(powerDef, heroPos, facing) {
        if (!powerDef) return;

        switch (powerDef.type) {
            case 'aoe_stun':
                this.executeAOEStun(heroPos, powerDef);
                break;
            case 'buff':
                this.executeBuff(powerDef);
                break;
            case 'heal_buff':
                this.executeHealBuff(powerDef);
                break;
            case 'beam':
                this.executeBeam(heroPos, facing, powerDef);
                break;
            case 'heal_aoe':
                this.executeHealAOE(heroPos, powerDef);
                break;
            case 'summon':
                this.executeSummon(heroPos, facing, powerDef);
                break;
            case 'aoe_push':
                this.executeAOEPush(heroPos, powerDef);
                break;
            case 'dash_chain':
                this.executeDashChain(heroPos, facing, powerDef);
                break;
        }
    },

    executeAOEStun(pos, power) {
        // Awang Semaun - Warrior's Might ground slam
        if (GAME.Audio) GAME.Audio.play('explosion');
        if (GAME.Particles) {
            GAME.Particles.emit('burst', pos.clone(), { color: 0xffd700, count: 30, speed: 8, size: 0.3 });
        }
        this.triggerShake(0.4, 0.3);

        for (const monster of this.monsters) {
            if (monster.isDead()) continue;
            const dist = monster.mesh.position.distanceTo(pos);
            if (dist <= power.range) {
                monster.takeDamage(power.damage);
                monster.stun(2.0);
                if (GAME.Particles) {
                    GAME.Particles.createDamageNumber(
                        monster.mesh.position.clone().add(new THREE.Vector3(0, 2.5, 0)),
                        power.damage, 'crit'
                    );
                }
                if (monster.isDead()) this.onMonsterKill(monster);
            }
        }
    },

    executeBuff(power) {
        // Awang Semaun - Invincible Rage
        this.hero.isInvincible = true;
        this.hero.damageMultiplier = power.damageBoost;
        if (GAME.Audio) GAME.Audio.play('powerup');
        if (GAME.Particles) {
            GAME.Particles.emit('aura', this.hero.mesh.position, { color: 0xff4400, count: 20 });
        }
        // Set emissive glow
        this.hero.mesh.traverse(child => {
            if (child.isMesh && child.material) {
                child.userData.originalEmissive = child.material.emissive ? child.material.emissive.getHex() : 0;
                child.material.emissive = new THREE.Color(0xff4400);
                child.material.emissiveIntensity = 0.5;
            }
        });

        setTimeout(() => {
            if (this.hero) {
                this.hero.isInvincible = false;
                this.hero.damageMultiplier = 1.0;
                this.hero.mesh.traverse(child => {
                    if (child.isMesh && child.material) {
                        child.material.emissive = new THREE.Color(child.userData.originalEmissive || 0);
                        child.material.emissiveIntensity = 0.1;
                    }
                });
            }
        }, power.duration * 1000);
    },

    executeHealBuff(power) {
        // Awang Alak Betatar - Sultan's Decree
        this.hero.heal(power.healAmount);
        this.hero.speedMultiplier = power.speedBoost;
        if (GAME.Audio) GAME.Audio.play('heal');
        if (GAME.Particles) {
            GAME.Particles.emit('heal', this.hero.mesh.position, { color: 0x52b788, count: 15 });
            GAME.Particles.createDamageNumber(
                this.hero.mesh.position.clone().add(new THREE.Vector3(0, 3, 0)),
                power.healAmount, 'heal'
            );
        }
        setTimeout(() => {
            if (this.hero) this.hero.speedMultiplier = 1.0;
        }, power.duration * 1000);
    },

    executeBeam(pos, facing, power) {
        // Awang Alak Betatar - Golden Crown Blast
        if (GAME.Audio) GAME.Audio.play('fireball');
        this.triggerShake(0.3, 0.3);

        // Create beam visual
        const beamGeo = new THREE.CylinderGeometry(0.3, 0.3, power.range, 8);
        beamGeo.rotateZ(Math.PI / 2);
        const beamMat = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            transparent: true,
            opacity: 0.8
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.copy(pos).add(new THREE.Vector3(0, 1.5, 0));
        beam.lookAt(pos.clone().add(facing.clone().multiplyScalar(power.range)).add(new THREE.Vector3(0, 1.5, 0)));
        beam.position.add(facing.clone().multiplyScalar(power.range / 2));
        this.scene.add(beam);

        // Emit particles along beam
        for (let i = 0; i < 5; i++) {
            const p = pos.clone().add(facing.clone().multiplyScalar((power.range / 5) * i)).add(new THREE.Vector3(0, 1.5, 0));
            if (GAME.Particles) GAME.Particles.emit('burst', p, { color: 0xffd700, count: 5 });
        }

        // Damage enemies in beam path
        for (const monster of this.monsters) {
            if (monster.isDead()) continue;
            const monsterPos = monster.mesh.position;
            // Check if monster is roughly in front of hero within beam width
            const toMonster = new THREE.Vector3().subVectors(monsterPos, pos);
            const projDist = toMonster.dot(facing);
            if (projDist < 0 || projDist > power.range) continue;
            const perpDist = toMonster.clone().sub(facing.clone().multiplyScalar(projDist)).length();
            if (perpDist < 2.5) {
                monster.takeDamage(power.damage);
                if (GAME.Particles) {
                    GAME.Particles.createDamageNumber(
                        monsterPos.clone().add(new THREE.Vector3(0, 2.5, 0)),
                        power.damage, 'crit'
                    );
                }
                if (monster.isDead()) this.onMonsterKill(monster);
            }
        }

        // Fade beam
        let opacity = 0.8;
        const fadeBeam = setInterval(() => {
            opacity -= 0.1;
            beamMat.opacity = opacity;
            if (opacity <= 0) {
                clearInterval(fadeBeam);
                this.scene.remove(beam);
                beamGeo.dispose();
                beamMat.dispose();
            }
        }, 50);
    },

    executeHealAOE(pos, power) {
        // Puteri Kinangan - Healing Monsoon
        if (GAME.Audio) GAME.Audio.play('heal');
        if (GAME.Particles) {
            GAME.Particles.emit('heal', pos.clone().add(new THREE.Vector3(0, 5, 0)), {
                color: 0x52b788, count: 30, spread: power.range
            });
        }

        // Heal over time
        let ticks = 0;
        const healInterval = setInterval(() => {
            if (this.hero && !this.hero.isDead()) {
                const healPerTick = Math.floor(power.healAmount / 6);
                this.hero.heal(healPerTick);
                if (GAME.Particles) {
                    GAME.Particles.createDamageNumber(
                        this.hero.mesh.position.clone().add(new THREE.Vector3(Math.random() - 0.5, 3, Math.random() - 0.5)),
                        healPerTick, 'heal'
                    );
                }
            }
            ticks++;
            if (ticks >= 6) clearInterval(healInterval);
        }, (power.duration * 1000) / 6);
    },

    executeSummon(pos, facing, power) {
        // Puteri Kinangan - Naga's Fury
        if (GAME.Audio) GAME.Audio.play('fireball');
        this.triggerShake(0.2, 0.2);

        // Create Naga projectile
        const nagaGroup = new THREE.Group();
        // Serpent body — chain of spheres
        for (let i = 0; i < 6; i++) {
            const seg = new THREE.Mesh(
                new THREE.SphereGeometry(0.4 - i * 0.05, 8, 6),
                new THREE.MeshStandardMaterial({
                    color: 0x2d6a4f,
                    emissive: 0x00ff88,
                    emissiveIntensity: 0.5,
                    transparent: true,
                    opacity: 0.8
                })
            );
            seg.position.set(0, 0, -i * 0.6);
            nagaGroup.add(seg);
        }
        nagaGroup.position.copy(pos).add(new THREE.Vector3(0, 1.5, 0));
        nagaGroup.lookAt(pos.clone().add(facing.clone().multiplyScalar(10)));
        this.scene.add(nagaGroup);

        // Add as projectile
        this.projectiles.push({
            mesh: nagaGroup,
            velocity: facing.clone().multiplyScalar(15),
            damage: power.damage,
            range: power.range,
            distTraveled: 0,
            piercing: true,
            hitTargets: new Set(),
            owner: 'hero'
        });
    },

    executeAOEPush(pos, power) {
        // Panglima Awang - Ocean Wave
        if (GAME.Audio) GAME.Audio.play('explosion');
        if (GAME.Particles) {
            GAME.Particles.emit('burst', pos.clone(), { color: 0x0077b6, count: 25, speed: 6 });
        }
        this.triggerShake(0.3, 0.2);

        for (const monster of this.monsters) {
            if (monster.isDead()) continue;
            const dist = monster.mesh.position.distanceTo(pos);
            if (dist <= power.range) {
                monster.takeDamage(power.damage);
                // Knockback
                const pushDir = new THREE.Vector3()
                    .subVectors(monster.mesh.position, pos)
                    .normalize()
                    .multiplyScalar(power.knockback || 5);
                monster.mesh.position.add(pushDir);
                if (GAME.Particles) {
                    GAME.Particles.createDamageNumber(
                        monster.mesh.position.clone().add(new THREE.Vector3(0, 2.5, 0)),
                        power.damage, 'normal'
                    );
                }
                if (monster.isDead()) this.onMonsterKill(monster);
            }
        }
    },

    executeDashChain(pos, facing, power) {
        // Panglima Awang - Voyager Dash chain
        if (GAME.Audio) GAME.Audio.play('dodge');
        this.hero.isInvincible = true;

        let dashCount = 0;
        const maxDashes = power.dashCount || 3;

        const doDash = () => {
            if (dashCount >= maxDashes || !this.hero || this.hero.isDead()) {
                if (this.hero) this.hero.isInvincible = false;
                return;
            }

            // Find nearest alive monster
            let nearest = null;
            let nearestDist = Infinity;
            for (const monster of this.monsters) {
                if (monster.isDead()) continue;
                const d = this.hero.mesh.position.distanceTo(monster.mesh.position);
                if (d < nearestDist && d < 15) {
                    nearest = monster;
                    nearestDist = d;
                }
            }

            if (nearest) {
                // Dash to monster
                const targetPos = nearest.mesh.position.clone();
                this.hero.mesh.position.copy(targetPos);
                nearest.takeDamage(power.damage);
                if (GAME.Particles) {
                    GAME.Particles.emit('hit', targetPos.clone().add(new THREE.Vector3(0, 1, 0)), {
                        color: 0x00b4d8, count: 8
                    });
                    GAME.Particles.createDamageNumber(
                        targetPos.clone().add(new THREE.Vector3(0, 2.5, 0)),
                        power.damage, 'normal'
                    );
                }
                if (GAME.Audio) GAME.Audio.play('hit');
                if (nearest.isDead()) this.onMonsterKill(nearest);
            } else {
                // Dash forward if no targets
                this.hero.mesh.position.add(facing.clone().multiplyScalar(5));
            }

            dashCount++;
            if (dashCount < maxDashes) {
                setTimeout(doDash, 150);
            } else {
                this.hero.isInvincible = false;
            }
        };

        doDash();
    },

    // ---- Monster kill handler ----
    onMonsterKill(monster, index) {
        // Score
        if (this.hero) {
            const comboMultiplier = 1 + (this.combo * 0.15);
            const points = Math.floor((monster.xpValue || 10) * 10 * comboMultiplier);
            this.hero.score = (this.hero.score || 0) + points;
        }

        // Death particles
        if (GAME.Particles) {
            GAME.Particles.emit('death', monster.mesh.position.clone(), {
                color: monster.color || 0xff0000,
                count: 20
            });
        }

        if (GAME.Audio) {
            if (monster.isBoss) {
                GAME.Audio.play('bossdeath');
            } else {
                GAME.Audio.play('explosion');
            }
        }

        // Health drop chance
        const dropChance = monster.isBoss ? 1.0 : 0.2;
        if (Math.random() < dropChance) {
            this.spawnHealthDrop(monster.mesh.position.clone());
        }
    },

    // ---- Health drops ----
    spawnHealthDrop(position) {
        const dropGeo = new THREE.SphereGeometry(0.3, 8, 6);
        const dropMat = new THREE.MeshStandardMaterial({
            color: 0x52b788,
            emissive: 0x00ff44,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.9
        });
        const drop = new THREE.Mesh(dropGeo, dropMat);
        drop.position.copy(position);
        drop.position.y = 0.5;
        this.scene.add(drop);

        // Add glow
        const glow = new THREE.PointLight(0x00ff44, 0.5, 5);
        drop.add(glow);

        this.healthDrops.push({
            mesh: drop,
            healAmount: 20,
            lifetime: 10,
            bobTime: 0
        });
    },

    // ---- Projectile management ----
    updateProjectiles(delta) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            const moveAmount = proj.velocity.clone().multiplyScalar(delta);
            proj.mesh.position.add(moveAmount);
            proj.distTraveled += moveAmount.length();

            // Trail particles
            if (GAME.Particles && Math.random() < 0.3) {
                GAME.Particles.emit('trail', proj.mesh.position.clone(), {
                    color: proj.owner === 'hero' ? 0x00ff88 : 0xff4400,
                    count: 2
                });
            }

            // Check collisions
            if (proj.owner === 'hero') {
                for (const monster of this.monsters) {
                    if (monster.isDead()) continue;
                    if (proj.hitTargets && proj.hitTargets.has(monster)) continue;
                    const dist = proj.mesh.position.distanceTo(monster.mesh.position);
                    if (dist < 1.2) { // Tighter hit radius — projectile must visually connect
                        monster.takeDamage(proj.damage);
                        if (GAME.Particles) {
                            GAME.Particles.emit('hit', monster.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), {
                                color: 0xffd700, count: 6
                            });
                            GAME.Particles.createDamageNumber(
                                monster.mesh.position.clone().add(new THREE.Vector3(0, 2.5, 0)),
                                proj.damage, 'normal'
                            );
                        }
                        if (monster.isDead()) this.onMonsterKill(monster);
                        if (proj.piercing) {
                            proj.hitTargets.add(monster);
                        } else {
                            this.removeProjectile(i);
                            break;
                        }
                    }
                }
            } else if (proj.owner === 'monster') {
                if (this.hero && !this.hero.isDead() && !this.hero.isInvincible && !this.hero.isDodging) {
                    const dist = proj.mesh.position.distanceTo(this.hero.mesh.position);
                    if (dist < 1.0) { // Tighter hit radius for monster projectiles too
                        this.hero.takeDamage(proj.damage);
                        if (GAME.Particles) {
                            GAME.Particles.emit('burst', this.hero.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), {
                                color: 0xe63946, count: 8
                            });
                        }
                        if (GAME.Audio) GAME.Audio.play('hit');
                        this.combo = 0;
                        this.triggerShake(0.15, 0.15);
                        this.removeProjectile(i);
                        continue;
                    }
                }
            }

            // Remove if traveled too far
            if (proj.distTraveled > (proj.range || 20)) {
                this.removeProjectile(i);
            }
        }
    },

    removeProjectile(index) {
        const proj = this.projectiles[index];
        if (proj && proj.mesh) {
            this.scene.remove(proj.mesh);
            proj.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        this.projectiles.splice(index, 1);
    },

    // ---- Create ranged projectile (used by ranged monsters) ----
    createProjectile(origin, target, damage, speed, color, owner) {
        const dir = new THREE.Vector3().subVectors(target, origin).normalize();
        const projGeo = new THREE.SphereGeometry(0.2, 6, 4);
        const projMat = new THREE.MeshBasicMaterial({
            color: color || 0xff4400,
            transparent: true,
            opacity: 0.9
        });
        const projMesh = new THREE.Mesh(projGeo, projMat);
        projMesh.position.copy(origin);
        projMesh.position.y = 1.5;

        // Glow
        const light = new THREE.PointLight(color || 0xff4400, 0.5, 5);
        projMesh.add(light);

        this.scene.add(projMesh);
        this.projectiles.push({
            mesh: projMesh,
            velocity: dir.multiplyScalar(speed || 10),
            damage: damage,
            range: 25,
            distTraveled: 0,
            piercing: false,
            hitTargets: new Set(),
            owner: owner || 'monster'
        });
    },

    // ---- Health drop collection ----
    updateHealthDrops(delta) {
        for (let i = this.healthDrops.length - 1; i >= 0; i--) {
            const drop = this.healthDrops[i];
            drop.lifetime -= delta;
            drop.bobTime += delta;

            // Bob animation
            drop.mesh.position.y = 0.5 + Math.sin(drop.bobTime * 3) * 0.2;
            drop.mesh.rotation.y += delta * 2;

            // Blink when about to expire
            if (drop.lifetime < 3) {
                drop.mesh.material.opacity = 0.5 + Math.sin(drop.bobTime * 10) * 0.4;
            }

            // Check hero pickup
            if (this.hero && !this.hero.isDead()) {
                const dist = drop.mesh.position.distanceTo(this.hero.mesh.position);
                if (dist < 2.0) {
                    this.hero.heal(drop.healAmount);
                    if (GAME.Audio) GAME.Audio.play('heal');
                    if (GAME.Particles) {
                        GAME.Particles.emit('heal', this.hero.mesh.position, { color: 0x52b788, count: 10 });
                        GAME.Particles.createDamageNumber(
                            this.hero.mesh.position.clone().add(new THREE.Vector3(0, 3, 0)),
                            drop.healAmount, 'heal'
                        );
                    }
                    this.scene.remove(drop.mesh);
                    drop.mesh.geometry.dispose();
                    drop.mesh.material.dispose();
                    this.healthDrops.splice(i, 1);
                    continue;
                }
            }

            // Remove expired
            if (drop.lifetime <= 0) {
                this.scene.remove(drop.mesh);
                drop.mesh.geometry.dispose();
                drop.mesh.material.dispose();
                this.healthDrops.splice(i, 1);
            }
        }
    },

    // ---- Screen shake ----
    triggerShake(intensity, duration) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeDuration = Math.max(this.shakeDuration, duration);
        this.shakeTimer = 0;
    },

    updateShake(delta) {
        if (this.shakeDuration <= 0 || !this.camera || !this.originalCameraPos) return;

        this.shakeTimer += delta;
        if (this.shakeTimer < this.shakeDuration) {
            const progress = this.shakeTimer / this.shakeDuration;
            const fade = 1 - progress;
            const offsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity * fade;
            const offsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity * fade;
            this.camera.position.x = this.originalCameraPos.x + offsetX;
            this.camera.position.y = this.originalCameraPos.y + offsetY;
        } else {
            this.camera.position.x = this.originalCameraPos.x;
            this.camera.position.y = this.originalCameraPos.y;
            this.shakeDuration = 0;
            this.shakeIntensity = 0;
        }
    },

    // ---- Combo management ----
    updateCombo(delta) {
        if (this.combo > 0) {
            this.comboTimer -= delta;
            if (this.comboTimer <= 0) {
                this.combo = 0;
            }
        }
    },

    getCombo() {
        return this.combo;
    },

    resetCombo() {
        this.combo = 0;
        this.comboTimer = 0;
    },

    // ---- Main update ----
    update(delta) {
        this.updateCombo(delta);
        this.updateProjectiles(delta);
        this.updateHealthDrops(delta);
        this.updateShake(delta);
    },

    // ---- Cleanup ----
    clear() {
        // Remove all projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.removeProjectile(i);
        }
        // Remove all health drops
        for (const drop of this.healthDrops) {
            if (drop.mesh) {
                this.scene.remove(drop.mesh);
                if (drop.mesh.geometry) drop.mesh.geometry.dispose();
                if (drop.mesh.material) drop.mesh.material.dispose();
            }
        }
        this.healthDrops = [];
        this.combo = 0;
        this.comboTimer = 0;
    }
};
