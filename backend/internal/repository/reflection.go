package repository

import (
	"time"

	"github.com/salmon-ai/salmon-ai/internal/model"
	"gorm.io/gorm"
)

type ReflectionRepository struct {
	db *gorm.DB
}

func NewReflectionRepository(db *gorm.DB) *ReflectionRepository {
	return &ReflectionRepository{db: db}
}

// FindAllByUserID は指定ユーザーの振り返りを新しい順に全件取得します（コンテキスト生成用）。
func (r *ReflectionRepository) FindAllByUserID(userID uint) ([]model.Reflection, error) {
	var reflections []model.Reflection
	err := r.db.
		Where("user_id = ?", userID).
		Order("date DESC").
		Find(&reflections).Error
	return reflections, err
}

// FindOrCreateByDate は指定日付の振り返りを取得し、なければ新規作成して返します。
func (r *ReflectionRepository) FindOrCreateByDate(userID uint, date time.Time) (*model.Reflection, error) {
	var reflection model.Reflection
	result := r.db.Where("user_id = ? AND date = ?", userID, date).First(&reflection)
	if result.Error == nil {
		return &reflection, nil
	}
	if result.Error != gorm.ErrRecordNotFound {
		return nil, result.Error
	}

	reflection = model.Reflection{
		UserID: userID,
		Date:   date,
	}
	if err := r.db.Create(&reflection).Error; err != nil {
		return nil, err
	}
	return &reflection, nil
}
