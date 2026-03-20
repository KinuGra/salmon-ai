package model

import "time"

type Task struct {
	Base
	UserID           uint       `gorm:"index;not null" json:"user_id"`
	User             User       `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	CategoryID       *uint      `json:"category_id"`
	Category         *Category  `gorm:"foreignKey:CategoryID;constraint:OnDelete:SET NULL" json:"category"`
	Title            string     `gorm:"not null" json:"title"`
	Description      *string    `json:"description"`
	Priority         *int       `gorm:"default:2" json:"priority"`
	IsCompleted      bool       `gorm:"not null;default:false" json:"is_completed"`
	EstimatedHours   *float64   `json:"estimated_hours"`
	AiEstimatedHours *float64   `json:"ai_estimated_hours"`
	StartTime        *time.Time `gorm:"index" json:"start_time"`
	EndTime          *time.Time `json:"end_time"`
	DueDate          *time.Time `json:"due_date"`
	AchievementRate  *int       `json:"achievement_rate"`
}
