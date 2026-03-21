variable "project_id" {
  description = "Google CloudのプロジェクトID"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "リージョン"
  type        = string
  default     = "asia-northeast1"
}

variable "credentials_file" {
  description = "サービスアカウントキーのパス"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Cloud SQLのパスワード"
  type        = string
  sensitive   = true
}

variable "gemini_api_key" {
  description = "Gemini APIキー"
  type        = string
  sensitive   = true
}
