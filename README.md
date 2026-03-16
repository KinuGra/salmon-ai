# salmon-ai

## 必要なもの

- Docker / Docker Compose
- Go 1.25
- Python 3.12
- Node.js 20 / pnpm

## 起動手順

1. リポジトリをクローン
   git clone https://github.com/KinuGra/salmon-ai.git
   cd salmon-ai

2. 環境変数ファイルを作成・編集
   backend/.env
   ai/.env
   frontend/.env.local
   （Firebaseの設定値などを記入）

3. 起動
   cd infra
   docker compose up --build

## 確認

- Frontend: http://localhost:3000
- Backend: http://localhost:8080/health
- AI: http://localhost:8000/health
- DB: localhost:5432
