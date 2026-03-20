package repository

import (
	"github.com/salmon-ai/salmon-ai/internal/model"
	"gorm.io/gorm"
	"time"
)

type StatsData struct {
	CompletedCount    int         `json:"completed_count"`
	AchievementCounts map[int]int `json:"achievement_counts"`
	GrassCount        int         `json:"grass_count"`
}

type StatsRepository struct {
	db *gorm.DB
}

func NewStatsRepository(db *gorm.DB) *StatsRepository {
	return &StatsRepository{db: db}
}

func (r *StatsRepository) GetGrassData(userID uint, from, to time.Time) (map[string]int, error) {
	type result struct {
		Date  string
		Count int
	}
	var results []result
	if err := r.db.Raw(`
		SELECT TO_CHAR(DATE(start_time AT TIME ZONE 'Asia/Tokyo'), 'YYYY-MM-DD') as date, COUNT(*) as count
		FROM tasks
		WHERE user_id = ? AND is_completed = true AND start_time >= ? AND start_time < ?
		GROUP BY DATE(start_time AT TIME ZONE 'Asia/Tokyo')
	`, userID, from, to).Scan(&results).Error; err != nil {
		return nil, err
	}
	data := make(map[string]int)
	for _, res := range results {
		data[res.Date] = res.Count
	}
	return data, nil
}

func (r *StatsRepository) GetStats(userID uint, from, to time.Time) (StatsData, error) {
	data := StatsData{AchievementCounts: make(map[int]int)}

	// 完了タスク数
	var completedCount int64
	if err := r.db.Model(&model.Task{}).
		Where("user_id = ? AND is_completed = true AND start_time >= ? AND start_time < ?", userID, from, to).
		Count(&completedCount).Error; err != nil {
		return data, err
	}
	data.CompletedCount = int(completedCount)

	// 達成度別件数
	type achResult struct {
		AchievementRate int
		Count           int
	}
	var results []achResult
	if err := r.db.Model(&model.Task{}).
		Select("achievement_rate, count(*) as count").
		Where("user_id = ? AND achievement_rate IS NOT NULL AND start_time >= ? AND start_time < ?", userID, from, to).
		Group("achievement_rate").
		Scan(&results).Error; err != nil {
		return data, err
	}
	for _, res := range results {
		data.AchievementCounts[res.AchievementRate] = res.Count
	}

	// タスクリストでチェックされた（is_completed=true かつ achievement_rate 未設定）タスクを 100% として計上
	var completedNoRate int64
	if err := r.db.Model(&model.Task{}).
		Where("user_id = ? AND is_completed = true AND achievement_rate IS NULL AND start_time >= ? AND start_time < ?", userID, from, to).
		Count(&completedNoRate).Error; err != nil {
		return data, err
	}
	data.AchievementCounts[100] += int(completedNoRate)

	// 草の数（is_completed = true の日のユニーク数）
	var grassCount int64
	if err := r.db.Raw(
		`SELECT COUNT(DISTINCT DATE(start_time AT TIME ZONE 'Asia/Tokyo')) FROM tasks WHERE user_id = ? AND is_completed = true AND start_time >= ? AND start_time < ?`,
		userID, from, to,
	).Scan(&grassCount).Error; err != nil {
		return data, err
	}
	data.GrassCount = int(grassCount)

	return data, nil
}
