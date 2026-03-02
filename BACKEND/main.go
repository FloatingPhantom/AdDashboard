package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/Shopify/sarama"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"myrik.com/ad/handlers"
	"myrik.com/ad/storage"
)

func main() {
	// Mongo client
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	// Updated with authentication credentials
	client, err := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://admin:password@localhost:27017"))
	if err != nil {
		log.Fatalf("mongo connect: %v", err)
	}
	db := client.Database("adbackend")
	metricsStore := storage.NewMetricsStore(db)

	// Mongo-backed ads store (persist ads in Mongo)
	mongoAds := storage.NewMongoAdsStore(db)
	var store storage.AdsStore = mongoAds

	// Kafka producer
	kafkaBrokers := []string{"localhost:9092"}
	prodCfg := sarama.NewConfig()
	prodCfg.Producer.Return.Successes = true
	producer, err := sarama.NewSyncProducer(kafkaBrokers, prodCfg)
	if err != nil {
		log.Fatalf("kafka producer: %v", err)
	}

	// start consumer goroutine
	go startConsumer(kafkaBrokers, metricsStore)

	r := gin.Default()
	// simple CORS for development
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	handlers.RegisterEventRoutes(r, producer)
	handlers.RegisterAdRoutes(r, store)
	handlers.RegisterMetricsRoute(r, metricsStore, store)

	fmt.Println("server listening on :8080")
	r.Run(":8080") // listen and serve
}
