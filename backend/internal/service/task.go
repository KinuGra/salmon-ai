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

func (s *TaskService) UpdateTask(id uint, userID uint, fields map[string]interface{}) (*model.Task, error) {
	// achievement_rate == 100 → is_completed = true
	if v, ok := fields["achievement_rate"].(*int); ok && v != nil && *v == 100 {
		fields["is_completed"] = true
	}

	// start_time + end_time が両方指定された場合は estimated_hours を自動計算
	start, hasStart := fields["start_time"].(*time.Time)
	end, hasEnd := fields["end_time"].(*time.Time)
	if hasStart && hasEnd && start != nil && end != nil {
		hours := end.Sub(*start).Hours()
		fields["estimated_hours"] = &hours
	}

	return s.repo.Update(id, userID, fields)
}

func (s *TaskService) DeleteTask(id uint, userID uint) error {
	return s.repo.Delete(id, userID)
}
