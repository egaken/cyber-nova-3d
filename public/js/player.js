import * as THREE from 'three';

/**
 * プレイヤー機体「EX-01 PHANTOM」
 * 超未来型ステルス戦闘機のモデリング、入力制御、射撃、光のトレイル、特殊回避を制御します。
 */
export class Player {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    // 機体ステータス
    this.maxShield = 100;
    this.shield = 100;
    this.maxBoost = 100;
    this.boost = 100;
    this.overdrive = 0; // 0 - 100
    this.isOverdriveActive = false;
    this.overdriveDuration = 0;

    this.speed = 120;
    this.baseSpeed = 120;
    this.boostSpeed = 240;
    this.isBoosting = false;

    // 回避動作（バレルロール）
    this.isRolling = false;
    this.rollTimer = 0;
    this.rollDirection = 1; // 1: 右ロール, -1: 左ロール
    this.isInvulnerable = false;
    this.invulnerableTimer = 0;

    // 射撃クールダウン
    this.fireTimer = 0;
    this.fireRate = 0.12; // 秒
    this.projectiles = [];

    // 移動目標位置 (マウス・キーボードで更新)
    this.targetPos = new THREE.Vector3(0, 0, 0);
    this.pos = new THREE.Vector3(0, 0, 0);

    // 機体3Dオブジェクト
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // ライトトレイル用ポイント履歴
    this.trailPointsLeft = [];
    this.trailPointsRight = [];
    this.maxTrailPoints = 25;

    this.createModel();
    this.createTrails();
  }

  // 近未来戦闘機モデルのプロシージャル構築
  createModel() {
    // 1. メイン胴体（細身のステルス多面体）
    const bodyGeo = new THREE.ConeGeometry(1.4, 7, 5);
    bodyGeo.rotateX(Math.PI / 2);
    bodyGeo.scale(1, 0.45, 1);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0a1020,
      roughness: 0.2,
      metalness: 0.9
    });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.group.add(this.bodyMesh);

    // 発光エッジライン
    const edgeGeo = new THREE.EdgesGeometry(bodyGeo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x00f3ff,
      linewidth: 2,
      blending: THREE.AdditiveBlending
    });
    const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
    this.group.add(edgeLines);

    // 2. コックピットキャノピー（クリアネオンシアン）
    const cockpitGeo = new THREE.ConeGeometry(0.65, 3.2, 4);
    cockpitGeo.rotateX(Math.PI / 2);
    cockpitGeo.scale(0.8, 0.5, 0.9);
    const cockpitMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
      blending: THREE.AdditiveBlending
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.4, -0.6);
    this.group.add(cockpit);

    // 3. 前進翼（デルタウィング）
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(6.5, -2.5);
    wingShape.lineTo(5.8, -3.8);
    wingShape.lineTo(1.2, -2.2);
    wingShape.lineTo(0, -3.0);
    wingShape.lineTo(-1.2, -2.2);
    wingShape.lineTo(-5.8, -3.8);
    wingShape.lineTo(-6.5, -2.5);
    wingShape.closePath();

    const extrudeSettings = { depth: 0.15, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.05, bevelThickness: 0.05 };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    wingGeo.rotateX(Math.PI / 2);

    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x0d152a,
      roughness: 0.3,
      metalness: 0.8
    });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    wings.position.set(0, 0, 1.2);
    this.group.add(wings);

    // 翼端のネオンライン
    const wingEdgeGeo = new THREE.EdgesGeometry(wingGeo);
    const wingEdgeMat = new THREE.LineBasicMaterial({
      color: 0x00f3ff,
      blending: THREE.AdditiveBlending
    });
    const wingEdges = new THREE.LineSegments(wingEdgeGeo, wingEdgeMat);
    wings.add(wingEdges);

    // 4. デュアル推進エンジンノズル
    const engineGeo = new THREE.CylinderGeometry(0.35, 0.45, 1.8, 12);
    engineGeo.rotateX(Math.PI / 2);
    const engineMat = new THREE.MeshStandardMaterial({
      color: 0x111122,
      metalness: 0.95
    });

    const leftEngine = new THREE.Mesh(engineGeo, engineMat);
    leftEngine.position.set(-0.8, 0, 2.2);
    this.group.add(leftEngine);

    const rightEngine = leftEngine.clone();
    rightEngine.position.x = 0.8;
    this.group.add(rightEngine);

    // エンジン噴射口の光るコア（ブルームで強く発光）
    const nozzleMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      blending: THREE.AdditiveBlending
    });
    const nozzleGeo = new THREE.CircleGeometry(0.32, 16);

    const leftNozzleGlow = new THREE.Mesh(nozzleGeo, nozzleMat);
    leftNozzleGlow.position.set(-0.8, 0, 3.11);
    this.group.add(leftNozzleGlow);

    const rightNozzleGlow = leftNozzleGlow.clone();
    rightNozzleGlow.position.x = 0.8;
    this.group.add(rightNozzleGlow);

    this.nozzleGlows = [leftNozzleGlow, rightNozzleGlow];

    // 5. シールドバリア（被弾時に発光）
    const shieldGeo = new THREE.IcosahedronGeometry(4.2, 2);
    this.shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, this.shieldMat);
    this.group.add(this.shieldMesh);
  }

  // 翼端から後方に伸びるライトトレイル
  createTrails() {
    const trailMat = new THREE.LineBasicMaterial({
      color: 0x00f3ff,
      linewidth: 3,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    this.leftTrailGeo = new THREE.BufferGeometry();
    this.rightTrailGeo = new THREE.BufferGeometry();

    const emptyArray = new Float32Array(this.maxTrailPoints * 3);
    this.leftTrailGeo.setAttribute('position', new THREE.BufferAttribute(emptyArray, 3));
    this.rightTrailGeo.setAttribute('position', new THREE.BufferAttribute(emptyArray.slice(), 3));

    this.leftTrailMesh = new THREE.Line(this.leftTrailGeo, trailMat);
    this.rightTrailMesh = new THREE.Line(this.rightTrailGeo, trailMat);

    this.scene.add(this.leftTrailMesh);
    this.scene.add(this.rightTrailMesh);
  }

  // 弾丸（ツインプラズマレーザー）の発射
  fire(audio) {
    if (this.fireTimer > 0) return;
    this.fireTimer = this.fireRate;

    if (audio) audio.playLaser();

    // 左右の翼から1発ずつレーザー発射
    const offsets = [-2.2, 2.2];
    offsets.forEach(offsetX => {
      const laserGeo = new THREE.CylinderGeometry(0.08, 0.08, 5.0, 8);
      laserGeo.rotateX(Math.PI / 2);
      const laserMat = new THREE.MeshBasicMaterial({
        color: this.isOverdriveActive ? 0xffe600 : 0x00f3ff,
        blending: THREE.AdditiveBlending
      });
      const laserMesh = new THREE.Mesh(laserGeo, laserMat);

      laserMesh.position.set(
        this.group.position.x + offsetX,
        this.group.position.y - 0.2,
        this.group.position.z - 2
      );

      this.scene.add(laserMesh);
      this.projectiles.push({
        mesh: laserMesh,
        speed: 550,
        damage: this.isOverdriveActive ? 75 : 25,
        life: 1.5
      });
    });
  }

  // バレルロール回避発動
  triggerRoll(dir) {
    if (this.isRolling) return;
    this.isRolling = true;
    this.rollTimer = 0;
    this.rollDirection = dir; // 1 or -1
    this.isInvulnerable = true;
    this.invulnerableTimer = 0.6;
  }

  // オーバードライブ発動
  triggerOverdrive(audio, postprocess) {
    if (this.overdrive < 100 || this.isOverdriveActive) return;
    this.isOverdriveActive = true;
    this.overdriveDuration = 6.0; // 6秒間無敵＆超高速
    this.isInvulnerable = true;
    this.overdrive = 0;

    if (audio) {
      audio.playOverdrive();
      audio.speak("HYPER OVERDRIVE ACTIVE");
    }
    if (postprocess) {
      postprocess.triggerImpulse(0.025, 0.9);
    }
  }

  // 被弾処理
  takeDamage(amount, audio, postprocess) {
    if (this.isInvulnerable) return;

    this.shield -= amount;
    this.isInvulnerable = true;
    this.invulnerableTimer = 0.5;

    // シールドバリアを一時発光
    this.shieldMat.opacity = 0.8;
    this.shieldMat.color.setHex(this.shield < 30 ? 0xff0055 : 0x00f3ff);

    if (audio) audio.playHit();
    if (postprocess) postprocess.triggerImpulse(0.015, 0.6);

    if (this.shield <= 0) {
      this.shield = 0;
    }
  }

  update(deltaTime, keys, mouseNorm, audio, postprocess, particles) {
    // 1. 無敵タイマー
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= deltaTime;
      if (this.invulnerableTimer <= 0 && !this.isOverdriveActive && !this.isRolling) {
        this.isInvulnerable = false;
      }
    }

    // シールドバリアの発光減衰
    if (this.shieldMat.opacity > 0) {
      this.shieldMat.opacity -= deltaTime * 2.5;
    }

    // 2. オーバードライブ管理
    if (this.isOverdriveActive) {
      this.overdriveDuration -= deltaTime;
      if (this.overdriveDuration <= 0) {
        this.isOverdriveActive = false;
        this.isInvulnerable = false;
        if (audio) audio.speak("HYPER OVERDRIVE EXHAUSTED");
      }
    } else {
      // 通常時は敵を倒すことでオーバードライブが蓄積
    }

    // 3. ブーストとスピード
    const boostRequested = (keys['ShiftLeft'] || keys['ShiftRight'] || keys['SpaceBoost'] || keys['MouseRight']);
    if (boostRequested && this.boost > 5) {
      this.isBoosting = true;
      this.boost = Math.max(0, this.boost - deltaTime * 35);
      this.speed = THREE.MathUtils.lerp(this.speed, this.boostSpeed, 0.15);
      if (audio) audio.setMode('boost');
    } else {
      this.isBoosting = false;
      this.boost = Math.min(this.maxBoost, this.boost + deltaTime * 20);
      this.speed = THREE.MathUtils.lerp(this.speed, this.baseSpeed, 0.1);
      if (audio && audio.mode === 'boost') audio.setMode('normal');
    }

    if (this.isOverdriveActive) {
      this.speed = this.boostSpeed * 1.5;
    }

    // ノズル発光色の変化
    const glowColor = this.isOverdriveActive
      ? 0xffe600
      : (this.isBoosting ? 0xffaa00 : 0x00f3ff);
    this.nozzleGlows.forEach(glow => glow.material.color.setHex(glowColor));

    // 4. 移動操作の計算 (マウス + キーボード)
    let moveX = mouseNorm.x * 38;
    let moveY = mouseNorm.y * 22;

    if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 25;
    if (keys['KeyD'] || keys['ArrowRight']) moveX += 25;
    if (keys['KeyW'] || keys['ArrowUp']) moveY += 16;
    if (keys['KeyS'] || keys['ArrowDown']) moveY -= 16;

    // 可動域制限
    moveX = THREE.MathUtils.clamp(moveX, -45, 45);
    moveY = THREE.MathUtils.clamp(moveY, -14, 25);

    this.targetPos.set(moveX, moveY, 0);

    // スムーズ追従 (Lerp)
    this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, this.targetPos.x, 0.12);
    this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, this.targetPos.y, 0.12);

    // 5. 機体の傾き（バンク / ロール / ピッチ）
    const deltaX = this.targetPos.x - this.group.position.x;
    const deltaY = this.targetPos.y - this.group.position.y;

    let targetRoll = -deltaX * 0.055;
    const targetPitch = deltaY * 0.04;

    // バレルロール回避アニメーション
    if (this.isRolling) {
      this.rollTimer += deltaTime * 5.5;
      targetRoll = this.rollDirection * (this.rollTimer * Math.PI * 2);
      this.group.position.x += this.rollDirection * deltaTime * 50;

      if (this.rollTimer >= 1.0) {
        this.isRolling = false;
        this.rollTimer = 0;
      }
    }

    this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, targetRoll, 0.18);
    this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, targetPitch, 0.18);
    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, -deltaX * 0.02, 0.18);

    // 6. 推進パーティクル
    if (particles) {
      const leftNozzlePos = new THREE.Vector3(-0.8, 0, 3).applyMatrix4(this.group.matrixWorld);
      const rightNozzlePos = new THREE.Vector3(0.8, 0, 3).applyMatrix4(this.group.matrixWorld);
      particles.createThrusterSpark(leftNozzlePos, this.isBoosting || this.isOverdriveActive);
      particles.createThrusterSpark(rightNozzlePos, this.isBoosting || this.isOverdriveActive);
    }

    // 7. ライトトレイルの更新
    this.updateTrails();

    // 8. 射撃クールダウン
    if (this.fireTimer > 0) {
      this.fireTimer -= deltaTime;
    }

    // 9. 発射弾丸の移動と消滅
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.mesh.position.z -= p.speed * deltaTime;
      p.life -= deltaTime;

      if (p.life <= 0 || p.mesh.position.z < -800) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }

  // 翼端トレイル更新
  updateTrails() {
    const leftWingPos = new THREE.Vector3(-6.5, 0, 1.2).applyMatrix4(this.group.matrixWorld);
    const rightWingPos = new THREE.Vector3(6.5, 0, 1.2).applyMatrix4(this.group.matrixWorld);

    this.trailPointsLeft.unshift(leftWingPos);
    this.trailPointsRight.unshift(rightWingPos);

    if (this.trailPointsLeft.length > this.maxTrailPoints) {
      this.trailPointsLeft.pop();
      this.trailPointsRight.pop();
    }

    const posL = this.leftTrailGeo.attributes.position.array;
    const posR = this.rightTrailGeo.attributes.position.array;

    for (let i = 0; i < this.trailPointsLeft.length; i++) {
      const pl = this.trailPointsLeft[i];
      const pr = this.trailPointsRight[i];

      posL[i * 3 + 0] = pl.x;
      posL[i * 3 + 1] = pl.y;
      posL[i * 3 + 2] = pl.z;

      posR[i * 3 + 0] = pr.x;
      posR[i * 3 + 1] = pr.y;
      posR[i * 3 + 2] = pr.z;
    }

    this.leftTrailGeo.attributes.position.needsUpdate = true;
    this.rightTrailGeo.attributes.position.needsUpdate = true;
  }
}
