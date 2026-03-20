package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/salmon-ai/salmon-ai/internal/service"
	"github.com/salmon-ai/salmon-ai/pkg/sse"
)

type ReflectionHandler struct {
	svc *service.ReflectionService
}

func NewReflectionHandler(svc *service.ReflectionService) *ReflectionHandler {
	return &ReflectionHandler{svc: svc}
}

// GetMessages GET /reflections/:id/messages
// 指定したリフレクションのチャット履歴を返します。
func (h *ReflectionHandler) GetMessages(c *gin.Context) {
	userID, exists := getUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	_ = userID // 将来の認可チェック用に保持

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	messages, err := h.svc.GetMessages(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, messages)
}

// Stream GET /ai/reflection/stream?reflection_id=1&message=...
// ユーザーメッセージを受け取り、AIの返答をSSEでストリーミングします。
func (h *ReflectionHandler) Stream(c *gin.Context) {
	sse.SetHeaders(c)

	userID, exists := getUserID(c)
	if !exists {
		sse.Send(c, "error: unauthorized")
		return
	}

	reflectionIDStr := c.Query("reflection_id")
	reflectionID, err := strconv.ParseUint(reflectionIDStr, 10, 64)
	if err != nil || reflectionIDStr == "" {
		sse.Send(c, "error: invalid reflection_id")
		return
	}

	message := c.Query("message")
	if message == "" {
		sse.Send(c, "error: message is required")
		return
	}

	if err := h.svc.StreamChat(userID, uint(reflectionID), message, func(chunk []byte) {
		sse.Send(c, string(chunk))
	}); err != nil {
		sse.Send(c, fmt.Sprintf("error: %s", err.Error()))
		return
	}
}
