# タイムゾーン処理の調査

調査日: 2026-03-30

## このプロジェクトの構成

**結論: UTC で保存・転送し、表示時にブラウザ/アプリ側で JST 変換するパターン**

### DB: UTC で保存（`TIMESTAMPTZ` 型）

```sql
-- seed.sql の例
'2026-03-18 09:00:00+00'  -- +00 = UTC
```

- PostgreSQL の `timestamp with time zone`（`TIMESTAMPTZ`）型を使用
- 入力値に関わらず内部は常に UTC で正規化される
- Go の `time.Time` 型が GORM 経由でこの型にマッピングされる

関連ファイル:
- `backend/internal/model/base.go` — `CreatedAt`, `UpdatedAt`
- `backend/internal/model/task.go` — `StartTime`, `EndTime`, `DueDate`

### バックエンド: UTC のまま扱い、統計計算時のみ JST に変換

```go
// backend/internal/service/stats.go
jst, _ := time.LoadLocation("Asia/Tokyo")
now := time.Now().In(s.jst)  // 統計の週・日計算時のみ JST 使用
```

```sql
-- backend/internal/repository/stats.go
SELECT TO_CHAR(DATE(start_time AT TIME ZONE 'Asia/Tokyo'), 'YYYY-MM-DD') as date,
       COUNT(*) as count
FROM tasks
WHERE user_id = ? AND is_completed = true
GROUP BY DATE(start_time AT TIME ZONE 'Asia/Tokyo')
```

- タスクの CRUD は UTC のまま
- 草グラフ・週次統計など「日付でグループ化」する処理だけ JST に変換
- GORM の接続設定にはタイムゾーン指定なし（PostgreSQL デフォルト = UTC）

### フロントエンド: ブラウザのシステムタイムゾーンで自動変換

```typescript
// frontend/src/components/time-blocking/utils.ts

// UTC の ISO 文字列 → ブラウザが自動で JST に変換
const d = new Date(iso);
d.getHours() * 60 + d.getMinutes();

// ローカル時刻で操作 → toISOString() で UTC に戻してバックエンドへ送信
return d.toISOString().slice(0, 19) + "Z";
```

```typescript
// frontend/src/components/reflection/HistoryView.tsx
parseDate(dateStr).toLocaleDateString("ja-JP", {
  month: "long",
  day: "numeric",
  weekday: "short",
});
// → ブラウザのロケール・タイムゾーン設定を使って表示
```

---

## 日本企業での一般性

**UTC 保存 + フロント/アプリ側で JST 変換はデファクトスタンダード。**

| 方式 | 理由 |
|------|------|
| DB は UTC | グローバル展開・夏時間・サーバー移設への耐性。DB 自体はタイムゾーンを意識しない |
| 表示は JST | UX の責務をフロントに集約。変換漏れが起きにくい |

「国内向けサービスだから JST のまま保存」という設計は、将来の海外展開やサーバー移設時にバグの温床になりやすいため避けるのが一般的。

---

## PostgreSQL のタイムゾーンサポート

### 型の違い

| 型 | 内容 |
|----|------|
| `TIMESTAMP` / `TIMESTAMP WITHOUT TIME ZONE` | タイムゾーン情報なし。入力値をそのまま保存 |
| `TIMESTAMPTZ` / `TIMESTAMP WITH TIME ZONE` | 内部は UTC で保存。入出力時にセッションの TZ に変換 |

### 主な操作

```sql
-- UTC → JST に変換して取得
SELECT start_time AT TIME ZONE 'Asia/Tokyo' FROM tasks;

-- セッション単位で変換（接続時に設定）
SET TIME ZONE 'Asia/Tokyo';
SELECT NOW();  -- JST で表示される

-- タイムゾーン付きで日付グループ化（このプロジェクトでも使用）
SELECT DATE(start_time AT TIME ZONE 'Asia/Tokyo') as day, COUNT(*)
FROM tasks
GROUP BY day;
```

### GORM での接続時 TZ 設定（参考）

明示的にセッション TZ を設定したい場合は DSN に追加できる:

```go
dsn := "postgres://user:pass@host/db?TimeZone=Asia/Tokyo"
```

ただし DB 側の保存は引き続き UTC になるため、このプロジェクトのように SQL 内で `AT TIME ZONE` を使う方が明示的で安全。
