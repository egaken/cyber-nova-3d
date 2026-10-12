import * as THREE from 'three';

/**
 * 敵ユニット＆巨大ボス管理システム
 * 編隊ドローン、重迎撃機、巨大機動要塞「サイバー・レヴィアサン」の出現、AI動作、攻撃を制御します。
 */
export class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.enemies = [];
    this.enemyProjectiles = [];
    this.spawnTimer = 0;
    this.wave = 1;

    // ボス関連
    this.boss = null;
    this.bossSpawnScore = 15000; // ボス出現スコア
    this.bossDefeated = false;

    // 共有ジオメトリ＆マテリアル（描画パフォーマンス最適化）
    this.droneGeo = new THREE.TetrahedronGeometry(2.0);
    this.droneGeo.rotateX(Math.PI / 4);

    this.droneMat = new THREE.MeshStandardMaterial({
      color: 0x112211,
      roughness: 0.3,
      metalness: 0.8
    });
  }

  // スカウトドローンのスポーン
  spawnDrone(x, y, z = -700) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(this.droneGeo, this.droneMat);
    group.add(mesh);

    // ネオングリーンのエッジライン
    const edgeGeo = new THREE.EdgesGeometry(this.droneGeo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x00ff88,
      blending: THREE.AdditiveBlending
    });
    const edge = new THREE.LineSegments(edgeGeo, edgeMat);
    group.add(edge);

    // コア発光
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), coreMat);
    group.add(core);

    group.position.set(x, y, z);
    this.scene.add(group);

    this.enemies.push({
      type: 'drone',
      group,
      hp: 30,
      maxHp: 30,
      scoreValue: 250,
      color: 0x00ff88,
      speed: 160,
      shootTimer: Math.random() * 2,
      shootInterval: 2.2,
      seed: Math.random() * 100,
      radius: 2.5
    });
  }

  // 重迎撃機（Heavy Interceptor）のスポーン
  spawnHeavy(x, y, z = -700) {
    const group = new THREE.Group();

    // 双胴型ヘビーフレーム
    const bodyGeo = new THREE.BoxGeometry(5.0, 1.2, 4.0);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x220511, metalness: 0.9 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // ネオンレッドのエッジ
    const edgeGeo = new THREE.EdgesGeometry(bodyGeo);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xff0055, blending: THREE.AdditiveBlending });
    group.add(new THREE.LineSegments(edgeGeo, edgeMat));

    // 発光コア
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    const core = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 2), coreMat);
    core.position.y = 0.5;
    group.add(core);

    group.position.set(x, y, z);
    this.scene.add(group);

    this.enemies.push({
      type: 'heavy',
      group,
      hp: 90,
      maxHp: 90,
      scoreValue: 600,
      color: 0xff0055,
      speed: 110,
      shootTimer: 1.0,
      shootInterval: 1.6,
      seed: Math.random() * 100,
      radius: 4.0
    });
  }

  // 巨大要塞ボス「サイバー・レヴィアサン」の召喚！
  spawnBoss(audio, postprocess, onWarning) {
    if (this.boss) return;

    if (onWarning) onWarning();
    if (audio) {
      audio.setMode('boss');
      audio.speak("ALERT! MASSIVE SIGNATURE DETECTED. CYBER LEVIATHAN ENGAGING.");
    }
    if (postprocess) {
      postprocess.triggerImpulse(0.02, 0.9);
    }

    const group = new THREE.Group();

    // 1. メイン要塞フレーム
    const mainHullGeo = new THREE.OctahedronGeometry(22, 1);
    mainHullGeo.scale(2.5, 0.6, 2.0);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x070c18,
      roughness: 0.25,
      metalness: 0.95
    });
    const mainHull = new THREE.Mesh(mainHullGeo, hullMat);
    group.add(mainHull);

    // エッジライン
    const edgeGeo = new THREE.EdgesGeometry(mainHullGeo);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xff0055, blending: THREE.AdditiveBlending, linewidth: 2 });
    group.add(new THREE.LineSegments(edgeGeo, edgeMat));

    // 2. 超巨大発光コア（弱点）
    const coreGeo = new THREE.IcosahedronGeometry(7, 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xff007f,
      wireframe: true,
      blending: THREE.AdditiveBlending
    });
    this.bossCoreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.bossCoreMesh.position.set(0, 0, 0);
    group.add(this.bossCoreMesh);

    // コア内部の高密度発光球
    const innerCoreGeo = new THREE.SphereGeometry(4.5, 16, 16);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      blending: THREE.AdditiveBlending
    });
    const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    group.add(innerCore);

    // 3. 左右のプラズマウィング
    [-35, 35].forEach(sideX => {
      const wingGeo = new THREE.BoxGeometry(20, 2, 12);
      const wing = new THREE.Mesh(wingGeo, hullMat);
      wing.position.set(sideX, 0, 4);
      group.add(wing);

      const wingEdge = new THREE.LineSegments(new THREE.EdgesGeometry(wingGeo), edgeMat);
      wing.add(wingEdge);
    });

    group.position.set(0, 15, -450);
    this.scene.add(group);

    this.boss = {
      group,
      hp: 1200,
      maxHp: 1200,
      scoreValue: 10000,
      color: 0xff0055,
      radius: 28,
      phase: 1, // 1: 通常弾幕, 2: メガビーム, 3: 狂乱弾幕
      targetPos: new THREE.Vector3(0, 12, -180),
      shootTimer: 0,
      beamTimer: 0,
      isFiringBeam: false,
      beamMesh: null
    };

    // ボスのメガビームオブジェクト
    const beamGeo = new THREE.CylinderGeometry(2.5, 2.5, 300, 16);
    beamGeo.rotateX(Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });
    this.bossBeamMesh = new THREE.Mesh(beamGeo, beamMat);
    this.bossBeamMesh.position.set(0, 0, 150);
    group.add(this.bossBeamMesh);
  }

  // 敵弾の発射
  fireEnemyBullet(origin, dir, speed = 180, colorHex = 0xff0055, isLarge = false) {
    const geo = new THREE.SphereGeometry(isLarge ? 1.4 : 0.6, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origin);
    this.scene.add(mesh);

    this.enemyProjectiles.push({
      mesh,
      velocity: dir.normalize().multiplyScalar(speed),
      damage: isLarge ? 35 : 15,
      life: 5.0
    });
  }

  update(deltaTime, currentScore, playerPos, isPlayerOverdrive, audio, postprocess, particles, onScoreAdd, onWarning, onBossDefeated) {
    // 1. ボス出現チェック
    if (!this.boss && currentScore >= this.bossSpawnScore && !this.bossDefeated) {
      this.spawnBoss(audio, postprocess, onWarning);
    }

    // 2. 通常敵のスポーン（ボス未登場またはボス戦中のドローン援護）
    this.spawnTimer += deltaTime;
    const spawnRate = this.boss ? 4.0 : 1.8;
    if (this.spawnTimer > spawnRate) {
      this.spawnTimer = 0;
      const count = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 80;
        const y = Math.random() * 30 - 8;
        if (Math.random() > 0.4) {
          this.spawnDrone(x, y);
        } else {
          this.spawnHeavy(x, y);
        }
      }
    }

    // 3. 通常敵の移動とAI行動
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const time = Date.now() * 0.003 + e.seed;

      // 前進移動
      e.group.position.z += e.speed * deltaTime;

      if (e.type === 'drone') {
        // サイン波旋回
        e.group.position.x += Math.sin(time) * 0.8;
        e.group.position.y += Math.cos(time * 1.3) * 0.4;
        e.group.rotation.z = Math.sin(time) * 0.4;
      } else if (e.type === 'heavy') {
        // プレイヤーへの緩やかな追従
        e.group.position.x = THREE.MathUtils.lerp(e.group.position.x, playerPos.x, 0.02);
        e.group.rotation.y = Math.sin(time * 0.5) * 0.2;
      }

      // 射撃行動
      e.shootTimer -= deltaTime;
      if (e.shootTimer <= 0 && e.group.position.z < -20 && e.group.position.z > -500) {
        e.shootTimer = e.shootInterval;
        const shootDir = new THREE.Vector3().subVectors(playerPos, e.group.position);
        this.fireEnemyBullet(e.group.position, shootDir, 160, e.color);
      }

      // 画面後方に通り過ぎた敵の消去
      if (e.group.position.z > 40) {
        this.scene.remove(e.group);
        this.enemies.splice(i, 1);
      }
    }

    // 4. ボスの移動と攻撃パターン
    if (this.boss) {
      const b = this.boss;

      // 登場移動（奥からゆっくり指定位置へ進出）
      b.group.position.lerp(b.targetPos, 0.03);

      // コアの回転とパルス
      if (this.bossCoreMesh) {
        this.bossCoreMesh.rotation.x += deltaTime * 1.5;
        this.bossCoreMesh.rotation.y += deltaTime * 2.0;
      }

      // 左右へのゆったりとした威圧的スウェイ
      b.targetPos.x = Math.sin(Date.now() * 0.001) * 35;
      b.targetPos.y = 12 + Math.cos(Date.now() * 0.0015) * 8;

      b.shootTimer += deltaTime;
      b.beamTimer += deltaTime;

      // HPに応じたフェーズ変化
      const hpPercent = b.hp / b.maxHp;
      if (hpPercent < 0.35 && b.phase !== 3) {
        b.phase = 3;
        if (audio) audio.speak("WARNING: BOSS ENTERING BERSERK OVERDRIVE");
        if (postprocess) postprocess.triggerImpulse(0.025, 0.9);
      } else if (hpPercent < 0.7 && b.phase === 1) {
        b.phase = 2;
        if (audio) audio.speak("BEAM CANNON ENGAGED. TAKE EVASIVE ACTION.");
      }

      // 攻撃パターン1: 拡散プラズマ連射
      const shootInterval = b.phase === 3 ? 0.7 : 1.2;
      if (b.shootTimer > shootInterval) {
        b.shootTimer = 0;
        // 3方向〜5方向の弾幕
        const bulletCount = b.phase === 3 ? 5 : 3;
        for (let k = 0; k < bulletCount; k++) {
          const spread = (k - (bulletCount - 1) / 2) * 0.25;
          const dir = new THREE.Vector3(spread, (Math.random() - 0.5) * 0.2, 1).normalize();
          this.fireEnemyBullet(b.group.position, dir, 190, 0xff0055, true);
        }
      }

      // 攻撃パターン2: メガビーム照射 (フェーズ2以降)
      if (b.phase >= 2) {
        const beamCycle = b.beamTimer % 7.0;
        if (beamCycle > 4.5 && beamCycle < 6.8) {
          // ビーム照射中！
          b.isFiringBeam = true;
          this.bossBeamMesh.material.opacity = 0.9;
          this.bossBeamMesh.scale.x = 1.0 + Math.sin(Date.now() * 0.05) * 0.3;
          this.bossBeamMesh.scale.y = this.bossBeamMesh.scale.x;

          // プレイヤーがビーム軸付近にいたら大ダメージ判定
          const distToBeamX = Math.abs(playerPos.x - b.group.position.x);
          const distToBeamY = Math.abs(playerPos.y - b.group.position.y);
          if (distToBeamX < 6.5 && distToBeamY < 6.5 && playerPos.z > b.group.position.z) {
            // 被弾イベントを発生
            return 'boss_beam_hit';
          }
        } else if (beamCycle > 3.5) {
          // 予兆点滅
          this.bossBeamMesh.material.opacity = (Math.sin(Date.now() * 0.03) > 0) ? 0.25 : 0.05;
          b.isFiringBeam = false;
        } else {
          this.bossBeamMesh.material.opacity = 0;
          b.isFiringBeam = false;
        }
      }
    }

    // 5. 敵弾の移動と消滅
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const p = this.enemyProjectiles[i];
      p.mesh.position.addScaledVector(p.velocity, deltaTime);
      p.life -= deltaTime;

      if (p.life <= 0 || p.mesh.position.z > 50) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.enemyProjectiles.splice(i, 1);
      }
    }

    return null;
  }

  // 弾丸やプレイヤーとの衝突判定
  checkCollisions(player, audio, postprocess, particles, onScoreAdd, onBossDefeated) {
    const playerPos = player.group.position;

    // 1. プレイヤーの弾丸 vs 敵ユニット
    for (let pi = player.projectiles.length - 1; pi >= 0; pi--) {
      const proj = player.projectiles[pi];

      // 通常敵との判定
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        const dist = proj.mesh.position.distanceTo(e.group.position);

        if (dist < e.radius + 1.5) {
          e.hp -= proj.damage;

          // 弾丸消滅
          this.scene.remove(proj.mesh);
          player.projectiles.splice(pi, 1);

          // 火花エフェクト
          if (particles) particles.createExplosion(proj.mesh.position, e.color, 25, 0.4);

          // 敵撃破
          if (e.hp <= 0) {
            if (audio) audio.playExplosion(false);
            if (particles) particles.createExplosion(e.group.position, e.color, 90, 1.2);
            if (onScoreAdd) onScoreAdd(e.scoreValue);

            // オーバードライブゲージ蓄積
            player.overdrive = Math.min(100, player.overdrive + 12);

            this.scene.remove(e.group);
            this.enemies.splice(ei, 1);
          }
          break;
        }
      }

      // ボスとの判定
      if (this.boss && proj.mesh) {
        const distToBoss = proj.mesh.position.distanceTo(this.boss.group.position);
        if (distToBoss < this.boss.radius) {
          this.boss.hp -= proj.damage;

          this.scene.remove(proj.mesh);
          player.projectiles.splice(pi, 1);

          if (particles) particles.createExplosion(proj.mesh.position, 0xffaa00, 30, 0.6);

          // ボス撃破判定！
          if (this.boss.hp <= 0 && !this.bossDefeated) {
            this.bossDefeated = true;
            if (audio) {
              audio.playExplosion(true);
              audio.speak("TARGET DESTROYED! OUTSTANDING PILOTING.");
            }
            if (postprocess) postprocess.triggerImpulse(0.04, 1.0);
            if (particles) {
              // 超巨大連鎖爆発
              for (let k = 0; k < 6; k++) {
                setTimeout(() => {
                  const offset = new THREE.Vector3((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 20, 0);
                  particles.createExplosion(this.boss.group.position.clone().add(offset), 0xff0055, 200, 2.5);
                }, k * 180);
              }
            }

            if (onScoreAdd) onScoreAdd(this.boss.scoreValue);

            setTimeout(() => {
              this.scene.remove(this.boss.group);
              this.boss = null;
              if (onBossDefeated) onBossDefeated();
            }, 1200);
          }
          continue;
        }
      }
    }

    // 2. プレイヤー vs 敵の弾丸
    if (!player.isInvulnerable) {
      for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
        const ep = this.enemyProjectiles[i];
        if (ep.mesh.position.distanceTo(playerPos) < 2.5) {
          player.takeDamage(ep.damage, audio, postprocess);
          if (particles) particles.createExplosion(ep.mesh.position, 0xff0055, 30, 0.5);

          this.scene.remove(ep.mesh);
          this.enemyProjectiles.splice(i, 1);
          break;
        }
      }
    }

    // 3. プレイヤー vs 通常敵（体当たり）
    for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
      const e = this.enemies[ei];
      if (e.group.position.distanceTo(playerPos) < e.radius + 2.0) {
        if (player.isOverdriveActive) {
          // オーバードライブ時は敵を粉砕！
          if (audio) audio.playExplosion(true);
          if (particles) particles.createExplosion(e.group.position, 0xffe600, 150, 1.8);
          if (onScoreAdd) onScoreAdd(e.scoreValue * 2);

          this.scene.remove(e.group);
          this.enemies.splice(ei, 1);
        } else if (!player.isInvulnerable) {
          player.takeDamage(40, audio, postprocess);
          if (particles) particles.createExplosion(playerPos, 0xff0055, 60, 1.0);
        }
      }
    }
  }
}
