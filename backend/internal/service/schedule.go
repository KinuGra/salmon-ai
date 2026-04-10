package service

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/salmon-ai/salmon-ai/internal/repository"
	"github.com/salmon-ai/salmon-ai/pkg/aiclient"
)

type ScheduleService struct {
	taskRepo       *repository.TaskRepository
	contextBuilder *ContextBuilder
	aiClient       *aiclient.Client
}

func NewScheduleService(
	taskRepo *repository.TaskRepository,
	contextBuilder *ContextBuilder,
	aiClient *aiclient.Client,
) *ScheduleService {
	return &ScheduleService{
		taskRepo:       taskRepo,
		contextBuilder: contextBuilder,
		aiClient:       aiClient,
	}
}

// Pythonに送るタスクの構造体
type scheduleTaskItem struct {
	Title     string  `json:"title"`
	Priority  *int    `json:"priority"`
	StartTime *string `json:"start_time"`
	EndTime   *string `json:"end_time"`
}

// Pythonへのリクエスト
type scheduleSupportRequest struct {
	Tasks   []scheduleTaskItem `json:"tasks"`
	Context string             `json:"context"`
}

// Pythonからのレスポンス
type ScheduleSupportResponse struct {
	Issues struct {
		BufferShortage bool `json:"buffer_shortage"`
		PriorityBias   bool `json:"priority_bias"`
	} `json:"issues"`
	Advice string `json:"advice"`
}

func (s *ScheduleService) Support(userID uint, date string) (*ScheduleSupportResponse, error) {
	// 1. 当日のタスクを取得
	parseDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		return nil, fmt.Errorf("failed to parse date: %w", err)
	}
	tasks, err := s.taskRepo.FindByUserIDAndDate(userID, parseDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get tasks: %w", err)
	}

	// 2. タスクをPython用に構造体に変換
	taskItems := make([]scheduleTaskItem, 0, len(tasks))
	for _, task := range tasks {
		item := scheduleTaskItem{
			Title:    task.Title,
			Priority: task.Priority,
		}
		if task.StartTime != nil {
			s := task.StartTime.Format(time.RFC3339)
			item.StartTime = &s
		}
		if task.EndTime != nil {
			e := task.EndTime.Format(time.RFC3339)
			item.EndTime = &e
		}
		taskItems = append(taskItems, item)
	}

	// 3. ContextBuilderでユーザーのコンテキストを生成
	ctx, _, err := s.contextBuilder.BuildFullContext(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to build context: %w", err)
	}

	// 4. PythonにPOSTして診断結果を取得
	req := scheduleSupportRequest{
		Tasks:   taskItems,
		Context: ctx,
	}
	data, err := s.aiClient.Post("/schedule/support", req)
	if err != nil {
		return nil, fmt.Errorf("failed to call ai service: %w", err)
	}

	// 5. レスポンスをパース
	var res ScheduleSupportResponse
	if err := json.Unmarshal(data, &res); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &res, nil
}
