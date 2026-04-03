## モックデータ（開発用）

Big Five に基づく3種類の行動パターンを持つユーザーが起動時に自動投入されます。
`backend/cmd/server/main.go` の `MockAuth` に渡すIDを変更してユーザーを切り替えます。

```go
r.Use(middleware.MockAuth(10))  // 田中 誠一（誠実性が高い・最適ゾーン）
r.Use(middleware.MockAuth(20))  // 鈴木 彩花（外向性・楽観的・過信型 → 見積もりアラート発生）
r.Use(middleware.MockAuth(30))  // 佐藤 健太（慎重すぎ・コンフォートゾーン型）
```

ファイルを保存すると air がホットリロードするため、ブラウザをリロードするだけで切り替わります。
詳細は [`docs/seed.md`](docs/seed.md) を参照してください。

---

## 開発ガイド

| ドキュメント                                                     | 内容                                  |
| ---------------------------------------------------------------- | ------------------------------------- |
| [`docs/git-development-rules.md`](docs/git-development-rules.md) | Issue ドリブン開発・ブランチ命名規則  |
| [`docs/mock-auth.md`](docs/mock-auth.md)                         | モック認証の仕組みと本番切り替え方法  |
| [`docs/ai-client.md`](docs/ai-client.md)                         | AI サービスへの HTTP クライアント設計 |
| [`docs/sse.md`](docs/sse.md)                                     | SSE ストリーミングの使い方            |
| [`docs/seed.md`](docs/seed.md)                                   | モックデータの設計と使い方            |

### 認証について

開発中はモック認証を使用しており、固定の `userID` をコンテキストにセットします。
本番への切り替えは `main.go` の1行変更で完結します（詳細は [`docs/mock-auth.md`](docs/mock-auth.md)）。
