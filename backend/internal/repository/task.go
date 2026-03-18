package repository

import (
	"time"

	"github.com/salmon-ai/salmon-ai/internal/model"
	"gorm.io/gorm"
)

type TaskRepository struct {
	db *gorm.DB
}

func NewTaskRepository(db *gorm.DB) *TaskRepository {
	return &TaskRepository{db: db}
}

func (r *TaskRepository) FindByUserID(userID uint) ([]model.Task, error) {
	var tasks []model.Task
	err := r.db.
		Where("user_id = ?", userID).
		Order("priority ASC, due_date ASC").
		Find(&tasks).Error
	return tasks, err
}

func (r *TaskRepository) FindByUserIDAndDate(userID uint, date time.Time) ([]model.Task, error) {
	start := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	end := start.AddDate(0, 0, 1)

	var tasks []model.Task
	err := r.db.
		Where("user_id = ? AND start_time >= ? AND start_time < ?", userID, start, end).
		Find(&tasks).Error
	return tasks, err
}

func (r *TaskRepository) FindUnscheduled(userID uint) ([]model.Task, error) {
	var tasks []model.Task
	err := r.db.
		Where("user_id = ? AND start_time IS NULL", userID).
		Order("priority ASC, due_date ASC").
		Find(&tasks).Error
	return tasks, err
}

func (r *TaskRepository) Create(task *model.Task) error {
	return r.db.Create(task).Error
}

func (r *TaskRepository) Update(task *model.Task) error {
	return r.db.Save(task).Error
}

func (r *TaskRepository) Delete(id uint, userID uint) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&model.Task{}).Error
}
