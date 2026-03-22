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
			"https://salmon-ai.vercel.app",
		},
		AllowOriginFunc: func(origin string) bool {
			return strings.HasSuffix(origin, ".vercel.app")
		},
		AllowMethods: []string{
			"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS",
		},
		AllowHeaders: []string{
			"Authorization",
			"Content-Type",
			"Origin",
			"Accept",
			"X-Requested-With",
		},
	}
	return cors.New(config)
}
