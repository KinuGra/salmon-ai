# メモリシステム設計

## 概要

振り返り会話から「記憶すべき事実」を自動抽出し、レポート生成時にパーソナライズドコンテキストとして注入するシステム。

---

## アーキテクチャ

```
[振り返り対話]
      ↓ （ストリーミング完了後バックグラウンドで）
[extractor.py]  ← Gemini 2.0 Flash Lite で事実抽出
      ↓
  ┌───┴────────────┐
[Redis]           [ChromaDB]
short-term        long-term
今日の状態推定    行動パターン蓄積
（TTL 48h）       （永続）
      ↓                 ↓
          [retriever.py]  ← Hybrid Retrieval
                ↓
          [injector.py]   ← System Prompt 合成
                ↓
          [report_service.py] ← パーソナライズ済みコンテキストでレポート生成
```

---

## ファイル構成

```
ai/app/memory/
├── extractor.py   # 会話 → 事実抽出
├── storage.py     # Redis / ChromaDB の読み書き
├── retriever.py   # Hybrid Retrieval（意味 + Recency）
├── injector.py    # コンテキスト文字列への記憶注入
└── manager.py     # 矛盾解決・古い記憶の削除
```

---

## Short-term vs Long-term

| 項目 | Short-term | Long-term |
|------|-----------|-----------|
| ストレージ | Redis | ChromaDB |
| 粒度 | 1日1エントリ（ユーザー別） | 事実単位で蓄積 |
| TTL | 48時間 | なし（定期クリーンアップ） |
| 例 | 「今日は頭が痛い」「最近睡眠不足」 | 「21時〜23時が集中ピーク」 |
| Redis キー形式 | `short:{user_id}:{YYYY-MM-DD}` | — |

---

## 抽出フロー（extractor.py）

- モデル: `gemini-2.0-flash-lite`（安価・高速）
- 抽出単位: 1ターンの会話（messages + user_message）
- confidence ≥ 0.7 のみ保存
- 各事実に `term: "short" | "long"` を付与

### term の判定基準

| term | 基準 | 例 |
|------|------|----|
| short | 今日の状態にのみ有効 | 「今日は頭が痛い」 |
| long | 長期的なパターン・傾向 | 「21時〜23時が集中ピーク」 |

---

## Hybrid Retrieval（retriever.py）

```
最終スコア = コサイン類似度 × 0.7 + Recency スコア × 0.3
```

Recency は指数減衰で計算（`exp(-経過日数 / decay_days)`）。
`decay_days` はカテゴリごとに設定:

| category | decay_days | 理由 |
|----------|-----------|------|
| behavior | 30 | 習慣は比較的短期間で変化する |
| strategy | 60 | 有効な戦略はやや長く残す |
| goal | 180 | 目標は半年スパン |
| emotion | 7 | 感情は直近のものが重要 |

---

## 矛盾解決（manager.py）

1. 新しい事実を保存する前に ChromaDB で類似検索
2. コサイン類似度 ≥ 0.85 の既存記憶がある場合のみ LLM（Gemini Flash Lite）で矛盾チェック
3. `action == "delete"` → 既存削除してから新規保存
4. `action == "keep"` → スキップ（既存で十分）
5. それ以外 → 通常保存

> コスト抑制のため 0.85 未満の場合は矛盾チェックをスキップ。

---

## レポートへの注入（injector.py / report_service.py）

1. `report_service.py` が `enrich_context(user_id, context)` を呼ぶ
2. `injector.py` が long-term（行動パターン・有効戦略）+ short-term（今日の状態）を取得
3. 記憶セクションを既存コンテキスト文字列の先頭に追加
4. 既存の `REPORT_PROMPT` / `COLD_START_PROMPT` はそのまま利用

注入フォーマット例:

```
## 【記憶情報】パーソナライズドコンテキスト

### 今日の状態
- 最近睡眠不足気味

### 行動パターン（過去の記憶から）
- 21時〜23時が最も集中できる時間帯
- 朝はぼーっとしてしまい集中困難

### 過去に有効だった戦略
- 重要タスクを夜にまとめると達成率が上がる

記憶情報は参考として使い、現在の会話・データを優先してください。
...

---

（以降: GoのContextBuilderが生成した既存コンテキスト）
```

---

## インフラ

### 追加サービス（docker-compose.yml）

| サービス | 用途 |
|---------|------|
| Redis 7 | Short-term 記憶（TTL 48h） |
| chroma_data（volume）| ChromaDB 長期記憶の永続化 |

### 環境変数（ai/.env）

| 変数 | デフォルト | 説明 |
|------|---------|------|
| `REDIS_URL` | `redis://redis:6379` | Redis 接続 URL |
| `CHROMA_PERSIST_DIR` | `/chroma_data` | ChromaDB 永続化ディレクトリ |

---

## クリーンアップ（manager.py）

- 長期記憶が 200 件を超えた場合に自動削除
- スコア = `access_count × 0.5 + recency × 0.5` の低い順に削除
- `cleanup_old_memories(user_id)` を任意のタイミングで呼び出す

---

## データフロー（全体）

```
1. ユーザーが振り返りチャットに発言
2. Go → Python POST /reflection/stream
3. Python がストリーミングで返答を生成（既存動作）
4. ストリーミング完了後、BackgroundTask で extractor を実行
5. 抽出された事実を short / long に保存
6. ユーザーがレポート生成をリクエスト
7. Go → Python POST /report/generate（user_id 付き）
8. Python が Redis + ChromaDB から記憶を取得
9. 記憶セクションをコンテキスト先頭に追加
10. Gemini にパーソナライズされたコンテキストでレポート生成を依頼
```
