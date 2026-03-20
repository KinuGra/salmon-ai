package service

import (
	"fmt"
	"strings"
	"time"

	"github.com/salmon-ai/salmon-ai/internal/model"
	"github.com/salmon-ai/salmon-ai/internal/repository"
	aiclient "github.com/salmon-ai/salmon-ai/pkg/aiclient"
)

type ReflectionService struct {
	reflectionRepo        *repository.ReflectionRepository
	reflectionMessageRepo *repository.ReflectionMessageRepository
	contextBuilder        *ContextBuilder
	aiClient              *aiclient.Client
}

func NewReflectionService(
	reflectionRepo *repository.ReflectionRepository,
	reflectionMessageRepo *repository.ReflectionMessageRepository,
	contextBuilder *ContextBuilder,
	aiClient *aiclient.Client,
) *ReflectionService {
	return &ReflectionService{
		reflectionRepo:        reflectionRepo,
		reflectionMessageRepo: reflectionMessageRepo,
		contextBuilder:        contextBuilder,
		aiClient:              aiClient,
	}
}

// GetOrCreateToday は今日の振り返りを取得し、なければ作成して返します。
func (s *ReflectionService) GetOrCreateToday(userID uint) (*model.Reflection, error) {
	today := time.Now().Truncate(24 * time.Hour)
	return s.reflectionRepo.FindOrCreateByDate(userID, today)
}

// GetMessages は指定したリフレクションのチャット履歴を返します。
func (s *ReflectionService) GetMessages(reflectionID uint) ([]model.ReflectionMessage, error) {
	return s.reflectionMessageRepo.FindByReflectionID(reflectionID)
}

// chatMessage はAIサービスに送るメッセージ1件の構造体です。
type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// chatRequest はAIサービスの /reflection/stream に送るリクエスト構造体です。
type chatRequest struct {
	Context     string        `json:"context"`
	Messages    []chatMessage `json:"messages"`
	UserMessage string        `json:"user_message"`
}

// StreamChat はユーザーメッセージを保存し、AIの返答をストリーミングして保存します。
// callback はAIレスポンスのチャンクを受け取るたびに呼ばれます。
func (s *ReflectionService) StreamChat(userID uint, reflectionID uint, userMessage string, callback func([]byte)) error {
	// 1. ユーザーメッセージをDBに保存
	userMsg := &model.ReflectionMessage{
		ReflectionID: reflectionID,
		Role:         "user",
		Content:      userMessage,
	}
	if err := s.reflectionMessageRepo.Create(userMsg); err != nil {
		return fmt.Errorf("reflection_service: failed to save user message: %w", err)
	}

	// 2. ContextBuilderでユーザーの全データを収集
	context, err := s.contextBuilder.BuildFullContext(userID)
	if err != nil {
		return fmt.Errorf("reflection_service: failed to build context: %w", err)
	}

	// 3. チャット履歴を取得（今回追加したユーザーメッセージを含む）
	messages, err := s.reflectionMessageRepo.FindByReflectionID(reflectionID)
	if err != nil {
		return fmt.Errorf("reflection_service: failed to fetch messages: %w", err)
	}

	chatMessages := make([]chatMessage, 0, len(messages))
	for _, m := range messages {
		chatMessages = append(chatMessages, chatMessage{
			Role:    m.Role,
			Content: m.Content,
		})
	}

	req := chatRequest{
		Context:     context,
		Messages:    chatMessages,
		UserMessage: userMessage,
	}

	// 4. ストリーミングでAI返答を受け取り、チャンクをそのままコールバックに流す
	var buf strings.Builder
	if err := s.aiClient.Stream("/reflection/stream", req, func(chunk []byte) {
		buf.Write(chunk)
		callback(chunk)
	}); err != nil {
		return fmt.Errorf("reflection_service: AI stream failed: %w", err)
	}

	// 5. AI返答全文をDBに保存
	aiMsg := &model.ReflectionMessage{
		ReflectionID: reflectionID,
		Role:         "assistant",
		Content:      buf.String(),
	}
	if err := s.reflectionMessageRepo.Create(aiMsg); err != nil {
		return fmt.Errorf("reflection_service: failed to save AI message: %w", err)
	}

	return nil
}
