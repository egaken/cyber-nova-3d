FROM node:20-alpine

WORKDIR /app

# 依存関係定義のコピー
COPY package*.json ./

# 本番依存パッケージのインストール
RUN npm ci --omit=dev || npm install --omit=dev

# アプリケーションコードのコピー
COPY . .

# Cloud Run のデフォルトポート
ENV PORT=8080
EXPOSE 8080

# サーバー起動
CMD ["node", "server.js"]
