resource "google_sql_database_instance" "salmon_ai" {
  name             = "salmon-ai-db"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = "db-f1-micro"  # 最小スペック

    backup_configuration {
      enabled = false  # バックアップ不要
    }
  }

  deletion_protection = false  # terraform destroyで削除できるようにする
}

resource "google_sql_database" "salmon_ai" {
  name     = "appdb"
  instance = google_sql_database_instance.salmon_ai.name
}

resource "google_sql_user" "salmon_ai" {
  name     = "salmon"
  instance = google_sql_database_instance.salmon_ai.name
  password = var.db_password
}
