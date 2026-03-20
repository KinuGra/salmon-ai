package service

import (
	"time"

	"github.com/salmon-ai/salmon-ai/internal/repository"
)

type StatsService struct {
	repo *repository.StatsRepository
}

func NewStatsService(repo *repository.StatsRepository) *StatsService {
	return &StatsService{repo: repo}
}

type StatsResponse struct {
	Current  repository.StatsData `json:"current"`
	Previous repository.StatsData `json:"previous"`
}

func (s *StatsService) GetGrass(userID uint, weeks int) (map[string]int, error) {
	jst, _ := time.LoadLocation("Asia/Tokyo")
	now := time.Now().In(jst)
	to := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, jst)
	from := to.AddDate(0, 0, -weeks*7)
	return s.repo.GetGrassData(userID, from, to)
}

func (s *StatsService) GetWeeklyStats(userID uint) (StatsResponse, error) {
	jst, _ := time.LoadLocation("Asia/Tokyo")
	now := time.Now().In(jst)

	// 今週の月曜日00:00
	weekday := int(now.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	currentStart := time.Date(now.Year(), now.Month(), now.Day()-(weekday-1), 0, 0, 0, 0, jst)
	currentEnd := currentStart.AddDate(0, 0, 7)
	previousStart := currentStart.AddDate(0, 0, -7)
	previousEnd := currentStart

	current, err := s.repo.GetStats(userID, currentStart, currentEnd)
	if err != nil {
		return StatsResponse{}, err
	}
	previous, err := s.repo.GetStats(userID, previousStart, previousEnd)
	if err != nil {
		return StatsResponse{}, err
	}
	return StatsResponse{Current: current, Previous: previous}, nil
}

func (s *StatsService) GetMonthlyStats(userID uint) (StatsResponse, error) {
	jst, _ := time.LoadLocation("Asia/Tokyo")
	now := time.Now().In(jst)

	currentStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, jst)
	currentEnd := currentStart.AddDate(0, 1, 0)
	previousStart := currentStart.AddDate(0, -1, 0)
	previousEnd := currentStart

	current, err := s.repo.GetStats(userID, currentStart, currentEnd)
	if err != nil {
		return StatsResponse{}, err
	}
	previous, err := s.repo.GetStats(userID, previousStart, previousEnd)
	if err != nil {
		return StatsResponse{}, err
	}
	return StatsResponse{Current: current, Previous: previous}, nil
}
