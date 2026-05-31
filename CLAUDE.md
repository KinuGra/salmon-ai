# salmon-ai アーキテクチャ概要

## システム全体構成

本システムはフロントエンド・バックエンド・AIサービスの3層構造で構成される。
フロントエンドはVercelにデプロイされたNext.js アプリケーション、
バックエンドはGoのGinサーバー、
AIサービスはPythonのFastAPIサーバーである。
データはPostgreSQLで永続化する。

---

## フロントエンド（Next.js 15）

App Routerを使用したNext.js 15アプリケーション。
UIコンポーネントはshadcn/uiを使用し、スマホ・PC両対応のレスポンシブデザインで構築する。

サーバーとの通信にはTanStack Queryを使用する。
CRUDのような通常のAPIリクエストはREST、
振り返りAI対話のストリーミング表示にはSSE（Server-Sent Events）を使用する。
フォームの状態管理とバリデーションにはreact-hook-form + zodを使用する。

リクエスト時はAuthorizationヘッダーに `Bearer {IDトークン}` を付与する。
IDトークンはFirebase Auth SDKを通じて取得する（追加機能）。
認証機能が未実装の開発フェーズでは、バックエンドのモック認証ミドルウェアと組み合わせて動作する。

---

## バックエンド（Go / Gin）

フロントエンドからのリクエストを受け付けるメインのAPIサーバー。
ビジネスロジックの処理・DBとのやりとり・AIサービスへのリクエスト転送を担う。

### ミドルウェア

リクエストはまずミドルウェア層を通過する。

CORSミドルウェアはフロントエンドからのクロスオリジンリクエストを許可する。
認証ミドルウェアはAuthorizationヘッダーのIDトークンをFirebase Admin SDKで検証し、
検証が通った場合はリクエストのコンテキストにuser_idをセットする。
開発中はモック認証ミドルウェアを使用し、固定のuser_idをコンテキストにセットする。
本番への切り替えはmain.goの1行差し替えで完結する。

### レイヤー構成

Handler・Service・Repositoryの3層構造を採用する。

Handlerはリクエストのパースとレスポンスの返却のみを担う。
Serviceはビジネスロジックを担う。
Repositoryはデータベースへのアクセスのみを担い、SQLの実行はここだけで行う。

この構造により、各層の責務が明確に分離される。

### ContextBuilder

AIに渡すコンテキストを生成する共通処理をContextBuilderとして切り出す。
全AI機能（工数見積もり・スケジューリングサポート・振り返り対話・自己分析レポート・統計コメント）が
この処理を通じて一貫したコンテキストをAIサービスに渡す。

### AIサービスへの通信

GoからPythonへのHTTPリクエストはAI Clientパッケージに集約する。
AI_SERVICE_URLを環境変数で管理することでローカル・本番環境の切り替えに対応する。

### SSEユーティリティ

振り返り対話のストリーミング返答を実現するSSE処理を共通パッケージとして切り出す。
GoはPythonから返ってくるSSEをそのままフロントエンドに流す中継役を担う。

### データベース

GORMをORMとして使用し、AutoMigrateでスキーマ管理を行う。
マイグレーションツールは使用せず、サーバー起動時にAutoMigrateを実行する。
論理削除（deleted_at）は使用せず、削除が必要なデータは物理削除する。

---

## AIサービス（Python / FastAPI）

GoからのリクエストをPydanticで検証し、Gemini APIに投げて結果を返す。
プロンプトのテンプレート管理・レスポンスのスキーマ定義・AI処理のロジックを担う。

### 構成

Router・Service・Prompts・Schemasの4層で構成する。

Routerはエンドポイントの定義とリクエストの受け付けを担う。
Serviceはコンテキストの組み立てとGemini APIの呼び出しを担う。
PromptsはGeminiへのプロンプトテンプレートを管理する。
SchemasはPydanticによるリクエスト・レスポンスの型定義を管理する。

### AI処理

全AI機能はGoのContextBuilderが生成したコンテキスト文字列を受け取り、
各機能専用のプロンプトテンプレートに埋め込んでGemini APIに投げる。

振り返り対話はGeminiのストリーミングAPIを使用し、
返答を1トークンずつSSEでGoに流す。GoはそれをそのままフロントエンドにSSEで流す。

---

## データフロー

### 通常のRESTリクエスト（例: タスク作成）

1. フロントエンドがPOST /tasksにリクエストを送る
2. ミドルウェアがトークンを検証してuser_idをセット
3. HandlerがリクエストをパースしてServiceを呼び出す
4. ServiceがRepositoryを呼び出してDBにタスクを保存する
5. タスク作成後、Service内でAI Clientを通じてPOST /estimateを呼び出す
6. PythonがGeminiに工数見積もりを依頼して結果を返す
7. Serviceがai_estimated_hoursをタスクに保存してフロントエンドに返す

### SSEリクエスト（例: 振り返りAI対話）

1. フロントエンドがGET /ai/reflection/streamにSSE接続を開く
2. ミドルウェアがトークンを検証してuser_idをセット
3. HandlerがSSEヘッダーをセットする
4. ServiceがContextBuilderを呼び出してコンテキストを生成する
5. ServiceがAI ClientでGET /reflection/streamをPythonに投げる
6. PythonがGeminiにストリーミングで返答を生成させる
7. PythonはGeminiの返答をSSEでGoに流す
8. GoはそのSSEをそのままフロントエンドに流す
9. フロントエンドはストリーミングで返答を表示する

---

## 通信方式まとめ

| 区間 | 方式 | 用途 |
| --- | --- | --- |
| フロントエンド → バックエンド | REST | タスク・振り返りなどのCRUD |
| フロントエンド → バックエンド | SSE | 振り返りAI対話のストリーミング表示 |
| バックエンド → AIサービス | REST | AI処理の依頼・結果受け取り |
| バックエンド → AIサービス | SSE（中継） | 振り返り対話のストリーミング中継 |
| AIサービス → Gemini API | REST | テキスト生成（ストリーミング含む） |
| バックエンド → PostgreSQL | GORM | データの永続化 |

---

## 環境構成

ローカル開発環境ではDockerを使用する。
PostgreSQLはDockerコンテナで起動し、バックエンドとAIサービスはairとuvicornの
ホットリロードを有効にしてDockerコンテナ上で動作させる。
フロントエンドはnext devを直接起動することを推奨する。
