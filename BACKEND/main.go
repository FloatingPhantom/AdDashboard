package main

import (
	"context"
	"encoding/json"
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

func startConsumer(brokers []string, ms *storage.MetricsStore) {
	cfg := sarama.NewConfig()
	cfg.Consumer.Return.Errors = true

	consumer, err := sarama.NewConsumer(brokers, cfg)
	if err != nil {
		log.Fatalf("[Kafka] Consumer creation failed: %v", err)
	}

	topics := []string{"impressions", "clicks"}
	for _, topic := range topics {
		partitions, err := consumer.Partitions(topic)
		if err != nil {
			// NOTE: If topics are auto-created by the producer, this might fail on startup
			// if no messages have been sent yet.
			log.Printf("[Kafka] WARNING: Failed to get partitions for topic '%s': %v", topic, err)
			continue
		}

		log.Printf("[Kafka] Started consuming topic '%s' across %d partitions", topic, len(partitions))

		for _, p := range partitions {
			pc, err := consumer.ConsumePartition(topic, p, sarama.OffsetOldest)
			if err != nil {
				log.Printf("[Kafka] Failed to start consumer for %s (partition %d): %v", topic, p, err)
				continue
			}

			// Launch a goroutine for each partition
			go func(pc sarama.PartitionConsumer, topic string, partition int32) {
				log.Printf("[Kafka] Listening to %s (partition %d)", topic, partition)

				for {
					select {
					case msg, ok := <-pc.Messages():
						if !ok {
							log.Printf("[Kafka] Message channel closed for %s (partition %d)", topic, partition)
							return
						}

						log.Printf("[Kafka] Received %s event | Offset: %d | Payload: %s", topic, msg.Offset, string(msg.Value))

						var evt struct {
							AdID string `json:"adId"`
						}

						if err := json.Unmarshal(msg.Value, &evt); err != nil {
							log.Printf("[Kafka] ERROR unmarshaling %s event: %v | Payload: %s", topic, err, string(msg.Value))
							continue // Skip this message and keep processing
						}

						eventType := topic[:len(topic)-1] // 'impressions' -> 'impression'

						// Increment metric
						err := ms.Increment(evt.AdID, eventType)
						if err != nil {
							log.Printf("[Metrics] ERROR saving to MongoDB for AdID %s: %v", evt.AdID, err)
						} else {
							log.Printf("[Metrics] Incremented %s for AdID: %s", eventType, evt.AdID)
						}

					case err, ok := <-pc.Errors():
						if !ok {
							log.Printf("[Kafka] Error channel closed for %s (partition %d)", topic, partition)
							return
						}
						log.Printf("[Kafka] CONSUMER ERROR on %s (partition %d): %v", topic, partition, err)
					}
				}
			}(pc, topic, p)
		}
	}
}
