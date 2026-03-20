package repository

import (
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
