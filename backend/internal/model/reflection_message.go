package model

type ReflectionMessage struct {
	BaseReadOnly
	ReflectionID uint       `gorm:"index;not null" json:"reflection_id"`
	Reflection   Reflection `gorm:"foreignKey:ReflectionID;constraint:OnDelete:CASCADE" json:"-"`
	Role         string     `gorm:"not null" json:"role"`
	Content      string     `gorm:"not null" json:"content"`
}
