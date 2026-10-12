import * as THREE from 'three';

/**
 * 高性能パーティクル管理システム
 * インスタンシングとバッチ処理で数千〜数万個の光る粒子を滑らかに描画します。
 */
export class ParticleManager {
  constructor(scene) {
    this.scene = scene;

    // 1. スペースダスト（スピードライン演出）
    this.starCount = 1800;
    this.starGeo = new THREE.BufferGeometry();
    this.starPositions = new Float32Array(this.starCount * 3);
    this.starColors = new Float32Array(this.starCount * 3);

    for (let i = 0; i < this.starCount; i++) {
      this.starPositions[i * 3 + 0] = (Math.random() - 0.5) * 300;
      this.starPositions[i * 3 + 1] = (Math.random() - 0.5) * 200 + 20;
      this.starPositions[i * 3 + 2] = -Math.random() * 800;

      const isCyan = Math.random() > 0.4;
      this.starColors[i * 3 + 0] = isCyan ? 0.0 : 1.0;
      this.starColors[i * 3 + 1] = isCyan ? 0.95 : 0.1;
      this.starColors[i * 3 + 2] = isCyan ? 1.0 : 0.8;
    }

    this.starGeo.setAttribute('position', new THREE.BufferAttribute(this.starPositions, 3));
    this.starGeo.setAttribute('color', new THREE.BufferAttribute(this.starColors, 3));

    this.starMat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.starField = new THREE.Points(this.starGeo, this.starMat);
    this.scene.add(this.starField);

    // 2. 動的爆発スパークプール
    this.sparkPool = [];
    this.activeSparks = [];
    this.maxSparks = 1200;

    const sparkGeo = new THREE.BufferGeometry();
    this.sparkPosArray = new Float32Array(this.maxSparks * 3);
    this.sparkColorArray = new Float32Array(this.maxSparks * 3);
    this.sparkSizeArray = new Float32Array(this.maxSparks);

    sparkGeo.setAttribute('position', new THREE.BufferAttribute(this.sparkPosArray, 3));
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(this.sparkColorArray, 3));

    this.sparkMat = new THREE.PointsMaterial({
      size: 3.5,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.sparkMesh = new THREE.Points(sparkGeo, this.sparkMat);
    this.scene.add(this.sparkMesh);

    // 3. ショックウェーブリング（衝撃波）
    this.rings = [];
    this.ringGeo = new THREE.RingGeometry(1, 1.4, 32);
  }

  // 敵撃破時の大爆発
  createExplosion(pos, colorHex = 0xff0055, count = 120, scale = 1.0) {
    const col = new THREE.Color(colorHex);

    for (let i = 0; i < count; i++) {
      if (this.activeSparks.length >= this.maxSparks) {
        this.activeSparks.shift();
      }

      // ランダム方向ベクトル
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();

      const speed = (Math.random() * 40 + 15) * scale;
      this.activeSparks.push({
        x: pos.x,
        y: pos.y,
        z: pos.z,
        vx: dir.x * speed,
        vy: dir.y * speed,
        vz: dir.z * speed,
        r: col.r,
        g: col.g,
        b: col.b,
        life: 1.0,
        decay: Math.random() * 0.8 + 0.6
      });
    }

    // 衝撃波リングを生成
    this.createShockwave(pos, colorHex, scale * 35);
  }

  // 衝撃波リング
  createShockwave(pos, colorHex = 0x00f3ff, maxRadius = 30) {
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(this.ringGeo, mat);
    mesh.position.copy(pos);
    mesh.lookAt(mesh.position.x, mesh.position.y, mesh.position.z + 10);
    this.scene.add(mesh);

    this.rings.push({
      mesh,
      scale: 1,
      maxRadius,
      opacity: 0.9
    });
  }

  // プレイヤーエンジンの推進スパーク
  createThrusterSpark(pos, isBoosting = false) {
    if (this.activeSparks.length >= this.maxSparks) return;

    const col = isBoosting ? new THREE.Color(0xffaa00) : new THREE.Color(0x00f3ff);
    const speed = isBoosting ? 60 : 35;

    this.activeSparks.push({
      x: pos.x + (Math.random() - 0.5) * 0.8,
      y: pos.y + (Math.random() - 0.5) * 0.8,
      z: pos.z + 1,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      vz: Math.random() * 10 + speed,
      r: col.r,
      g: col.g,
      b: col.b,
      life: 0.4,
      decay: 2.5
    });
  }

  update(deltaTime, playerSpeed = 100, isBoosting = false) {
    // 1. スペースダストのスクロール
    const positions = this.starGeo.attributes.position.array;
    const speedMultiplier = isBoosting ? 2.5 : 1.0;
    const forwardMovement = playerSpeed * speedMultiplier * deltaTime * 3.5;

    for (let i = 0; i < this.starCount; i++) {
      let z = positions[i * 3 + 2] + forwardMovement;
      if (z > 50) {
        z -= 800; // 前方にループ
        positions[i * 3 + 0] = (Math.random() - 0.5) * 300;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 200 + 20;
      }
      positions[i * 3 + 2] = z;
    }
    this.starGeo.attributes.position.needsUpdate = true;

    // 2. 爆発・推進スパークの更新
    const sparkPos = this.sparkMesh.geometry.attributes.position.array;
    const sparkCol = this.sparkMesh.geometry.attributes.color.array;

    for (let i = this.activeSparks.length - 1; i >= 0; i--) {
      const p = this.activeSparks[i];
      p.life -= p.decay * deltaTime;

      if (p.life <= 0) {
        this.activeSparks.splice(i, 1);
        continue;
      }

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.z += p.vz * deltaTime;

      // 摩擦抵抗
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.vz *= 0.96;

      const idx = i * 3;
      sparkPos[idx + 0] = p.x;
      sparkPos[idx + 1] = p.y;
      sparkPos[idx + 2] = p.z;

      sparkCol[idx + 0] = p.r * p.life;
      sparkCol[idx + 1] = p.g * p.life;
      sparkCol[idx + 2] = p.b * p.life;
    }

    // 残りのスロットをクリア
    for (let i = this.activeSparks.length; i < this.maxSparks; i++) {
      const idx = i * 3;
      sparkPos[idx + 0] = 0;
      sparkPos[idx + 1] = -9999;
      sparkPos[idx + 2] = 0;
    }

    this.sparkMesh.geometry.attributes.position.needsUpdate = true;
    this.sparkMesh.geometry.attributes.color.needsUpdate = true;

    // 3. ショックウェーブリングの更新
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      ring.scale += deltaTime * 40;
      ring.opacity -= deltaTime * 1.5;

      ring.mesh.scale.set(ring.scale, ring.scale, ring.scale);
      ring.mesh.material.opacity = Math.max(0, ring.opacity);

      if (ring.opacity <= 0 || ring.scale >= ring.maxRadius) {
        this.scene.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        ring.mesh.material.dispose();
        this.rings.splice(i, 1);
      }
    }
  }
}
