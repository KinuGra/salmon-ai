package service

import (
	"time"

	"github.com/salmon-ai/salmon-ai/internal/model"
	"github.com/salmon-ai/salmon-ai/internal/repository"
)

type TaskService struct {
	repo *repository.TaskRepository
}

func NewTaskService(repo *repository.TaskRepository) *TaskService {
	return &TaskService{repo: repo}
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
	return s.repo.Create(task)
}

func (s *TaskService) UpdateTask(id uint, userID uint, req map[string]interface{}) (*model.Task, error) {
	task, err := s.repo.FindByID(id, userID)
	if err != nil {
		return nil, err
	}

	if v, ok := req["title"].(string); ok {
		task.Title = v
	}
	if v, ok := req["description"].(*string); ok {
		task.Description = v
	}
	if v, ok := req["priority"].(*int); ok {
		task.Priority = v
	}
	if v, ok := req["category_id"].(*uint); ok {
		task.CategoryID = v
	}
	if v, ok := req["due_date"].(*time.Time); ok {
		task.DueDate = v
	}
	if v, ok := req["start_time"].(*time.Time); ok {
		task.StartTime = v
	}
	if v, ok := req["end_time"].(*time.Time); ok {
		task.EndTime = v
	}
	if v, ok := req["estimated_hours"].(*float64); ok {
		task.EstimatedHours = v
	}
	if v, ok := req["is_completed"].(bool); ok {
		task.IsCompleted = v
	}
	if v, ok := req["achievement_rate"].(*int); ok {
		task.AchievementRate = v
		if v != nil && *v == 100 {
			task.IsCompleted = true
		}
	}

	if task.StartTime != nil && task.EndTime != nil {
		hours := task.EndTime.Sub(*task.StartTime).Hours()
		task.EstimatedHours = &hours
	}

	if err := s.repo.Update(task); err != nil {
		return nil, err
	}
	return task, nil
}

func (s *TaskService) DeleteTask(id uint, userID uint) error {
	return s.repo.Delete(id, userID)
}
