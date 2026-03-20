package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/salmon-ai/salmon-ai/internal/handler"
	"github.com/salmon-ai/salmon-ai/internal/middleware"
	"github.com/salmon-ai/salmon-ai/internal/model"
	"github.com/salmon-ai/salmon-ai/internal/repository"
	"github.com/salmon-ai/salmon-ai/internal/service"
	aiclient "github.com/salmon-ai/salmon-ai/pkg/aiclient"
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
		Name:  "モックユーザー",
	})
	if result.Error != nil {
		log.Fatalf("failed to create mock user: %v", result.Error)
	}
	if result.RowsAffected == 1 {
		log.Printf("mock user created: id=%d", mockUser.ID)
	} else {
		log.Printf("mock user already exists: id=%d", mockUser.ID)
	}

	// ── Repository ──────────────────────────────────────────
	taskRepo := repository.NewTaskRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	userRepo := repository.NewUserRepository(db)
	statsRepo := repository.NewStatsRepository(db)
	reflectionRepo := repository.NewReflectionRepository(db)
	reportRepo := repository.NewReportRepository(db)

	// ── AI Client ───────────────────────────────────────────
	aiClient := aiclient.NewClient()

	// ── ContextBuilder ──────────────────────────────────────
	contextBuilder := service.NewContextBuilder(taskRepo, reflectionRepo, categoryRepo)

	// ── Service ─────────────────────────────────────────────
	taskSvc := service.NewTaskService(taskRepo)
	categorySvc := service.NewCategoryService(categoryRepo)
	userSvc := service.NewUserService(userRepo)
	statsSvc := service.NewStatsService(statsRepo)
	reportSvc := service.NewReportService(reportRepo, contextBuilder, aiClient)

	// ── Handler ─────────────────────────────────────────────
	taskHandler := handler.NewTaskHandler(taskSvc)
	categoryHandler := handler.NewCategoryHandler(categorySvc)
	userHandler := handler.NewUserHandler(userSvc)
	statsHandler := handler.NewStatsHandler(statsSvc, aiClient)
	reportHandler := handler.NewReportHandler(reportSvc)

	// ミドルウェアの登録
	r := gin.Default()
	r.Use(middleware.CORS())
	r.Use(middleware.MockAuth(mockUser.ID))

	// 暫定CORSミドルウェア（pan担当の本番ミドルウェアに後で置き換える）
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	r.GET("/health", func(c *gin.Context) {
		userID, _ := c.Get("userID")
		c.JSON(200, gin.H{"status": "ok", "userID": userID})
	})

	// Tasks
	r.GET("/tasks", taskHandler.GetTasks)
	r.GET("/tasks/unscheduled", taskHandler.GetUnscheduledTasks)
	r.POST("/tasks", taskHandler.CreateTask)
	r.PUT("/tasks/:id", taskHandler.UpdateTask)
	r.DELETE("/tasks/:id", taskHandler.DeleteTask)

	// Categories
	r.GET("/categories", categoryHandler.GetCategories)
	r.POST("/categories", categoryHandler.CreateCategory)
	r.PUT("/categories/:id", categoryHandler.UpdateCategory)
	r.DELETE("/categories/:id", categoryHandler.DeleteCategory)

	// User
	r.GET("/user/profile", userHandler.GetProfile)
	r.PUT("/user/profile", userHandler.UpdateProfile)

	// Stats
	r.GET("/stats/weekly", statsHandler.GetWeeklyStats)
	r.GET("/stats/monthly", statsHandler.GetMonthlyStats)
	r.GET("/stats/grass", statsHandler.GetGrass)
	r.POST("/ai/stats/comment", statsHandler.PostStatsComment)

	// Reports（自己分析レポート）
	r.GET("/reports/latest", reportHandler.GetLatestReport)
	r.POST("/ai/report/generate", reportHandler.GenerateReport)

	if err := r.Run(":8080"); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
