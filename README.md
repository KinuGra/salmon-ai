# salmon-ai

AIを活用したタイムブロッキング・自己分析アプリ。
タスク管理・工数見積もり・振り返りAI対話・自己分析レポート生成を提供します。

---

## 技術スタック

| レイヤー       | 技術                                 |
| -------------- | ------------------------------------ |
| フロントエンド | Next.js (App Router)                 |
| バックエンド   | Go / Gin / GORM                      |
| AI サービス    | Python / FastAPI / Google Gemini API |
| データベース   | PostgreSQL                           |
| インフラ       | Docker                               |

---

---

## 主な機能

| 機能                     | 説明                                     |
| ------------------------ | ---------------------------------------- |
| タスク管理               | タスクのCRUD・優先度・期限・カテゴリ管理 |
| AI工数見積もり           | タスク作成時にGeminiが自動で工数を予測   |
| タイムブロッキング       | ドラッグ＆ドロップによるスケジュール管理 |
| スケジューリングサポート | AIが最適なタスク配置を提案               |
| 振り返りAI対話           | AIチャットによって振り返りを支援         |
| 自己分析レポート         | データを蓄積してユーザーの行動特性を分析 |
| 統計・進捗サマリー       | 週次・月次の達成率とAIコメント           |

---

## ディレクトリ構成

```
salmon-ai/
├── frontend/          # Next.js
│   └── src/
│       ├── app/       # App Router ページ
│       └── components/
├── backend/           # Go / Gin サーバー
│   ├── cmd/server/    # main.go（エントリポイント）
│   ├── internal/
│   │   ├── handler/   # リクエスト受付・レスポンス返却
│   │   ├── service/   # ビジネスロジック・ContextBuilder
│   │   ├── repository/# DB アクセス（SQL はここのみ）
│   │   ├── model/     # GORM モデル定義
│   │   └── middleware/# 認証・CORS
│   └── pkg/
│       └── aiclient/  # Python AI サービスへの HTTP クライアント
├── ai/                # Python / FastAPI サーバー
│   └── app/
│       ├── routers/   # エンドポイント定義
│       ├── services/  # Gemini API 呼び出しロジック
│       ├── prompts/   # プロンプトテンプレート
│       └── schemas/   # Pydantic スキーマ
├── infra/             # Docker / Docker Compose
│   ├── docker-compose.yml
│   └── *.dockerfile
└── docs/              # ドキュメント
```

---

## セットアップ

### 必要なもの

- Docker

### 1. リポジトリをクローン

```bash
git clone https://github.com/KinuGra/salmon-ai.git
cd salmon-ai
```

### 2. 環境変数ファイルを作成

各サービスのディレクトリに環境変数ファイルを作成してください。

**`backend/.env`**

```env
DATABASE_URL=postgres://user:password@postgres:5432/appdb
PORT=8080
AI_SERVICE_URL=http://ai:8000
```

**`ai/.env`**

```env
GEMINI_API_KEY=your_gemini_api_key
```

**`frontend/.env.local`**

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

> Gemini API キーは [Google AI Studio](https://aistudio.google.com/) で取得できます。

### 3. 起動

```bash
cd infra
docker compose up --build
```

起動後、バックエンドが `seed.sql` を自動投入します。

---

## 動作確認

| サービス              | URL                          |
| --------------------- | ---------------------------- |
| フロントエンド        | http://localhost:3000        |
| バックエンド (health) | http://localhost:8080/health |
| AI サービス (health)  | http://localhost:8000/health |
| データベース          | localhost:5432               |

### 主要画面

| パス             | 内容                       |
| ---------------- | -------------------------- |
| `/tasks`         | タスク一覧                 |
| `/time-blocking` | タイムブロッキング         |
| `/reflection`    | 振り返り・自己分析レポート |
| `/stats`         | 統計・進捗サマリー         |

---
