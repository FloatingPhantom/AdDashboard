package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/Shopify/sarama"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"myrik.com/ad/handlers"
	"myrik.com/ad/storage"
)

func main() {
	// 1. Mongo client setup
	ctxMongo, cancelMongo := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelMongo()

	client, err := mongo.Connect(ctxMongo, options.Client().ApplyURI("mongodb://admin:password@localhost:27017"))
	if err != nil {
		log.Fatalf("mongo connect: %v", err)
	}

	// Check connection immediately to fail fast if credentials are wrong
	if err := client.Ping(ctxMongo, nil); err != nil {
		log.Fatalf("mongo ping failed - check credentials and connection: %v", err)
	}

	db := client.Database("adbackend")
	metricsStore := storage.NewMetricsStore(db)

	// Mongo-backed ads store
	mongoAds := storage.NewMongoAdsStore(db)
	var store storage.AdsStore = mongoAds

	// 2. Kafka producer setup
	kafkaBrokers := []string{"localhost:9092"}
	prodCfg := sarama.NewConfig()
	prodCfg.Producer.Return.Successes = true
	producer, err := sarama.NewSyncProducer(kafkaBrokers, prodCfg)
	if err != nil {
		log.Fatalf("kafka producer: %v", err)
	}
	defer producer.Close()

	// 3. Redis client for real‑time budget & decision engine
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
	if err := rdb.Ping(ctxMongo).Err(); err != nil {
		log.Fatalf("redis ping: %v", err)
	}

	// 3. Graceful Shutdown Primitives
	ctx, cancel := context.WithCancel(context.Background())
	var wg sync.WaitGroup

	// 4. Start consumer goroutine
	wg.Add(1)
	go startConsumer(ctx, &wg, kafkaBrokers, metricsStore, store)

	// 5. Gin Router Setup
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

	handlers.RegisterEventRoutes(r, producer, store, rdb)
	handlers.RegisterAdRoutes(r, store)
	handlers.RegisterMetricsRoute(r, metricsStore, store)
	handlers.RegisterDecisionRoute(r, rdb)

	// 6. Explicit HTTP Server (required for graceful shutdown)
	srv := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	// Start server in a background goroutine
	go func() {
		fmt.Println("server listening on :8080")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	// 7. Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	// kill (no param) default send syscall.SIGTERM
	// kill -2 is syscall.SIGINT (Ctrl+C)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	<-quit // Block here until a signal is received
	log.Println("Termination signal received. Shutting down server...")

	// 8. Cancel the context! This tells the Kafka consumer loop to exit.
	cancel()

	// 9. Shut down the HTTP server gracefully (wait for active requests to finish)
	ctxShutdown, cancelShutdown := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelShutdown()
	if err := srv.Shutdown(ctxShutdown); err != nil {
		log.Fatal("Server forced to shutdown: ", err)
	}

	// 10. Wait for the Kafka consumer to finish committing its final offsets
	log.Println("Waiting for Kafka consumer to commit final offsets...")
	wg.Wait()

	log.Println("Server exited cleanly.")
}
