package service

import (
	"fmt"

	aiclient "github.com/salmon-ai/salmon-ai/pkg/ai_client"

	"github.com/salmon-ai/salmon-ai/internal/model"
	"github.com/salmon-ai/salmon-ai/internal/repository"
)

type ReportService struct {
	repo           *repository.ReportRepository
	contextBuilder *ContextBuilder
	aiClient       *aiclient.Client
}

func NewReportService(
	repo *repository.ReportRepository,
	contextBuilder *ContextBuilder,
	aiClient *aiclient.Client,
) *ReportService {
	return &ReportService{
		repo:           repo,
		contextBuilder: contextBuilder,
		aiClient:       aiClient,
	}
}

// GetLatestReport は指定ユーザーの最新レポートを返します。
// レポートが存在しない場合は gorm.ErrRecordNotFound が伝搬します。
func (s *ReportService) GetLatestReport(userID uint) (*model.Report, error) {
	return s.repo.FindLatestByUserID(userID)
}

// ── AI通信用の内部DTOです ──────────────────────────────────────

type generateReportRequest struct {
	Context string `json:"context"`
}

type generateReportResponse struct {
	Content string `json:"content"`
}

// GenerateReport はContextBuilderでコンテキストを構築し、Pythonの /report/generate へ
// POSTしてMarkdown形式のレポートを取得します。返ってきた内容をDBに新規保存して返します。
func (s *ReportService) GenerateReport(userID uint) (*model.Report, error) {
	// 1. ユーザーの全データからコンテキストを生成
	ctx, err := s.contextBuilder.BuildFullContext(userID)
	if err != nil {
		return nil, fmt.Errorf("report_service: failed to build context: %w", err)
	}

	// 2. AIサービスへリクエスト
	var aiResp generateReportResponse
	if err := s.aiClient.Post("/report/generate", generateReportRequest{Context: ctx}, &aiResp); err != nil {
		return nil, fmt.Errorf("report_service: AI request failed: %w", err)
	}

	// 3. 返ってきたMarkdownをDBに新規保存（上書きしない）
	report := &model.Report{
		UserID:  userID,
		Content: aiResp.Content,
	}
	if err := s.repo.Create(report); err != nil {
		return nil, fmt.Errorf("report_service: failed to save report: %w", err)
	}

	return report, nil
}
