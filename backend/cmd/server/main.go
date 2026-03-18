package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/salmon-ai/salmon-ai/internal/model"
	"github.com/salmon-ai/salmon-ai/pkg/database"
)

func main() {
	db, err := database.NewDB()
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("failed to get sql.DB: %v", err)
	}
	defer sqlDB.Close()

	log.Println("database connected successfully")

	if err := db.AutoMigrate(
		&model.User{},
		&model.Category{},
		&model.Task{},
		&model.Reflection{},
		&model.ReflectionMessage{},
		&model.Report{},
	); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	log.Println("database migrated successfully")

	// モックユーザーの作成
	var mockUser model.User
	result := db.FirstOrCreate(&mockUser, model.User{
		Email: "mock@example.com",
		Name: "モックユーザー",
	})
	if result.Error != nil {
		log.Fatalf("failed to create mock user: %v", result.Error)
	}
	if result.RowsAffected == 1 {
		log.Printf("mock user created: id=%d", mockUser.ID)
	} else {
		log.Printf("mock user already exists: id=%d", mockUser.ID)
	}

	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	if err := r.Run(":8080"); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
