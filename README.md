# salmon-ai

AIを活用したタイムブロッキング・自己分析アプリ。タスク管理・工数見積もり・振り返りAI対話・自己分析レポート生成を提供します。

---

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js (App Router) / shadcn/ui / TanStack Query / react-hook-form + zod |
| バックエンド | Go / Gin / GORM |
| AI サービス | Python / FastAPI / Google Gemini API (google-genai) |
| データベース | PostgreSQL 16 |
| インフラ | Docker / Docker Compose |

---

## システム構成

```
フロントエンド (Next.js :3000)
    │  REST / SSE
    ▼
バックエンド (Go/Gin :8080)
    │  REST        │  SSE（中継）
    ▼              ▼
AIサービス (Python/FastAPI :8000)
    │
    ▼
Gemini API

データベース (PostgreSQL :5432)
    ▲
    └── バックエンドから GORM 経由でアクセス
```

---

## 主な機能

| 機能 | 説明 |
|---|---|
| タスク管理 | タスクのCRUD・優先度・期限・カテゴリ管理 |
| AI工数見積もり | タスク作成時にGeminiが自動で工数を予測 |
| タイムブロッキング | ドラッグ＆ドロップによるスケジュール管理 |
| スケジューリングサポート | AIが最適なタスク配置を提案 |
| 振り返りAI対話 | SSEストリーミングによるリアルタイムAIチャット |
| 自己分析レポート | 全データを分析しMarkdown形式でレポートを生成・保存 |
| 統計・進捗サマリー | 週次・月次の達成率とAIコメント |

---

## ディレクトリ構成

```
salmon-ai/
├── frontend/          # Next.js 15 アプリケーション
│   └── src/
│       ├── app/       # App Router ページ
│       └── components/
├── backend/           # Go / Gin サーバー
│   ├── cmd/server/    # main.go（エントリポイント）
│   ├── db/            # seed.sql（モックデータ）
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
└── docs/              # 設計・開発ドキュメント
```

---

## セットアップ

### 必要なもの

- Docker / Docker Compose
- Node.js 20 / pnpm（フロントエンドをローカルで動かす場合）

### 1. リポジトリをクローン

```bash
git clone https://github.com/KinuGra/salmon-ai.git
cd salmon-ai
```

### 2. 環境変数ファイルを作成

各サービスのディレクトリに環境変数ファイルを作成してください。

**`backend/.env`**
```env
DATABASE_URL=host=postgres user=user password=password dbname=appdb port=5432 sslmode=disable
PORT=8080
AI_SERVICE_URL=http://ai:8000
FIREBASE_PROJECT_ID=         # 本番時に設定（開発中は不要）
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

起動後、バックエンドが `db/seed.sql` を自動投入します（冪等）。

---

## 動作確認

| サービス | URL |
|---|---|
| フロントエンド | http://localhost:3000 |
| バックエンド (health) | http://localhost:8080/health |
| AI サービス (health) | http://localhost:8000/health |
| データベース | localhost:5432 |

### 主要画面

| パス | 内容 |
|---|---|
| `/` | ホーム |
| `/tasks` | タスク一覧 |
| `/time-blocking` | タイムブロッキング |
| `/reflection` | 振り返り・自己分析レポート |
| `/stats` | 統計・進捗サマリー |

---

## モックデータ（開発用）

Big Five に基づく3種類の行動パターンを持つユーザーが起動時に自動投入されます。
`backend/cmd/server/main.go` の `MockAuth` に渡すIDを変更してユーザーを切り替えます。

```go
`backend/cmd/server/main.go` の `MockAuth` に渡すIDを変更することで、テストするユーザーを切り替えられます。デフォルトでは `mockUser.ID` (通常は `1`) が使われますが、これを以下のように書き換えることで、特定のペルソナを持つユーザーでテストできます。

```go
// r.Use(middleware.MockAuth(mockUser.ID)) // デフォルト
r.Use(middleware.MockAuth(10))  // 田中 誠一（誠実性が高い・最適ゾーン）
// r.Use(middleware.MockAuth(20))  // 鈴木 彩花（外向性・楽観的・過信型 → 見積もりアラート発生）
// r.Use(middleware.MockAuth(30))  // 佐藤 健太（慎重すぎ・コンフォートゾーン型）
```

ファイルを保存すると air がホットリロードするため、ブラウザをリロードするだけで切り替わります。
詳細は [`docs/seed.md`](docs/seed.md) を参照してください。

---

## 開発ガイド

| ドキュメント | 内容 |
|---|---|
| [`docs/git-development-rules.md`](docs/git-development-rules.md) | Issue ドリブン開発・ブランチ命名規則 |
| [`docs/mock-auth.md`](docs/mock-auth.md) | モック認証の仕組みと本番切り替え方法 |
| [`docs/ai-client.md`](docs/ai-client.md) | AI サービスへの HTTP クライアント設計 |
| [`docs/sse.md`](docs/sse.md) | SSE ストリーミングの実装方針 |
| [`docs/seed.md`](docs/seed.md) | モックデータの設計と使い方 |

### 認証について

開発中はモック認証を使用しており、固定の `userID` をコンテキストにセットします。
本番への切り替えは `main.go` の1行変更で完結します（詳細は [`docs/mock-auth.md`](docs/mock-auth.md)）。
