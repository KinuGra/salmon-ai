package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/salmon-ai/salmon-ai/internal/service"
)

type ScheduleHandler struct {
	scheduleSvc *service.ScheduleService
}

func NewScheduleHandler(scheduleSvc *service.ScheduleService) *ScheduleHandler {
	return &ScheduleHandler{scheduleSvc: scheduleSvc}
}

type scheduleSupportRequest struct {
	Date string `json:"date" binding:"required"` // 例： "2026-03-20"
}

func (h *ScheduleHandler) ScheduleSupport(c *gin.Context) {
	userID, exists := getUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req scheduleSupportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	res, err := h.scheduleSvc.Support(userID, req.Date)
	if err != nil {
		if strings.Contains(err.Error(), "failed to parse date") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. It must be in 'YYYY-MM-DD' format."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
		return
	}

	c.JSON(http.StatusOK, res)
}
