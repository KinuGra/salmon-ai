package service

import (
	"github.com/salmon-ai/salmon-ai/internal/model"
	"github.com/salmon-ai/salmon-ai/internal/repository"
)

type UserService struct {
	repo *repository.UserRepository
}

func NewUserService(repo *repository.UserRepository) *UserService {
	return &UserService{repo: repo}
}

func (s *UserService) GetProfile(userID uint) (*model.User, error) {
	return s.repo.FindByID(userID)
}

func (s *UserService) UpdateProfile(userID uint, name *string, userContext *string) (*model.User, error) {
	user, err := s.repo.FindByID(userID)
	if err != nil {
		return nil, err
	}

	if name != nil {
		user.Name = *name
	}
	if userContext != nil {
		user.UserContext = userContext
	}

	if err := s.repo.Update(user); err != nil {
		return nil, err
	}
	return user, nil
}
