import * as THREE from 'three';
import { audio } from './audio.js';
import { PostProcessManager } from './postprocess.js';
import { ParticleManager } from './particles.js';
import { WorldManager } from './world.js';
import { Player } from './player.js';
import { EnemyManager } from './enemies.js';
import { UIManager } from './ui.js';

/**
 * CYBER NOVA: NEON OVERDRIVE
 * メインコントローラー＆ゲームループ
 */
class Game {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.gameState = 'start'; // 'start', 'playing', 'gameover', 'victory'

    // 入力状態
    this.keys = {};
    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.mouseNorm = { x: 0, y: 0 };
    this.isMouseDown = false;

    // カメラ視点設定
    this.cameraModes = ['3RD PERSON', 'COCKPIT', 'ACTION CAM'];
    this.currentCamIndex = 0;

    // 時間計測
    this.clock = new THREE.Clock();

    this.initThree();
    this.initModules();
    this.initEvents();

    // 初期レンダリングループ開始
    this.animate();
  }

  // Three.js シーン＆レンダラー初期化
  initThree() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x03010a, 0.0018);

    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      1200
    );
    this.camera.position.set(0, 4, 12);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    this.container.appendChild(this.renderer.domElement);

    // ライティング
    const ambientLight = new THREE.AmbientLight(0x1a2540, 1.2);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f3ff, 2.5);
    dirLight.position.set(20, 40, 20);
    this.scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0xff007f, 2.0);
    backLight.position.set(-20, 20, -50);
    this.scene.add(backLight);
  }

  // サブシステムの初期化
  initModules() {
    this.ui = new UIManager();
    this.postprocess = new PostProcessManager(this.renderer, this.scene, this.camera);
    this.particles = new ParticleManager(this.scene);
    this.world = new WorldManager(this.scene);
    this.player = new Player(this.scene, this.camera);
    this.enemies = new EnemyManager(this.scene);
  }

  // イベントリスナーの登録
  initEvents() {
    window.addEventListener('resize', () => this.onResize());

    // キーボード
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // 視点切り替え [C]
      if (e.code === 'KeyC') {
        this.toggleCamera();
      }
      // バレルロール [Q] / [E]
      if (e.code === 'KeyQ') {
        this.player.triggerRoll(-1);
      }
      if (e.code === 'KeyE') {
        this.player.triggerRoll(1);
      }
      // オーバードライブ [KeyF]
      if (e.code === 'KeyF') {
        this.player.triggerOverdrive(audio, this.postprocess);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // マウス
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouseNorm.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseNorm.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.ui.updateReticle(e.clientX, e.clientY);
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
      } else if (e.button === 2) {
        this.keys['MouseRight'] = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      } else if (e.button === 2) {
        this.keys['MouseRight'] = false;
      }
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // UIボタンイベント
    document.getElementById('start-btn').addEventListener('click', () => this.startGame());
    document.getElementById('restart-btn').addEventListener('click', () => this.restartGame());
    document.getElementById('victory-restart-btn').addEventListener('click', () => this.restartGame());

    // カメラ視点ボタン
    this.ui.camBtn.addEventListener('click', () => this.toggleCamera());

    // 画質ボタン
    const qualities = ['ULTRA', 'HIGH', 'MEDIUM', 'LOW'];
    let qIdx = 0;
    this.ui.qualityBtn.addEventListener('click', () => {
      qIdx = (qIdx + 1) % qualities.length;
      const q = qualities[qIdx];
      this.ui.qualityBtn.textContent = `GRAPHICS: ${q}`;
      this.postprocess.setQuality(q.toLowerCase());
    });

    // 音声ボタン
    this.ui.audioToggleBtn.addEventListener('click', () => {
      const active = audio.toggleMute();
      this.ui.audioToggleBtn.textContent = active ? 'AUDIO: ON' : 'AUDIO: MUTED';
    });

    // モバイルタッチボタン
    const mobileBoost = document.getElementById('mobile-boost');
    const mobileFire = document.getElementById('mobile-fire');
    const mobileOverdrive = document.getElementById('mobile-overdrive');

    if (mobileBoost) {
      mobileBoost.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys['ShiftLeft'] = true; });
      mobileBoost.addEventListener('touchend', (e) => { e.preventDefault(); this.keys['ShiftLeft'] = false; });
    }
    if (mobileFire) {
      mobileFire.addEventListener('touchstart', (e) => { e.preventDefault(); this.isMouseDown = true; });
      mobileFire.addEventListener('touchend', (e) => { e.preventDefault(); this.isMouseDown = false; });
    }
    if (mobileOverdrive) {
      mobileOverdrive.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.player.triggerOverdrive(audio, this.postprocess);
      });
    }

    // タッチによる機体移動
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        this.mouseNorm.x = (t.clientX / window.innerWidth) * 2 - 1;
        this.mouseNorm.y = -(t.clientY / window.innerHeight) * 2 + 1;
        this.ui.updateReticle(t.clientX, t.clientY);
      }
    }, { passive: true });
  }

  // カメラ視点切り替え
  toggleCamera() {
    this.currentCamIndex = (this.currentCamIndex + 1) % this.cameraModes.length;
    const mode = this.cameraModes[this.currentCamIndex];
    this.ui.camBtn.textContent = `VIEW: ${mode}`;
  }

  // ゲーム開始
  startGame() {
    audio.init();
    audio.speak("EX-01 PHANTOM LAUNCHING. COMBAT SYSTEMS OPERATIONAL.");
    this.ui.startScreen.classList.add('hidden');
    this.gameState = 'playing';
  }

  // リトライ / 再出撃
  restartGame() {
    this.ui.reset();
    this.player.shield = 100;
    this.player.boost = 100;
    this.player.overdrive = 0;
    this.player.group.position.set(0, 0, 0);

    // 敵クリア
    this.enemies.enemies.forEach(e => this.scene.remove(e.group));
    this.enemies.enemies = [];
    this.enemies.enemyProjectiles.forEach(p => this.scene.remove(p.mesh));
    this.enemies.enemyProjectiles = [];
    if (this.enemies.boss) {
      this.scene.remove(this.enemies.boss.group);
      this.enemies.boss = null;
    }
    this.enemies.bossDefeated = false;

    this.gameState = 'playing';
    audio.setMode('normal');
    audio.speak("SYSTEMS RESTORED. ENGAGING TARGETS.");
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h);
    this.postprocess.setSize(w, h);
  }

  // ゲームオーバー
  gameOver() {
    this.gameState = 'gameover';
    audio.speak("PILOT VITAL SIGNS LOST. MISSION FAILED.");
    this.ui.showGameOver();
  }

  // ステージクリア勝利
  victory() {
    this.gameState = 'victory';
    this.ui.showVictory();
  }

  // メインループ
  animate() {
    requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    if (this.gameState === 'playing') {
      // 1. 射撃入力 (クリックまたはスペース)
      if (this.isMouseDown || this.keys['Space']) {
        this.player.fire(audio);
      }

      // 2. プレイヤー更新
      this.player.update(
        deltaTime,
        this.keys,
        this.mouseNorm,
        audio,
        this.postprocess,
        this.particles
      );

      // 3. ワールド環境更新
      this.world.update(
        deltaTime,
        this.player.speed,
        this.player.isBoosting,
        (ringPos, radius) => {
          // ワープリング通過チェック
          const dist = new THREE.Vector2(this.player.group.position.x - ringPos.x, this.player.group.position.y - ringPos.y).length();
          if (dist < radius) {
            audio.playRingPass();
            this.particles.createShockwave(ringPos, 0x00f3ff, 35);
            this.ui.addScore(500);
            this.player.boost = Math.min(100, this.player.boost + 25);
            this.postprocess.triggerImpulse(0.015, 0.4);
            return true;
          }
          return false;
        }
      );

      // 4. 敵マネージャー更新
      const bossHit = this.enemies.update(
        deltaTime,
        this.ui.score,
        this.player.group.position,
        this.player.isOverdriveActive,
        audio,
        this.postprocess,
        this.particles,
        (points) => this.ui.addScore(points),
        () => this.ui.showBossWarning(),
        () => this.victory()
      );

      if (bossHit === 'boss_beam_hit') {
        this.player.takeDamage(40 * deltaTime * 2, audio, this.postprocess);
      }

      // 5. 衝突判定
      this.enemies.checkCollisions(
        this.player,
        audio,
        this.postprocess,
        this.particles,
        (pts) => this.ui.addScore(pts),
        () => this.victory()
      );

      // 6. UI＆HUDの更新
      this.ui.updateCombo(deltaTime);
      this.ui.updateGauges(this.player);
      this.ui.updateBossHp(this.enemies.boss);

      // 7. プレイヤー死亡判定
      if (this.player.shield <= 0) {
        this.particles.createExplosion(this.player.group.position, 0x00f3ff, 200, 2.0);
        this.gameOver();
      }
    } else {
      // メニュー中でも背景のサイバーグリッドとビルを美しく緩やかにスクロール
      this.world.update(deltaTime, 60, false, null);
    }

    // パーティクル更新
    this.particles.update(
      deltaTime,
      this.player.speed,
      this.player.isBoosting || this.player.isOverdriveActive
    );

    // カメラ位置・角度の制御
    this.updateCamera(deltaTime);

    // ポストプロセッシングによる最終描画
    this.postprocess.render(
      deltaTime,
      this.player.isBoosting || this.player.isOverdriveActive
    );
  }

  // カメラ視点の追従制御
  updateCamera(deltaTime) {
    const pPos = this.player.group.position;
    const mode = this.cameraModes[this.currentCamIndex];

    if (mode === '3RD PERSON') {
      // 後方追従視点
      const targetCamX = pPos.x * 0.7;
      const targetCamY = pPos.y * 0.7 + 3.8;
      const targetCamZ = pPos.z + 11.5;

      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamX, 0.12);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamY, 0.12);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCamZ, 0.12);

      // 少し先を注視
      this.camera.lookAt(pPos.x * 0.4, pPos.y * 0.4 + 1.2, -60);

      // ブースト時の視野角 (FOV) 拡大効果
      const targetFov = (this.player.isBoosting || this.player.isOverdriveActive) ? 80 : 65;
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 0.08);
      this.camera.updateProjectionMatrix();

    } else if (mode === 'COCKPIT') {
      // 一人称コックピット視点
      this.camera.position.set(pPos.x, pPos.y + 0.6, pPos.z - 0.2);
      this.camera.rotation.copy(this.player.group.rotation);
      this.camera.fov = 75;
      this.camera.updateProjectionMatrix();

    } else if (mode === 'ACTION CAM') {
      // 翼端ローアングル視点
      const actionX = pPos.x + 6;
      const actionY = pPos.y - 1.5;
      const actionZ = pPos.z + 6;

      this.camera.position.set(actionX, actionY, actionZ);
      this.camera.lookAt(pPos.x, pPos.y + 0.5, -40);
    }
  }
}

// ページ読み込み完了時にゲーム起動
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
