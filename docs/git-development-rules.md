# Git Development Rules

本プロジェクトでは **Issueドリブン開発 + シンプルなGit Flow** を採用する。

---

# 1. Development Flow（Issueドリブン開発）

すべての作業は **Issue を起点に開始する。**

## フロー

1. Issue を作成
2. 必要に応じて Sub Issue を作成
3. 自分を Assignee に設定
4. 作業開始時に `In Progress` に変更
5. Issue から **main ブランチをベースにブランチ作成**
6. ローカルで checkout して作業
7. main に対して Pull Request を作成
8. レビュー後に main に merge

```
Issue作成
↓
Assignee設定
↓
In Progress
↓
main からブランチ作成
↓
ローカルで作業
↓
mainへPR
↓
merge
```

---

# 2. Git Flow

本プロジェクトでは **シンプルな Git Flow** を採用する。

## 基本ブランチ

```
main : 本番 / 最新安定コード
```

### ルール

* **すべての作業ブランチは main から作成**
* 作業完了後 **main に Pull Request を作成**
* レビュー後 main に merge

---

# 3. Branch Naming Rules（ブランチ命名規則）

```
<prefix>/<issue-number>-<description>
```

例

```
feat/18-add-login-api
fix/28-auth-error
refactor/35-clean-user-service
docs/40-update-readme
```

---

# 4. Commit Message Rules

フォーマット

```
<prefix>: <message>
```

例

```
feat: add login api
fix: auth middleware bug
refactor: clean user service
feat: タスク登録APIの作成
```

---

## 作業途中コミット

作業途中の場合は `wip` を使用

```
feat: (wip) implement login api
```

---

## Issue番号を含める場合

```
fix: (#28) auth middleware bug
feat: (#18) add login api
```

Issue番号の記載は任意。

---

# 5. Pull Request

PRの基本ルール

* **main に対して作成**
* Issue を紐付ける
* レビュー後に merge

---

# 6. Summary

開発ルールまとめ

* Issueドリブン開発
* main ベースのブランチ運用
* Issue番号付きブランチ
* prefix付きコミットメッセージ
* PRでレビューしてからmainへmerge