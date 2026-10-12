import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * カスタムSFシェーダー（色収差・走査線・歪み・ビネット）
 * 色収差（RGBの色ずれ）とビネット（周辺減光）で映画のレンズのようなリアル感を演出します。
 */
const CyberPostShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAberration: { value: 0.002 }, // 色収差の強さ（被弾時やブースト時に増大）
    uGlitch: { value: 0.0 },      // グリッチノイズ
    uVignette: { value: 0.8 }     // ビネットの強さ
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAberration;
    uniform float uGlitch;
    uniform float uVignette;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;

      // グリッチ（微細な水平走査線シフト）
      if (uGlitch > 0.0) {
        float slice = sin(uv.y * 80.0 + uTime * 20.0);
        if (slice > 0.95) {
          uv.x += (sin(uTime * 30.0) * 0.02) * uGlitch;
        }
      }

      // 色収差（画面中央から外側に向けて赤と青の光を分離）
      vec2 distFromCenter = uv - 0.5;
      vec2 offset = distFromCenter * uAberration;

      float r = texture2D(tDiffuse, uv + offset).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - offset).b;

      vec3 color = vec3(r, g, b);

      // ビネット効果（四隅をなめらかに暗く引き締める）
      float dist = length(distFromCenter);
      float vignette = smoothstep(0.8, 0.2, dist * uVignette);
      color *= vignette;

      gl_FragColor = vec4(color, 1.0);
    }
  `
};

export class PostProcessManager {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.composer = null;
    this.bloomPass = null;
    this.customPass = null;
    this.quality = 'ultra'; // 'ultra', 'high', 'medium', 'low'

    this.init();
  }

  init() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // RenderTarget設定（高精度HDRレンダリング）
    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      samples: 4
    });

    this.composer = new EffectComposer(this.renderer, renderTarget);

    // 1. 通常レンダリングパス
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // 2. Unreal Bloomパス（ネオン発光効果）
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.4,  // 強さ (strength)
      0.45, // 半径 (radius)
      0.65  // 閾値 (threshold: 明るい部分だけを発光させる)
    );
    this.composer.addPass(this.bloomPass);

    // 3. カスタムポストエフェクトパス（色収差・グリッチ・ビネット）
    this.customPass = new ShaderPass(CyberPostShader);
    this.composer.addPass(this.customPass);

    // 4. トーンマッピング・カラーマネジメント出力パス
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  setSize(width, height) {
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  setQuality(level) {
    this.quality = level;
    if (level === 'ultra') {
      this.bloomPass.enabled = true;
      this.bloomPass.strength = 1.4;
      this.customPass.enabled = true;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    } else if (level === 'high') {
      this.bloomPass.enabled = true;
      this.bloomPass.strength = 1.0;
      this.customPass.enabled = true;
      this.renderer.setPixelRatio(1);
    } else if (level === 'medium') {
      this.bloomPass.enabled = true;
      this.bloomPass.strength = 0.6;
      this.customPass.enabled = false;
      this.renderer.setPixelRatio(1);
    } else if (level === 'low') {
      this.bloomPass.enabled = false;
      this.customPass.enabled = false;
      this.renderer.setPixelRatio(1);
    }
  }

  // ブースト時や被弾時に色収差やグリッチを一時的に強調
  triggerImpulse(aberration = 0.015, glitch = 0.8) {
    if (this.customPass && this.customPass.enabled) {
      this.customPass.uniforms.uAberration.value = aberration;
      this.customPass.uniforms.uGlitch.value = glitch;
    }
  }

  render(deltaTime, isBoosting = false) {
    if (this.customPass && this.customPass.enabled) {
      this.customPass.uniforms.uTime.value += deltaTime;

      // ブースト時はベースの色収差を少し上げる
      const targetAberration = isBoosting ? 0.007 : 0.002;
      this.customPass.uniforms.uAberration.value = THREE.MathUtils.lerp(
        this.customPass.uniforms.uAberration.value,
        targetAberration,
        0.1
      );

      // グリッチの減衰
      this.customPass.uniforms.uGlitch.value = THREE.MathUtils.lerp(
        this.customPass.uniforms.uGlitch.value,
        0.0,
        0.1
      );
    }

    if (this.quality === 'low') {
      this.renderer.render(this.scene, this.camera);
    } else {
      this.composer.render();
    }
  }
}
