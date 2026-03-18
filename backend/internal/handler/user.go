package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/salmon-ai/salmon-ai/internal/service"
)

type UserHandler struct {
	svc *service.UserService
}

func NewUserHandler(svc *service.UserService) *UserHandler {
	return &UserHandler{svc: svc}
}

type UpdateUserProfileRequest struct {
	Name        *string `json:"name"`
	UserContext *string `json:"user_context"`
}

func (h *UserHandler) GetProfile(c *gin.Context) {
	// TODO: ミドルウェア実装後は uint(1) を c.MustGet("userID").(uint) に差し替える
	userID := getUserID()

	user, err := h.svc.GetProfile(userID)
	if err != nil {
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

	user, err := h.svc.UpdateProfile(userID, req.Name, req.UserContext)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, user)
}
