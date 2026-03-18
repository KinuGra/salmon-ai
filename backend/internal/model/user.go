package model

type User struct {
	Base
	Email string `gorm:"not null"`
	Name string `gorm:"not null"`
	UserContext *string
}
