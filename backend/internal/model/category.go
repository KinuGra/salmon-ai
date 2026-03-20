package model

type Category struct {
	Base
	UserID uint   `gorm:"index;not null" json:"user_id"`
	User   User   `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Name   string `gorm:"not null" json:"name"`
	Color  string `gorm:"not null" json:"color"`
}
