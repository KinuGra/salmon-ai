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
        aiClient     *aiclient.Client
}

func NewTaskService(repo *repository.TaskRepository, userRepo *repository.UserRepository, categoryRepo *repository.CategoryRepository, aiClient *aiclient.Client) *TaskService {
        return &TaskService{
                repo:         repo,
                userRepo:     userRepo,
                categoryRepo: categoryRepo,
                aiClient:     aiClient,
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
	if err := s.repo.Create(task); err != nil {
		return err
	}

	// AI見積もりをgoroutineで非同期実行（タスク作成をブロックしない）
	go s.runAIEstimation(task.ID, task.Title, task.Description, task.CategoryID, task.UserID)

	return nil
}

func (s *TaskService) runAIEstimation(taskID uint, title string, description *string, categoryID *uint, userID uint) {
	reqPayload := struct {
		Title       string  `json:"title"`
		Description *string `json:"description,omitempty"`
		Category    *string `json:"category,omitempty"`
		UserContext *string `json:"user_context,omitempty"`
	}{
		Title:       title,
		Description: description,
	}

	// UserContext の取得
	if user, err := s.userRepo.FindByID(userID); err == nil && user != nil {
		reqPayload.UserContext = user.UserContext
	} else if err != nil {
		log.Printf("ユーザー情報の取得に失敗しました (userID: %d): %v", userID, err)
	}

	// カテゴリ名の取得
	if categoryID != nil {
		if cat, err := s.categoryRepo.FindByIDAndUserID(*categoryID, userID); err == nil {
			reqPayload.Category = &cat.Name
		} else {
			log.Printf("カテゴリ情報の個別取得に失敗しました (userID: %d, categoryID: %d): %v", userID, *categoryID, err)
		}
	}

	data, err := s.aiClient.Post("/estimate", reqPayload)
	if err != nil {
		log.Printf("[AI Estimate] 見積もりの取得に失敗しました (taskID: %d): %v", taskID, err)
		return
	}

	var aiResp struct {
		EstimatedHours float64 `json:"estimated_hours"`
		Reasoning      string  `json:"reasoning"`
	}
	if err := json.Unmarshal(data, &aiResp); err != nil {
		log.Printf("[AI Estimate] レスポンスのパースに失敗しました (taskID: %d): %v", taskID, err)
		return
	}

	if err := s.repo.UpdateAIEstimation(taskID, aiResp.EstimatedHours, aiResp.Reasoning); err != nil {
		log.Printf("[AI Estimate] DB更新に失敗しました (taskID: %d): %v", taskID, err)
		return
	}

	fmt.Printf("[AI Estimate] taskID=%d title=%q -> %.1fh\n", taskID, title, aiResp.EstimatedHours)
}

func (s *TaskService) UpdateTask(id uint, userID uint, fields map[string]any) (*model.Task, error) {
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
