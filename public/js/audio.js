/**
 * Web Audio API を活用したプロシージャル・シンセサイザー＆効果音生成システム
 * 外部音声ファイルへの依存をゼロにし、即座かつ超軽量・高品質にサウンドを鳴らします。
 */
class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.tempo = 128; // BPM
    this.step = 0;
    this.mode = 'normal'; // 'normal', 'boost', 'boss'

    // マスター音量
    this.masterGain = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // バックグラウンド音楽ループ開始
    this.startBGM();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
    }
    return !this.isMuted;
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'boost') {
      this.tempo = 145;
    } else if (mode === 'boss') {
      this.tempo = 138;
    } else {
      this.tempo = 128;
    }
  }

  /**
   * サイバーパンク・シンセウェーブBGMループ
   */
  startBGM() {
    if (this.bgmPlaying) return;
    this.bgmPlaying = true;

    // 音階（サイバーパンクなマイナースケール: Dマイナー / F / C / A#）
    const bassNotes = [73.42, 73.42, 87.31, 65.41]; // D2, D2, F2, C2
    const arpeggioNotes = [
      293.66, 349.23, 440.00, 523.25, 587.33, 523.25, 440.00, 349.23 // D4, F4, A4, C5, D5, C5, A4, F4
    ];

    const beatInterval = (60 / this.tempo) / 4; // 16分音符の秒数

    const loop = () => {
      if (!this.bgmPlaying || !this.ctx) return;

      const time = this.ctx.currentTime;
      const s = this.step % 16;
      const chordIndex = Math.floor((this.step / 16) % 4);

      // 1. キックドラム（4つ打ち）
      if (s % 4 === 0) {
        this.playKick(time);
      }

      // 2. スネア / クラップ（2拍目・4拍目）
      if (s === 4 || s === 12) {
        this.playSnare(time);
      }

      // 3. ハイハット（裏拍・16分音符）
      if (s % 2 === 1 || this.mode === 'boost') {
        this.playHihat(time, s % 4 === 2);
      }

      // 4. 重低音シンセベース（16分音符ドライブ）
      if (s % 2 === 0) {
        const root = bassNotes[chordIndex];
        const oct = (s === 6 || s === 14) ? 2 : 1;
        this.playBassNote(time, root * oct);
      }

      // 5. アルペジオリード（高揚感）
      if (this.mode !== 'normal' || s % 2 === 1) {
        const note = arpeggioNotes[(this.step + chordIndex * 2) % arpeggioNotes.length];
        this.playArpNote(time, note);
      }

      this.step++;
      this.bgmTimer = setTimeout(loop, beatInterval * 1000);
    };

    loop();
  }

  // キックドラム
  playKick(time) {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.35);

    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.35);
  }

  // スネアドラム
  playSnare(time) {
    if (!this.ctx || this.isMuted) return;
    // ノイズ成分
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
  }

  // ハイハット
  playHihat(time, accent) {
    if (!this.ctx || this.isMuted) return;
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.2;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(accent ? 0.25 : 0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
  }

  // シンセベース
  playBassNote(time, freq) {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    const cutoff = this.mode === 'boost' ? 1400 : 800;
    filter.frequency.setValueAtTime(cutoff, time);
    filter.frequency.exponentialRampToValueAtTime(150, time + 0.15);
    filter.Q.setValueAtTime(4, time);

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.18);
  }

  // リードシンセ（アルペジオ）
  playArpNote(time, freq) {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const delay = this.ctx.createDelay();
    const feedback = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    delay.delayTime.setValueAtTime(0.18, time);
    feedback.gain.setValueAtTime(0.25, time);

    delay.connect(feedback);
    feedback.connect(delay);

    osc.connect(gain);
    gain.connect(this.masterGain);
    gain.connect(delay);
    delay.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.22);
  }

  /* ---------------- SFX (効果音) ---------------- */

  // プラズマレーザー発射音
  playLaser() {
    if (!this.ctx || this.isMuted) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.12);

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.12);
  }

  // 敵の爆発音（ヘビーなサブベース＋ノイズ）
  playExplosion(isLarge = false) {
    if (!this.ctx || this.isMuted) return;
    const time = this.ctx.currentTime;
    const dur = isLarge ? 0.8 : 0.45;

    // 低音ドスッ
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isLarge ? 120 : 160, time);
    osc.frequency.exponentialRampToValueAtTime(20, time + dur);
    oscGain.gain.setValueAtTime(isLarge ? 0.6 : 0.4, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + dur);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + dur);

    // ノイズ爆発
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, time);
    filter.frequency.exponentialRampToValueAtTime(80, time + dur);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(isLarge ? 0.5 : 0.3, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + dur);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(time);
  }

  // ゲート通過音（クリスタルチャイム）
  playRingPass() {
    if (!this.ctx || this.isMuted) return;
    const time = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time + i * 0.04);
      gain.gain.setValueAtTime(0.18, time + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, time + i * 0.04 + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time + i * 0.04);
      osc.stop(time + i * 0.04 + 0.35);
    });
  }

  // オーバードライブ起動音
  playOverdrive() {
    if (!this.ctx || this.isMuted) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(1200, time + 0.6);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.linearRampToValueAtTime(0.6, time + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.8);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.8);
  }

  // 被弾警告音
  playHit() {
    if (!this.ctx || this.isMuted) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.setValueAtTime(150, time + 0.08);

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  // AI音声アナウンス (Web Speech API)
  speak(text) {
    if (!('speechSynthesis' in window) || this.isMuted) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.15;
      utterance.pitch = 0.9;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      // 音声非対応でもエラーを握りつぶす
    }
  }
}

export const audio = new AudioManager();
