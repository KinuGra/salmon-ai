package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/salmon-ai/salmon-ai/internal/service"
	"gorm.io/gorm"
)

type ReportHandler struct {
	svc *service.ReportService
}

func NewReportHandler(svc *service.ReportService) *ReportHandler {
	return &ReportHandler{svc: svc}
}

// GetLatestReport GET /reports/latest
// 指定ユーザーの最新の自己分析レポートを返します。
// レポートが未生成の場合は 404 を返します。
func (h *ReportHandler) GetLatestReport(c *gin.Context) {
	userID := getUserID()

	report, err := h.svc.GetLatestReport(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "no report found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, report)
}

// GenerateReport POST /ai/report/generate
// ContextBuilderで全データを収集し、AIサービスに新しいレポートを生成させ、DBに保存します。
func (h *ReportHandler) GenerateReport(c *gin.Context) {
	userID := getUserID()

	report, err := h.svc.GenerateReport(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, report)
}
