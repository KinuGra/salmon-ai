package model

import "time"

type Reflection struct {
	Base
	UserID  uint      `gorm:"index;not null"`
	User    User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Date    time.Time `gorm:"index;not null"`
	Content *string
}
