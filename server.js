const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Three.jsモジュールの配信（ローカルnode_modulesから配信することでオフラインでも確実に動作）
app.use('/vendor/three', express.static(path.join(__dirname, 'node_modules/three')));

// 静的ファイルの配信（ゲームクライアント）
app.use(express.static(path.join(__dirname, 'public')));

// ヘルスチェックエンドポイント（Cloud Run / 監視用）
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// SPAフォールバック（どのURLでもindex.htmlを返す）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(` CYBER NOVA: NEON OVERDRIVE Server Running`);
  console.log(` Listening on port: ${PORT}`);
  console.log(` Local access: http://localhost:${PORT}`);
  console.log(`===============================================`);
});
