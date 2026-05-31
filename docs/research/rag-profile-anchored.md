# Profile-Anchored RAG の実装

実装日: 2026-04-09

---

## 何を作ったか

振り返り対話（`/ai/reflection/stream`）に **Profile-Anchored RAG** を導入した。

### 変更前

```
全タスク + 全振り返り（増え続ける）
            ↓ そのままプロンプトに全部入れる
          Gemini
```

データが増えるたびにプロンプトが肥大化し、無関係な情報まで Gemini に渡り続けていた。また `user_context`（ユーザーの行動特性）が振り返り対話では使われていなかった。

### 変更後

```
全データ ──→ チャンク分割 ──→ ベクトルDB
                                ↑ 質問で検索
                          関連する上位5件だけ取得
                                +
            user_context + 最新レポート（毎回固定で入れる）
                                ↓
                            Gemini
```

プロンプトサイズをほぼ一定に保ちながら、ユーザーの個性を常に反映した応答が得られる。

---

## 設計の根拠となった論文

### プロファイルアンカーの考え方

**LaMP: When Large Language Models Meet Personalization**
ACL 2024 | [arXiv:2305.15038](https://arxiv.org/abs/2305.15038)

LLM のパーソナライズを評価するベンチマーク論文。ユーザーの過去データをプロファイルとして検索・注入することで、ゼロショット設定でも 12.2%、ファインチューニング込みで 23.5% の相対的改善を達成。「ユーザー情報を常時アンカーとして注入する」という今回の設計の直接的な根拠。

**PersonaRAG: Enhancing Retrieval-Augmented Generation Systems with User-Centric Agents**
2024 | [arXiv:2407.09394](https://arxiv.org/abs/2407.09394)

ユーザー中心のエージェントが RAG システムを強化する手法。ベースラインより 5% 以上の精度向上を達成。`user_profile` フィールドをプロンプトの先頭に固定注入するアーキテクチャの参考にした。

---

### RAG 取得戦略の考え方

**Adaptive-RAG: Learning to Adapt Retrieval-Augmented Large Language Models through Question Complexity**
NAACL 2024 | [arXiv:2403.14403](https://arxiv.org/abs/2403.14403)

クエリの複雑度に応じて「検索なし・1ステップ・マルチステップ」を自動選択するフレームワーク。今回はここから「全クエリに同一パイプラインを通す必要はない」という示唆を受け、プロファイル（常時）と検索結果（クエリ依存）を分離する設計を採用した。

**EMG-RAG: Editable Memory Graph for Personalized RAG**
EMNLP 2024 | [arXiv:2409.19401](https://arxiv.org/abs/2409.19401)

スマートフォンのパーソナルデータを Editable Memory Graph（EMG）として構造化し RAG に活用する手法。既存手法比で約 10% の改善。短期記憶（直近データ）・長期記憶（全履歴）・プロファイル（自己像）という3レイヤー構造が今回の設計の参考になっている。

---

## アーキテクチャ

```
[Go バックエンド]
  StreamChat()
    │
    ├─ BuildFullContext()    ── 全タスク・振り返り・カテゴリをテキスト化
    └─ BuildProfileContext() ── user_context + 最新 Report をテキスト化
                                     │
                             [Python AI サービス]
                               ReflectionRequest
                                 .context      ← 全データ（RAG 用）
                                 .user_id      ← インデックスキー
                                 .user_profile ← プロファイルアンカー
                                 .user_message ← ユーザーの質問
                                     │
                              rag_retriever.py
                                 ① context をチャンク分割
                                    RecursiveCharacterTextSplitter
                                    chunk_size=400, overlap=100
                                    separators=["\n## ", "\n### ", ...]
                                 ② Chroma インメモリに格納
                                    MD5 ハッシュキャッシュで再インデックスをスキップ
                                 ③ user_message でベクトル検索
                                    Embedding: text-embedding-004
                                    top-k=5 チャンクを返す
                                     │
                              REFLECTION_PROMPT
                                 ## ユーザープロファイル    ← user_profile（常時）
                                 ## 関連データ             ← 検索結果（可変）
                                 ## 会話履歴
                                 ## ユーザーの発言
                                     │
                                  Gemini 2.0 Flash
```

---

## 変更したファイル

| ファイル | 変更内容 |
|---|---|
| `ai/requirements.txt` | `langchain`, `langchain-community`, `langchain-google-genai`, `chromadb` を追加 |
| `ai/app/schemas/reflection.py` | `user_id`, `user_profile` フィールドを追加（デフォルト値付き・後方互換） |
| `ai/app/services/rag_retriever.py` | **新規**。チャンク分割・Chroma インデックス・ハッシュキャッシュ・検索 |
| `ai/app/prompts/reflection.py` | `{context}` 単体 → `{user_profile}` + `{retrieved_context}` の2セクション構成に変更 |
| `ai/app/services/reflection_service.py` | RAG 経由でプロンプトを構築するよう変更 |
| `backend/internal/service/context_builder.go` | `userRepo`, `reportRepo` を追加。`BuildProfileContext()` を新規実装 |
| `backend/internal/service/reflection.go` | `chatRequest` に `UserID`, `UserProfile` を追加。`StreamChat` でプロファイルを取得して送信 |
| `backend/cmd/server/main.go` | `NewContextBuilder()` の引数に `userRepo`, `reportRepo` を追加 |

---

## ハッシュキャッシュについて

`rag_retriever.py` のキャッシュ設計を補足する。

毎リクエストごとに全データをベクトル化すると、チャンク数×Embedding API コールが発生する（タスク50件+振り返り30日 ≈ 100コール/リクエスト）。これはレート制限に即座に引っかかる。

```python
_cache: dict[int, tuple[str, Chroma]] = {}
# key: user_id
# value: (context の MD5 ハッシュ, Chroma インスタンス)
```

同じ `user_id` かつ同じ `context` ハッシュであれば再インデックスをスキップする。データの追加・変更があった場合のみ再構築が走る。

---

## 今後の拡張（Phase 2 以降）

今回のスコープは **振り返り対話のみ**。以下は将来の検討事項。

### Adaptive Query Router
クエリを種別分類し、Type A（事実・時間軸）は DB 直接参照、Type B/C のみ RAG を適用する。
参考: [Adaptive-RAG (NAACL'24)](https://arxiv.org/abs/2403.14403)

### Layered Memory（案2への発展）
- L1（短期）: 直近7日の構造化データ
- L2（長期）: 全履歴のベクトル検索
- L3（プロファイル）: user_context + Report

参考: [EMG-RAG (EMNLP'24)](https://arxiv.org/abs/2409.19401)

### report・schedule への展開
今回は reflection のみ変更した。同パターンで他エンドポイントにも適用できる。

### ChromaDB の永続化
現在はインメモリ（サービス再起動でキャッシュが消える）。Docker Compose に ChromaDB サービスを追加することで再起動後もインデックスを保持できる。
