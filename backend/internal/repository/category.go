package repository

import (
	"github.com/salmon-ai/salmon-ai/internal/model"
	"gorm.io/gorm"
)

type CategoryRepository struct {
	db *gorm.DB
}

func NewCategoryRepository(db *gorm.DB) *CategoryRepository {
	return &CategoryRepository{db: db}
}

func (r *CategoryRepository) FindByUserID(userID uint) ([]model.Category, error) {
	var categories []model.Category
	err := r.db.Where("user_id = ?", userID).Find(&categories).Error
	return categories, err
}

func (r *CategoryRepository) Create(category *model.Category) error {
	return r.db.Create(category).Error
}

func (r *CategoryRepository) Update(id uint, userID uint, fields map[string]interface{}) (*model.Category, error) {
	if err := r.db.Model(&model.Category{}).Where("id = ? AND user_id = ?", id, userID).Updates(fields).Error; err != nil {
		return nil, err
	}
	var category model.Category
	err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&category).Error
	return &category, err
}

func (r *CategoryRepository) Delete(id uint, userID uint) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&model.Category{}).Error
}
