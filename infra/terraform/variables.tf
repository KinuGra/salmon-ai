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
