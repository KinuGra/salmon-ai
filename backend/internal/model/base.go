package model

import "time"

type Base struct {
	ID uint `gorm:"primarykey"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type BaseReadOnly struct {
	ID uint `gorm:"primarykey"`
	CreatedAt time.Time
}
