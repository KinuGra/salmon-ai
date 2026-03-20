package middleware

import "github.com/gin-gonic/gin"

func MockAuth(userID uint) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("userID", userID)
		c.Next()
	}
}
