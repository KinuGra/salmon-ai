## モック認証ミドルウェアの追加

#### 概要

認証機能の実装を後回しにするため、開発中はモックユーザーのIDを固定でコンテキストにセットするミドルウェアを追加しました。本番の認証ミドルウェアへの差し替えは `main.go` の1行変更で対応できます。

---

#### 背景・目的

本来はFirebase AuthのIDトークンを検証してユーザーを特定しますが、認証機能は後から追加する方針のため、開発中は固定のユーザーIDを使います。

全ハンドラーは `c.Get("userID")` でユーザーIDを取得する統一したインターフェースを持つため、MockAuth → 本番Authへの差し替えはmain.goの1行変更で完結します。

---

#### 変更内容

- `internal/middleware/mock_auth.go`: モック認証ミドルウェアを作成
- `cmd/server/main.go`: MockAuthミドルウェアを登録

---

#### 使い方

**ハンドラーでのユーザーID取得**

全てのハンドラーで以下の方法でユーザーIDを取得します。

```go
func (h *TaskHandler) GetTasks(c *gin.Context) {
    // ミドルウェアがセットしたuserIDを取得
    userID, exists := c.Get("userID")
    if !exists {
        c.JSON(401, gin.H{"error": "unauthorized"})
        return
    }
    // userIDを使ってDBを操作する
}
```

**本番認証への差し替え方法**

認証機能を実装する際は `main.go` の1行を変えるだけです。

```go
// 開発中（現在）
r.Use(middleware.MockAuth(mockUser.ID))

// 本番（Firebase Auth実装後）
r.Use(middleware.Auth(firebaseApp))
```

---

#### 動作確認

```bash
cd infra && docker compose up --build
```

```bash
curl http://localhost:8080/health
# {"status":"ok","userID":1}
```

`userID` が `1` で返ってくることを確認する。
