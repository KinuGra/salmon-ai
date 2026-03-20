package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/salmon-ai/salmon-ai/internal/repository"
	"github.com/salmon-ai/salmon-ai/internal/service"
	"github.com/salmon-ai/salmon-ai/pkg/aiclient"
)

type StatsHandler struct {
	svc      *service.StatsService
	aiClient *aiclient.Client
}

func NewStatsHandler(svc *service.StatsService, aiClient *aiclient.Client) *StatsHandler {
	return &StatsHandler{svc: svc, aiClient: aiClient}
}

func (h *StatsHandler) GetWeeklyStats(c *gin.Context) {
	userID, exists := getUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	stats, err := h.svc.GetWeeklyStats(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *StatsHandler) GetMonthlyStats(c *gin.Context) {
	userID, exists := getUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	stats, err := h.svc.GetMonthlyStats(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *StatsHandler) GetGrass(c *gin.Context) {
	userID, exists := getUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	weeks := 16
	if w := c.Query("weeks"); w != "" {
		if parsed, err := strconv.Atoi(w); err == nil && parsed > 0 {
			weeks = parsed
		}
	}

	data, err := h.svc.GetGrass(userID, weeks)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": data})
}

type StatsCommentRequest struct {
	Current  repository.StatsData `json:"current"`
	Previous repository.StatsData `json:"previous"`
}

func (h *StatsHandler) PostStatsComment(c *gin.Context) {
	userID, exists := getUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	_ = userID

	var req StatsCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	respBytes, err := h.aiClient.Post("/stats/comment", req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var result struct {
		Comment       string `json:"comment"`
		FollowMessage string `json:"follow_message"`
	}
	if err := json.Unmarshal(respBytes, &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse AI response"})
		return
	}
	c.JSON(http.StatusOK, result)
}
