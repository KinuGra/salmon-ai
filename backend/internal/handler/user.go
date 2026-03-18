package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/salmon-ai/salmon-ai/internal/model"
	"gorm.io/gorm"
)

type UserHandler struct {
	db *gorm.DB
}

func NewUserHandler(db *gorm.DB) *UserHandler {
	return &UserHandler{db: db}
}

type UpdateUserProfileRequest struct {
	Name        *string `json:"name"`
	UserContext *string `json:"user_context"`
}

func (h *UserHandler) GetProfile(c *gin.Context) {
	// TODO: ミドルウェア実装後は uint(1) を c.MustGet("userID").(uint) に差し替える
	userID := getUserID()

	var user model.User
	if err := h.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	// TODO: ミドルウェア実装後は uint(1) を c.MustGet("userID").(uint) に差し替える
	userID := getUserID()

	var req UpdateUserProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user model.User
	if err := h.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	if req.Name != nil {
		user.Name = *req.Name
	}
	if req.UserContext != nil {
		user.UserContext = req.UserContext
	}

	if err := h.db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, user)
}
