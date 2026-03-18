package service

import (
	"github.com/salmon-ai/salmon-ai/internal/model"
	"github.com/salmon-ai/salmon-ai/internal/repository"
)

type CategoryService struct {
	repo *repository.CategoryRepository
}

func NewCategoryService(repo *repository.CategoryRepository) *CategoryService {
	return &CategoryService{repo: repo}
}

func (s *CategoryService) GetCategories(userID uint) ([]model.Category, error) {
	return s.repo.FindByUserID(userID)
}

func (s *CategoryService) CreateCategory(category *model.Category) error {
	return s.repo.Create(category)
}

func (s *CategoryService) UpdateCategory(id uint, userID uint, name *string, color *string) (*model.Category, error) {
	fields := map[string]interface{}{}
	if name != nil {
		fields["name"] = *name
	}
	if color != nil {
		fields["color"] = *color
	}
	return s.repo.Update(id, userID, fields)
}

func (s *CategoryService) DeleteCategory(id uint, userID uint) error {
	return s.repo.Delete(id, userID)
}
