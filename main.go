package main

import (
	"log"
	"os"
	//"github.com/gin-gonic/gin"
	//"github.com/spenserw/aggregor"
)

func main() {
	port := os.Getenv("PORT")

	if port == "" {
		log.Fatal("$PORT must be set")
	}

	router := gin.New()
	router.Use(gin.Logger())

	router.GET("/", func(c *gin.Context) {
		c.String(200, "%s", "Hello, World!")
	})

	router.Run(":" + port)
}
