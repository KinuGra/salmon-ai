package model

type Report struct {
	BaseReadOnly
	UserID  uint   `gorm:"index;not null"`
	User    User   `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Content string `gorm:"not null"`
}
