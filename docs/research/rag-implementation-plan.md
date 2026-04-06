# RAG 実装計画：Profile-Anchored RAG（振り返り対話）

調査日: 2026-04-06

## スコープ

**対象: 振り返り対話（`/reflection/stream`）のみ（Phase 1）**

report・schedule・stats の各エンドポイントは今回の変更対象外。
それらも同じ「全データ直接注入」パターンを使っているが、Phase 2 以降で個別に検討する。

---

## 背景と課題

### 現状のデータフロー

```
Go: ContextBuilder.BuildFullContext()
  → 全タスク + 全振り返り を1つのテキスト文字列に変換
  → Python reflection_service.py の {context} プレースホルダーに直接埋め込み
  → Gemini へ送信（トークン数はデータ件数に比例して増加）
```

### 課題

- データが増えるにつれてプロンプトが肥大化（トークンコスト増加）
- 「今の質問と無関係なタスク・振り返り」も全件注入される
- `user_context`（ユーザーの特性テキスト）が振り返りプロンプトに含まれない

---

## 採用アプローチ：新・案1 Profile-Anchored RAG

### 設計思想（LaMP, ACL 2024 準拠）

- **プロファイルアンカー**（常時注入）: `user_context` + 最新 `Report` を全クエリに固定注入
- **セマンティック検索**（クエリ依存）: `user_message` に関連する上位 k チャンクのみ取得

### 変更後のデータフロー

```
Go:
  BuildFullContext()    → 全データテキスト（変わらず）
  BuildProfileContext() → user_context + 最新 Report（小さい・固定）
  → Python へ両方送る（chatRequest に user_profile フィールド追加）

Python:
  ① 全データテキストをチャンク分割 → インメモリ ベクトルインデックス
  ② user_message でベクトル検索 → top-5 チャンクのみ取得
  ③ プロンプト = プロファイルアンカー + top-5 チャンク + 会話履歴 + user_message
  → Gemini
```

### 期待効果

- プロンプトサイズをほぼ一定に（5チャンク × 400文字 ≈ 2000文字 + プロファイル固定）
- ユーザー特性が常にコンテキストに含まれるようになる
- 将来的に Adaptive-RAG / Agentic RAG への移行パスが開ける

---

## 変更・追加ファイル一覧

```
salmon-ai/
├── backend/
│   ├── internal/
│   │   ├── repository/
│   │   │   └── report_repository.go   [確認] FindLatestByUserID() の有無
│   │   └── service/
│   │       ├── context_builder.go     [変更] BuildProfileContext() 追加
│   │       └── reflection.go          [変更] chatRequest に user_id + user_profile 追加
│
└── ai/
    ├── requirements.txt               [変更] langchain 系ライブラリ追加
    ├── app/
    │   ├── schemas/
    │   │   └── reflection.py          [変更] user_id・user_profile フィールド追加
    │   ├── services/
    │   │   ├── rag_retriever.py       [新規] チャンク・インデックス・検索
    │   │   └── reflection_service.py  [変更] RAG 経由の検索に切り替え
    │   └── prompts/
    │       └── reflection.py          [変更] プロファイルアンカー用セクション追加
```

---

## 詳細設計

### Go 側変更

#### `context_builder.go` — `BuildProfileContext()` 追加

`ContextBuilder` に `userRepo` と `reportRepo` の依存を追加し、以下のメソッドを実装する。

```go
// BuildProfileContext はユーザーの固定プロファイル情報を返します。
// user_context（行動特性）+ 最新 Report（自己分析）を組み合わせます。
func (cb *ContextBuilder) BuildProfileContext(userID uint) (string, error)
```

**事前確認が必要**: `reportRepository.FindLatestByUserID()` が存在するか確認してから着手。

#### `reflection.go` — `chatRequest` にフィールド追加

```go
type chatRequest struct {
    Context     string        `json:"context"`
    UserProfile string        `json:"user_profile"` // 追加
    UserID      uint          `json:"user_id"`       // 追加（RAG インデックスキー用）
    Messages    []chatMessage `json:"messages"`
    UserMessage string        `json:"user_message"`
}
```

### Python 側変更

#### `schemas/reflection.py`

```python
class ReflectionRequest(BaseModel):
    context: str
    user_profile: str = ""   # 追加（後方互換のためデフォルト値あり）
    user_id: int = 0         # 追加（後方互換のためデフォルト値あり）
    messages: List[Message]
    user_message: str
```

#### `services/rag_retriever.py`（新規）

- `RecursiveCharacterTextSplitter` でチャンク分割（日本語対応）
  - `chunk_size=400`, `chunk_overlap=100`
  - `separators=["\n## ", "\n### ", "\n\n", "\n", "。", ""]`
- `InMemoryVectorStore`（`langchain-core` 付属、faiss 不要）または `chromadb` インメモリ
- ハッシュキャッシュで同一 context の再インデックスをスキップ（**必須最適化**）
- Embedding: `langchain-google-genai` の `GoogleGenerativeAIEmbeddings`（`text-embedding-004`）

```python
_index_cache: dict[str, VectorStore] = {}  # key: md5(context)

def index_context(context: str) -> VectorStore: ...
def retrieve(context: str, query: str, k: int = 5) -> list[str]: ...
```

#### `prompts/reflection.py`

```
## ユーザープロファイル（固定）
{user_profile}

---

## 関連するタスク・振り返りデータ（今の質問に関係するものを抽出）
{retrieved_context}

---

## 会話履歴
{history}
...
```

#### `requirements.txt` に追加

```
langchain
langchain-community
langchain-google-genai
chromadb
```

> `faiss-cpu` は Apple Silicon + Python 3.11+ で動作不安定なため採用しない。

---

## 実装順序

依存関係順に実施する。Python 側は `user_profile=""` のデフォルト値があるため、Go 変更前から単体で動作確認できる。

```
Step 0: backend/internal/repository で reportRepository の有無を確認
Step 1: requirements.txt 更新（chromadb, langchain 系追加）
Step 2: ai/app/schemas/reflection.py に user_id + user_profile 追加
Step 3: ai/app/services/rag_retriever.py 新規作成・動作確認
Step 4: ai/app/prompts/reflection.py 更新
Step 5: ai/app/services/reflection_service.py を RAG 経由に変更
Step 6: Go — context_builder.go に BuildProfileContext() 追加
Step 7: Go — reflection.go の chatRequest に user_id + user_profile 追加
```

---

## レビューで指摘された注意点

| # | 指摘 | 対処 |
|---|------|------|
| P1 | `user_id` が未解決のままだとインデックスが混在するリスク | `chatRequest` と `ReflectionRequest` に `user_id` を追加することで解決 |
| P2 | 毎リクエスト再インデックスで Embedding API が大量コール | ハッシュキャッシュを初期実装から組み込む |
| P3 | `BuildProfileContext()` の DI 変更が `main.go` に連鎖 | `reportRepository` の存在確認を Step 0 に配置 |
| P4 | report・schedule への影響範囲が未明示 | このドキュメントの「スコープ」セクションで reflection 限定を明示 |
| P5 | `chunk_overlap=50` では見出しが次チャンクに引き継がれない | `chunk_overlap=100` に変更 |
| P6 | `faiss-cpu` が M1/M2/M3 + Python 3.11+ で動作不安定 | `chromadb` インメモリに変更 |

---

## 将来の拡張パス（Phase 2 以降）

- **Adaptive Query Router**: クエリを Type A（事実）/ Type B（パターン）/ Type C（計画）に分類し、Type A は DB 直接参照・Type B/C のみ RAG を適用（Adaptive-RAG, NAACL'24）
- **report・schedule への RAG 適用**: 同パターンで他エンドポイントにも展開
- **ChromaDB の永続化**: Docker Compose に ChromaDB サービスを追加し、再起動後もインデックスを保持
- **Layered Memory（案2）への移行**: L1（直近7日）/ L2（全履歴）/ L3（プロファイル）の3レイヤー構造に発展
