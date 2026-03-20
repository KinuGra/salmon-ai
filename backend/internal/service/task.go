package service

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/salmon-ai/salmon-ai/internal/model"
	"github.com/salmon-ai/salmon-ai/internal/repository"
	"github.com/salmon-ai/salmon-ai/pkg/aiclient"
)

type TaskService struct {
	repo         *repository.TaskRepository
	userRepo     *repository.UserRepository
	categoryRepo *repository.CategoryRepository
}

func NewTaskService(repo *repository.TaskRepository, userRepo *repository.UserRepository, categoryRepo *repository.CategoryRepository) *TaskService {
	return &TaskService{
		repo:         repo,
		userRepo:     userRepo,
		categoryRepo: categoryRepo,
	}
}

func (s *TaskService) GetTasks(userID uint) ([]model.Task, error) {
	return s.repo.FindByUserID(userID)
}

func (s *TaskService) GetTasksByDate(userID uint, date time.Time) ([]model.Task, error) {
	return s.repo.FindByUserIDAndDate(userID, date)
}

func (s *TaskService) GetUnscheduledTasks(userID uint) ([]model.Task, error) {
	return s.repo.FindUnscheduled(userID)
}

func (s *TaskService) CreateTask(task *model.Task) error {
	// AI見積もり用のリクエストを準備
	reqPayload := struct {
		Title       string  `json:"title"`
		Description *string `json:"description,omitempty"`
		Category    *string `json:"category,omitempty"`
		UserContext *string `json:"user_context,omitempty"`
	}{
		Title:       task.Title,
		Description: task.Description,
	}

	// UserContext の取得
	if user, err := s.userRepo.FindByID(task.UserID); err == nil && user != nil {
		reqPayload.UserContext = user.UserContext
	} else if err != nil {
		log.Printf("ユーザー情報の取得に失敗しました (userID: %d): %v", task.UserID, err)
	}

	// カテゴリ名の取得
	if task.CategoryID != nil {
		if categories, err := s.categoryRepo.FindByUserID(task.UserID); err == nil {
			for _, cat := range categories {
				if cat.ID == *task.CategoryID {
					reqPayload.Category = &cat.Name
					break
				}
			}
		} else {
			log.Printf("カテゴリ情報の取得に失敗しました (userID: %d): %v", task.UserID, err)
		}
	}

	// aiclientを使ってAIに見積もりをリクエストし、結果をタスクにセット
	client := aiclient.NewClient()
	if data, err := client.Post("/estimate", reqPayload); err == nil {
		var aiResp struct {
			EstimatedHours float64 `json:"estimated_hours"`
			Reasoning      string  `json:"reasoning"`
		}
		if err := json.Unmarshal(data, &aiResp); err == nil {
			task.AiEstimatedHours = &aiResp.EstimatedHours
			fmt.Printf("[AI Estimate Result] Title: %s -> %.1fh (Reason: %s)\n", task.Title, aiResp.EstimatedHours, aiResp.Reasoning)
		} else {
			log.Printf("AI見積もりレスポンスのパースに失敗しました: %v", err)
		}
	} else {
		log.Printf("AI見積もりの取得に失敗しました: %v", err)
	}

	return s.repo.Create(task)
}

func (s *TaskService) UpdateTask(id uint, userID uint, fields map[string]interface{}) (*model.Task, error) {
	// achievement_rate == 100 → is_completed = true
	if v, ok := fields["achievement_rate"].(int); ok && v == 100 {
		fields["is_completed"] = true
	}

	// start_time + end_time が両方指定された場合は estimated_hours を自動計算
	// ただし estimated_hours が明示的に指定された場合は上書きしない
	start, hasStart := fields["start_time"].(time.Time)
	end, hasEnd := fields["end_time"].(time.Time)
	if hasStart && hasEnd {
		if _, hasEstimated := fields["estimated_hours"]; !hasEstimated {
			hours := end.Sub(start).Hours()
			fields["estimated_hours"] = hours
		}
	}

	return s.repo.Update(id, userID, fields)
}

func (s *TaskService) DeleteTask(id uint, userID uint) error {
	return s.repo.Delete(id, userID)
}
