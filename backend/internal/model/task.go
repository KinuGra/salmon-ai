package model

import "time"

type Task struct {
	Base
	UserID           uint      `gorm:"index;not null"`
	User             User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	CategoryID       *uint
	Category         *Category `gorm:"foreignKey:CategoryID;constraint:OnDelete:SET NULL"`
	Title            string    `gorm:"not null"`
	Description      *string
	Priority         *int
	IsCompleted      bool       `gorm:"not null;default:false"`
	EstimatedHours   *float64
	AiEstimatedHours *float64
	StartTime        *time.Time `gorm:"index"`
	EndTime          *time.Time
	DueDate          *time.Time
	AchievementRate  *int
}
