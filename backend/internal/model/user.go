package model

type User struct {
	Base
	Email       string  `gorm:"not null" json:"email"`
	Name        string  `gorm:"not null" json:"name"`
	UserContext *string `json:"user_context"`
}
