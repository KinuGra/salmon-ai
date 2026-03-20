variable "project_id" {
  description = "Google CloudのプロジェクトID"
  type = string 
}

variable "region" {
  description = "リージョン"
  type = string
  default = "asia-northeast1" # 東京
}

variable "credentials_file" {
  description = "サービスアカウントキーのパス"
  type = string
}

variable "db_password" {
  description = "Cloud SQLのパスワード"
  type        = string
  sensitive   = true  # ログに表示されないようにする
}
