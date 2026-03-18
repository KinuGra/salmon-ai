package model

type ReflectionMessage struct {
	BaseReadOnly
	ReflectionID uint       `gorm:"index;not null"`
	Reflection   Reflection `gorm:"foreignKey:ReflectionID;constraint:OnDelete:CASCADE"`
	Role         string     `gorm:"not null"`
	Content      string     `gorm:"not null"`
}
