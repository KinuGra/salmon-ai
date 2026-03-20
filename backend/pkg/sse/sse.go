package sse

import "github.com/gin-gonic/gin"

func SetHeaders(c *gin.Context) {
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
}

func Send(c *gin.Context, data string) {
	c.SSEvent("message", data)
	c.Writer.Flush()
}
