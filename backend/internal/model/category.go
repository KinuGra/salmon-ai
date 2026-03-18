package model

type Category struct {
	Base
	UserID uint   `gorm:"index;not null"`
	User User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Name   string `gorm:"not null"`
	Color  string `gorm:"not null"`
}
