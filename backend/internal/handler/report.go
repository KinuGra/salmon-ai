package handler

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/salmon-ai/salmon-ai/internal/service"
	"github.com/salmon-ai/salmon-ai/pkg/ratelimit"
	"gorm.io/gorm"
)

// reportLimiter は /ai/report/generate のユーザーごとのレートリミッターです。
// レポート生成はトークン消費が多いため、60秒に1回に制限します。
var reportLimiter = ratelimit.New(60 * time.Second)

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
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID, ok := userIDVal.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "user ID in context is of invalid type"})
		return
	}

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
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID, ok := userIDVal.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "user ID in context is of invalid type"})
		return
	}

	if ok, wait := reportLimiter.Allow(userID); !ok {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error": fmt.Sprintf("%d秒後に再試行してください", int(wait.Seconds())+1),
		})
		return
	}

	report, err := h.svc.GenerateReport(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, report)
}
