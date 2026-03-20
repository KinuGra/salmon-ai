package repository

import (
	"github.com/salmon-ai/salmon-ai/internal/model"
	"gorm.io/gorm"
)

type ReflectionMessageRepository struct {
	db *gorm.DB
}

func NewReflectionMessageRepository(db *gorm.DB) *ReflectionMessageRepository {
	return &ReflectionMessageRepository{db: db}
}

// FindByReflectionID は指定したリフレクションのメッセージを時系列順で返します。
func (r *ReflectionMessageRepository) FindByReflectionID(reflectionID uint) ([]model.ReflectionMessage, error) {
	var messages []model.ReflectionMessage
	if err := r.db.
		Where("reflection_id = ?", reflectionID).
		Order("created_at ASC").
		Find(&messages).Error; err != nil {
		return nil, err
	}
	return messages, nil
}

// Create はメッセージをDBに保存します。
func (r *ReflectionMessageRepository) Create(msg *model.ReflectionMessage) error {
	return r.db.Create(msg).Error
}
