package middleware

import (
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CORS() gin.HandlerFunc {
	config := cors.Config{
		AllowOriginFunc: func(origin string) bool {
			return origin == "http://localhost:3000" ||
				strings.HasSuffix(origin, ".vercel.app")
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
