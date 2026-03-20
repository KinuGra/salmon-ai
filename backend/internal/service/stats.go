package service

import (
	"log"
	"time"

	"github.com/salmon-ai/salmon-ai/internal/repository"
)

type StatsService struct {
	repo *repository.StatsRepository
	jst  *time.Location
}

func NewStatsService(repo *repository.StatsRepository) *StatsService {
	jst, err := time.LoadLocation("Asia/Tokyo")
	if err != nil {
		log.Fatalf("failed to load Asia/Tokyo timezone: %v", err)
	}
	return &StatsService{repo: repo, jst: jst}
}

type StatsResponse struct {
	Current  repository.StatsData `json:"current"`
	Previous repository.StatsData `json:"previous"`
}

func (s *StatsService) GetGrass(userID uint, weeks int) (map[string]int, error) {
	now := time.Now().In(s.jst)
	to := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, s.jst)
	from := to.AddDate(0, 0, -weeks*7)
	return s.repo.GetGrassData(userID, from, to)
}

func (s *StatsService) GetWeeklyStats(userID uint) (StatsResponse, error) {
	now := time.Now().In(s.jst)

	// 今週の月曜日00:00
	weekday := int(now.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	currentStart := time.Date(now.Year(), now.Month(), now.Day()-(weekday-1), 0, 0, 0, 0, s.jst)
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
	now := time.Now().In(s.jst)

	currentStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, s.jst)
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
