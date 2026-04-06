package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/salmon-ai/salmon-ai/internal/handler"
	"github.com/salmon-ai/salmon-ai/internal/middleware"
	"github.com/salmon-ai/salmon-ai/internal/model"
	"github.com/salmon-ai/salmon-ai/internal/repository"
	"github.com/salmon-ai/salmon-ai/internal/service"
	aiclient "github.com/salmon-ai/salmon-ai/pkg/aiclient"
	"github.com/salmon-ai/salmon-ai/pkg/database"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, using environment variables")
	}

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

	// ── Big Five モックデータのシード ────────────────────────────
	// db/seed.sql を起動時に毎回実行する。
	// SQL はすべて ON CONFLICT (id) DO NOTHING で書かれているため冪等。
	// 既にデータが存在する場合は何も変更しない。
	//
	// 投入されるユーザー（MockAuth の ID を切り替えて使い分ける）:
	//   middleware.MockAuth(10) → 田中 誠一（誠実性が高い・最適ゾーン）
	//   middleware.MockAuth(20) → 鈴木 彩花（外向性・楽観的・過信型）
	//   middleware.MockAuth(30) → 佐藤 健太（慎重すぎ・コンフォートゾーン型）
	//
	// ファイルが存在しない場合はスキップ（本番環境への影響なし）
	if seedSQL, err := os.ReadFile("pkg/database/seed.sql"); err == nil {
		if _, err := sqlDB.Exec(string(seedSQL)); err != nil {
			log.Printf("warning: failed to execute seed.sql: %v", err)
		} else {
			log.Println("seed.sql executed successfully")
		}
	} else {
		log.Println("pkg/database/seed.sql not found, skipping seed")
	}

	// デフォルトカテゴリの作成
	defaultCategories := []model.Category{
		{UserID: mockUser.ID, Name: "仕事", Color: "#3B82F6"},
		{UserID: mockUser.ID, Name: "学習", Color: "#22C55E"},
		{UserID: mockUser.ID, Name: "生活", Color: "#EAB308"},
		{UserID: mockUser.ID, Name: "健康", Color: "#EF4444"},
		{UserID: mockUser.ID, Name: "趣味", Color: "#A855F7"},
	}
	for _, cat := range defaultCategories {
		if err := db.FirstOrCreate(&model.Category{}, model.Category{UserID: cat.UserID, Name: cat.Name, Color: cat.Color}).Error; err != nil {
			log.Fatalf("failed to create default category '%s': %v", cat.Name, err)
		}
	}

	// ここからDI（依存性注入）

	// ── Repository ──────────────────────────────────────────
	taskRepo := repository.NewTaskRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	userRepo := repository.NewUserRepository(db)
	statsRepo := repository.NewStatsRepository(db)
	reflectionRepo := repository.NewReflectionRepository(db)
	reflectionMessageRepo := repository.NewReflectionMessageRepository(db)
	reportRepo := repository.NewReportRepository(db)

	// ── AI Client ───────────────────────────────────────────
	aiClient := aiclient.NewClient()

	// ── ContextBuilder ──────────────────────────────────────
	contextBuilder := service.NewContextBuilder(taskRepo, reflectionRepo, categoryRepo, userRepo, reportRepo)

	// ── Service ─────────────────────────────────────────────
	taskSvc := service.NewTaskService(taskRepo, userRepo, categoryRepo, aiClient)
	categorySvc := service.NewCategoryService(categoryRepo)
	userSvc := service.NewUserService(userRepo)
	statsSvc := service.NewStatsService(statsRepo)
	reportSvc := service.NewReportService(reportRepo, contextBuilder, aiClient)
	reflectionSvc := service.NewReflectionService(reflectionRepo, reflectionMessageRepo, contextBuilder, aiClient)
	scheduleSvc := service.NewScheduleService(taskRepo, contextBuilder, aiClient)

	// ── Handler ─────────────────────────────────────────────
	taskHandler := handler.NewTaskHandler(taskSvc)
	categoryHandler := handler.NewCategoryHandler(categorySvc)
	userHandler := handler.NewUserHandler(userSvc)
	statsHandler := handler.NewStatsHandler(statsSvc, aiClient)
	reportHandler := handler.NewReportHandler(reportSvc)
	reflectionHandler := handler.NewReflectionHandler(reflectionSvc)
	scheduleHandler := handler.NewScheduleHandler(scheduleSvc)

	// ミドルウェアの登録
	r := gin.Default()
	r.Use(middleware.CORS())
	r.Use(middleware.MockAuth(mockUser.ID))

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

	// Reflections（振り返りAI対話）
	r.GET("/reflections", reflectionHandler.GetAll)
	r.GET("/reflections/today", reflectionHandler.GetToday)
	r.GET("/reflections/:id/messages", reflectionHandler.GetMessages)
	r.GET("/ai/reflection/stream", reflectionHandler.Stream)

	// Schedule（スケジュールサポート）
	r.POST("/ai/schedule/support", scheduleHandler.ScheduleSupport)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
