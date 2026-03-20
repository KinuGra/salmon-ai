resource "google_artifact_registry_repository" "salmon_ai" {
  location = var.region
  repository_id = "salmon-ai"
  format = "DOCKER"
  description = "salmon-ai Dockerイメージリポジトリ"
}
