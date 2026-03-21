# Backend
resource "google_cloud_run_v2_service" "backend" {
  name     = "salmon-ai-backend"
  location = var.region

  template {
    containers {
      image = "asia-northeast1-docker.pkg.dev/${var.project_id}/salmon-ai/backend:latest"

      env {
        name  = "DATABASE_URL"
        value = "postgres://salmon:${var.db_password}@${google_sql_database_instance.salmon_ai.public_ip_address}/appdb"
      }

      env {
        name  = "AI_SERVICE_URL"
        value = "https://${google_cloud_run_v2_service.ai.uri}"
      }

      ports {
        container_port = 8080
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }
  }
}

# AIサービス
resource "google_cloud_run_v2_service" "ai" {
  name     = "salmon-ai-ai"
  location = var.region

  template {
    containers {
      image = "asia-northeast1-docker.pkg.dev/${var.project_id}/salmon-ai/ai:latest"

      env {
        name  = "GEMINI_API_KEY"
        value = var.gemini_api_key
      }

      ports {
        container_port = 8000
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }
  }
}

# BackendからのアクセスをCloud Runに許可
resource "google_cloud_run_v2_service_iam_member" "backend_public" {
  name     = google_cloud_run_v2_service.backend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "ai_public" {
  name     = google_cloud_run_v2_service.ai.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}
