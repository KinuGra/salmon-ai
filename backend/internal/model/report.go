package model

type Report struct {
	BaseReadOnly
	UserID  uint   `gorm:"index;not null" json:"user_id"`
	User    User   `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Content string `gorm:"not null" json:"content"`
}
