package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/salmon-ai/salmon-ai/internal/model"
	"github.com/salmon-ai/salmon-ai/internal/service"
	"gorm.io/gorm/clause"
)

type TaskHandler struct {
	svc *service.TaskService
}

func NewTaskHandler(svc *service.TaskService) *TaskHandler {
	return &TaskHandler{svc: svc}
}

type CreateTaskRequest struct {
	Title          string   `json:"title" binding:"required"`
	Description    *string  `json:"description"`
	Priority       *int     `json:"priority"`
	CategoryID     *uint    `json:"category_id"`
	DueDate        *string  `json:"due_date"`
	EstimatedHours *float64 `json:"estimated_hours"`
}

type UpdateTaskRequest struct {
	Title           *string  `json:"title"`
	Description     *string  `json:"description"`
	Priority        *int     `json:"priority"`
	ClearPriority   *bool    `json:"clear_priority"`
	CategoryID      *uint    `json:"category_id"`
	DueDate         *string  `json:"due_date"`
	StartTime       *string  `json:"start_time"`
	EndTime         *string  `json:"end_time"`
	ClearStartTime  *bool    `json:"clear_start_time"`
	ClearEndTime    *bool    `json:"clear_end_time"`
	EstimatedHours  *float64 `json:"estimated_hours"`
	IsCompleted     *bool    `json:"is_completed"`
	AchievementRate *int     `json:"achievement_rate"`
}

func getUserID(c *gin.Context) (uint, bool) {
	userID, exists := c.Get("userID")
	if !exists {
		return 0, false
	}
	uid, ok := userID.(uint)
	if !ok {
		return 0, false
	}
	return uid, true
}


func parseTime(s string) (time.Time, error) {
	t, err := time.Parse(time.RFC3339, s)
	if err == nil {
		return t, nil
	}
	// ミリ秒付きの ISO 文字列にも対応
	return time.Parse("2006-01-02T15:04:05.999Z07:00", s)
}

func (h *TaskHandler) GetTasks(c *gin.Context) {
	userID, exists := getUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	dateStr := c.Query("date")
	if dateStr != "" {
		date, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date format"})
			return
		}
		tasks, err := h.svc.GetTasksByDate(userID, date)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, tasks)
		return
	}

	tasks, err := h.svc.GetTasks(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func (h *TaskHandler) GetUnscheduledTasks(c *gin.Context) {
	userID, exists := getUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	tasks, err := h.svc.GetUnscheduledTasks(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func (h *TaskHandler) CreateTask(c *gin.Context) {
	userID, exists := getUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	task := &model.Task{
		UserID:         userID,
		Title:          req.Title,
		Description:    req.Description,
		Priority:       req.Priority,
		CategoryID:     req.CategoryID,
		EstimatedHours: req.EstimatedHours,
	}

	if req.DueDate != nil {
		t, err := time.Parse("2006-01-02", *req.DueDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid due_date format"})
			return
		}
		task.DueDate = &t
	}

	if err := h.svc.CreateTask(task); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, task)
}

func (h *TaskHandler) UpdateTask(c *gin.Context) {
	userID, exists := getUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req UpdateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fields := map[string]any{}

	if req.Title != nil {
		fields["title"] = *req.Title
	}
	if req.Description != nil {
		fields["description"] = *req.Description
	}
	if req.ClearPriority != nil && *req.ClearPriority {
		fields["priority"] = clause.Expr{SQL: "NULL"}
	} else if req.Priority != nil {
		fields["priority"] = *req.Priority
	}
	if req.CategoryID != nil {
		fields["category_id"] = *req.CategoryID
	}
	if req.EstimatedHours != nil {
		fields["estimated_hours"] = *req.EstimatedHours
	}
	if req.AchievementRate != nil {
		fields["achievement_rate"] = *req.AchievementRate
	}
	if req.IsCompleted != nil {
		fields["is_completed"] = *req.IsCompleted
	}

	if req.DueDate != nil {
		t, err := time.Parse("2006-01-02", *req.DueDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid due_date format"})
			return
		}
		fields["due_date"] = t
	}

	if req.ClearStartTime != nil && *req.ClearStartTime {
		fields["start_time"] = clause.Expr{SQL: "NULL"}
	} else if req.StartTime != nil {
		t, err := parseTime(*req.StartTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_time format"})
			return
		}
		fields["start_time"] = t
	}

	if req.ClearEndTime != nil && *req.ClearEndTime {
		fields["end_time"] = clause.Expr{SQL: "NULL"}
	} else if req.EndTime != nil {
		t, err := parseTime(*req.EndTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_time format"})
			return
		}
		fields["end_time"] = t
	}

	task, err := h.svc.UpdateTask(uint(id), userID, fields)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, task)
}

func (h *TaskHandler) DeleteTask(c *gin.Context) {
	userID, exists := getUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.svc.DeleteTask(uint(id), userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}
