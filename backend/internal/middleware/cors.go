package middleware

import (
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CORS() gin.HandlerFunc {
	config := cors.Config{
		AllowOrigins: []string{
			"http://localhost:3000",
		},
		AllowOriginFunc: func(origin string) bool {
			// Vercel プレビュー・本番デプロイを許可
			return strings.HasSuffix(origin, ".vercel.app")
		},
		AllowMethods: []string{
			"GET", "POST", "PUT", "DELETE",
		},
		AllowHeaders: []string{
			"Authorization",
			"Content-Type",
		},
	}
	return cors.New(config)
}
