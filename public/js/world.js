import * as THREE from 'three';

/**
 * 3Dサイバーパンクワールド管理
 * 無限サイバーグリッド、ネオンビル群、巨大ネオンサン、ワープリングゲートを生成・管理します。
 */
export class WorldManager {
  constructor(scene) {
    this.scene = scene;
    this.buildings = [];
    this.rings = [];
    this.gridSegments = [];
    this.speed = 100;
    this.ringSpawnTimer = 0;

    this.init();
  }

  init() {
    this.createNeonSun();
    this.createCyberGrid();
    this.createCityBuildings();
  }

  // 遥か地平線に輝く巨大ネオンサン / レトロフューチャー太陽
  createNeonSun() {
    const sunGeo = new THREE.CircleGeometry(160, 64);
    // 上から下へのネオンマゼンタ〜オレンジのグラデーションシェーダー
    const sunMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor1: { value: new THREE.Color(0xff007f) },
        uColor2: { value: new THREE.Color(0xffaa00) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        varying vec2 vUv;
        void main() {
          // ブラインド風の横ストライプ
          float lines = step(0.12, fract(vUv.y * 22.0));
          vec3 col = mix(uColor2, uColor1, vUv.y);
          if (vUv.y < 0.6) {
            col *= lines;
          }
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.DoubleSide,
      transparent: true
    });

    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, 45, -700);
    this.scene.add(sun);

    // 太陽の周囲の巨大グローオーラ
    const auraGeo = new THREE.CircleGeometry(240, 32);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.position.set(0, 45, -710);
    this.scene.add(aura);
  }

  // 無限スクロールするサイバーグリッドフロア
  createCyberGrid() {
    const gridSize = 800;
    const divisions = 80;

    // 前後に2枚のグリッドを並べて無限ループ
    for (let i = 0; i < 2; i++) {
      const grid = new THREE.GridHelper(gridSize, divisions, 0x00f3ff, 0x112244);
      grid.position.set(0, -25, -i * gridSize);
      grid.material.transparent = true;
      grid.material.opacity = 0.75;
      grid.material.blending = THREE.AdditiveBlending;
      this.scene.add(grid);
      this.gridSegments.push(grid);
    }
  }

  // 両脇に立ち並ぶサイバーパンク・メガビルディング群
  createCityBuildings() {
    const buildingCount = 60;
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);

    // 発光するエッジ用マテリアル
    const neonColors = [0x00f3ff, 0xff0055, 0x8800ff, 0x00ffaa];

    for (let i = 0; i < buildingCount; i++) {
      const color = neonColors[Math.floor(Math.random() * neonColors.length)];

      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x050714,
        roughness: 0.2,
        metalness: 0.8
      });

      const mesh = new THREE.Mesh(boxGeo, bodyMat);

      // ワイヤーフレーム / ネオンエッジ
      const edgeGeo = new THREE.EdgesGeometry(boxGeo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: color,
        linewidth: 1.5,
        blending: THREE.AdditiveBlending
      });
      const wireframe = new THREE.LineSegments(edgeGeo, edgeMat);
      mesh.add(wireframe);

      // ビルのサイズと配置（中央通路を空けて左右に配置）
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = (Math.random() * 120 + 45) * side;
      const z = -Math.random() * 800;
      const width = Math.random() * 18 + 12;
      const height = Math.random() * 140 + 30;
      const depth = Math.random() * 25 + 15;

      mesh.scale.set(width, height, depth);
      mesh.position.set(x, -25 + height / 2, z);

      this.scene.add(mesh);
      this.buildings.push({ mesh, width, height, depth });
    }
  }

  // ワープリング（加速ゲート）のスポーン
  spawnRing() {
    const ringGeo = new THREE.TorusGeometry(8, 0.45, 12, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      blending: THREE.AdditiveBlending
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);

    // プレイヤーが届く高さと左右の範囲
    const x = (Math.random() - 0.5) * 60;
    const y = Math.random() * 25 - 5;
    ring.position.set(x, y, -700);

    // リング内部の光の膜（パルス）
    const innerGeo = new THREE.CircleGeometry(7.5, 32);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    ring.add(inner);

    this.scene.add(ring);
    this.rings.push({ mesh: ring, radius: 8 });
  }

  update(deltaTime, playerSpeed, isBoosting, onRingPassed) {
    const currentSpeed = playerSpeed * (isBoosting ? 2.2 : 1.0);
    const movement = currentSpeed * deltaTime * 3.5;

    // 1. サイバーグリッドのスクロール
    const gridSize = 800;
    this.gridSegments.forEach(grid => {
      grid.position.z += movement;
      if (grid.position.z > gridSize) {
        grid.position.z -= gridSize * 2;
      }
    });

    // 2. ビルのスクロールと手前からのリスポーン
    this.buildings.forEach(b => {
      b.mesh.position.z += movement;
      if (b.mesh.position.z > 100) {
        b.mesh.position.z -= 850;
        const side = Math.random() > 0.5 ? 1 : -1;
        b.mesh.position.x = (Math.random() * 120 + 45) * side;
        const newHeight = Math.random() * 140 + 30;
        b.mesh.scale.y = newHeight;
        b.mesh.position.y = -25 + newHeight / 2;
      }
    });

    // 3. ワープリングの定期スポーン
    this.ringSpawnTimer += deltaTime;
    if (this.ringSpawnTimer > 3.0) {
      this.ringSpawnTimer = 0;
      this.spawnRing();
    }

    // 4. ワープリングの更新と衝突判定
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      ring.mesh.position.z += movement;
      ring.mesh.rotation.z += deltaTime * 1.5; // 回転

      // プレイヤー通過チェック (zが0付近で接近)
      if (Math.abs(ring.mesh.position.z) < 12) {
        if (onRingPassed) {
          const hit = onRingPassed(ring.mesh.position, ring.radius);
          if (hit) {
            this.scene.remove(ring.mesh);
            this.rings.splice(i, 1);
            continue;
          }
        }
      }

      // 画面後方に流れたら消去
      if (ring.mesh.position.z > 50) {
        this.scene.remove(ring.mesh);
        this.rings.splice(i, 1);
      }
    }
  }
}
