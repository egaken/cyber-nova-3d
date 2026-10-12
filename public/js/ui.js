/**
 * サイバーパンク・ホログラフィックHUD＆UI管理
 * スコア、コンボ、ゲージ、照準、カメラ視点、モーダル画面を制御します。
 */
export class UIManager {
  constructor() {
    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.kills = 0;

    // DOM要素の参照キャッシュ
    this.scoreDisplay = document.getElementById('score-display');
    this.comboDisplay = document.getElementById('combo-display');
    this.shieldBar = document.getElementById('shield-bar');
    this.shieldText = document.getElementById('shield-text');
    this.boostBar = document.getElementById('boost-bar');
    this.boostText = document.getElementById('boost-text');
    this.overdriveBar = document.getElementById('overdrive-bar');
    this.overdriveText = document.getElementById('overdrive-text');
    this.speedDisplay = document.getElementById('speed-display');
    this.reticle = document.getElementById('reticle');

    this.bossWarning = document.getElementById('boss-warning');
    this.bossHud = document.getElementById('boss-hud');
    this.bossHpBar = document.getElementById('boss-hp-bar');

    this.startScreen = document.getElementById('start-screen');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.victoryScreen = document.getElementById('victory-screen');

    this.finalScore = document.getElementById('final-score');
    this.finalKills = document.getElementById('final-kills');
    this.victoryScore = document.getElementById('victory-score');
    this.victoryRank = document.getElementById('victory-rank');

    this.camBtn = document.getElementById('cam-btn');
    this.qualityBtn = document.getElementById('quality-btn');
    this.audioToggleBtn = document.getElementById('audio-toggle-btn');
  }

  // スコア加算とコンボ加算
  addScore(points) {
    this.score += points * this.combo;
    this.combo++;
    this.comboTimer = 3.5; // 3.5秒コンボ継続
    this.kills++;

    // スコア表示更新
    this.scoreDisplay.textContent = this.score.toString().padStart(6, '0');

    // コンボタグバウンドアニメーション
    this.comboDisplay.textContent = `COMBO x${this.combo}`;
    this.comboDisplay.classList.remove('bounce');
    void this.comboDisplay.offsetWidth; // リフロー強制
    this.comboDisplay.classList.add('bounce');
  }

  // コンボタイマーの減衰
  updateCombo(deltaTime) {
    if (this.combo > 1) {
      this.comboTimer -= deltaTime;
      if (this.comboTimer <= 0) {
        this.combo = 1;
        this.comboDisplay.textContent = 'COMBO x1';
      }
    }
  }

  // レティクル（照準）位置の更新
  updateReticle(mouseX, mouseY, isLocked = false) {
    this.reticle.style.left = `${mouseX}px`;
    this.reticle.style.top = `${mouseY}px`;

    if (isLocked) {
      this.reticle.classList.add('locked');
    } else {
      this.reticle.classList.remove('locked');
    }
  }

  // 機体ステータスゲージの更新
  updateGauges(player) {
    // シールド
    const shieldPercent = Math.max(0, Math.min(100, Math.round(player.shield)));
    this.shieldBar.style.width = `${shieldPercent}%`;
    this.shieldText.textContent = `${shieldPercent}%`;
    if (shieldPercent <= 25) {
      this.shieldBar.classList.add('danger');
    } else {
      this.shieldBar.classList.remove('danger');
    }

    // ブースト
    const boostPercent = Math.max(0, Math.min(100, Math.round(player.boost)));
    this.boostBar.style.width = `${boostPercent}%`;
    this.boostText.textContent = player.isBoosting ? 'BOOSTING' : (boostPercent > 20 ? 'READY' : 'CHARGING');

    // オーバードライブ
    if (player.isOverdriveActive) {
      const durPercent = Math.round((player.overdriveDuration / 6.0) * 100);
      this.overdriveBar.style.width = `${durPercent}%`;
      this.overdriveText.textContent = 'ACTIVE!';
      this.overdriveBar.classList.add('ready');
    } else {
      const odPercent = Math.round(player.overdrive);
      this.overdriveBar.style.width = `${odPercent}%`;
      this.overdriveText.textContent = odPercent >= 100 ? 'READY! [F]' : `${odPercent}%`;
      if (odPercent >= 100) {
        this.overdriveBar.classList.add('ready');
      } else {
        this.overdriveBar.classList.remove('ready');
      }
    }

    // スピード表示
    const speedKmh = Math.round(player.speed * 6.2);
    this.speedDisplay.textContent = speedKmh.toString();
  }

  // ボス警告表示
  showBossWarning() {
    this.bossWarning.style.display = 'flex';
    setTimeout(() => {
      this.bossWarning.style.display = 'none';
      this.bossHud.style.display = 'flex';
    }, 3500);
  }

  // ボスHPバー更新
  updateBossHp(boss) {
    if (!boss) {
      this.bossHud.style.display = 'none';
      return;
    }
    const percent = Math.max(0, Math.min(100, (boss.hp / boss.maxHp) * 100));
    this.bossHpBar.style.width = `${percent}%`;
  }

  // ゲームオーバー画面表示
  showGameOver() {
    this.finalScore.textContent = this.score.toString();
    this.finalKills.textContent = this.kills.toString();
    this.gameoverScreen.classList.remove('hidden');
  }

  // ミッションクリア勝利画面表示
  showVictory() {
    this.victoryScore.textContent = this.score.toString();

    // ランク判定
    let rank = 'B';
    if (this.score >= 35000) rank = 'S+';
    else if (this.score >= 25000) rank = 'S';
    else if (this.score >= 18000) rank = 'A';
    this.victoryRank.textContent = rank;

    this.victoryScreen.classList.remove('hidden');
  }

  // リセット
  reset() {
    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.kills = 0;
    this.scoreDisplay.textContent = '000000';
    this.comboDisplay.textContent = 'COMBO x1';
    this.gameoverScreen.classList.add('hidden');
    this.victoryScreen.classList.add('hidden');
    this.bossHud.style.display = 'none';
    this.bossWarning.style.display = 'none';
  }
}
