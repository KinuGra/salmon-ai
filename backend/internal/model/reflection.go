package model

import "time"

type Reflection struct {
	Base
	UserID  uint      `gorm:"index;not null" json:"user_id"`
	User    User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Date    time.Time `gorm:"index;not null" json:"date"`
	Content *string   `json:"content"`
}
