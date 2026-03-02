package main

import (
	"context"
	"encoding/json"
	"log"

	"github.com/Shopify/sarama"
	"myrik.com/ad/storage" // Ensure this path matches your module
)

// 1. We create a struct to hold our dependencies and handle the messages
type metricsConsumer struct {
	ms *storage.MetricsStore
}

// Setup is run at the beginning of a new session, before ConsumeClaim
func (c *metricsConsumer) Setup(sarama.ConsumerGroupSession) error {
	return nil
}

// Cleanup is run at the end of a session, once all ConsumeClaim goroutines have exited
func (c *metricsConsumer) Cleanup(sarama.ConsumerGroupSession) error {
	return nil
}

// ConsumeClaim must start a consumer loop of ConsumerGroupClaim's Messages().
func (c *metricsConsumer) ConsumeClaim(session sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
	for msg := range claim.Messages() {
		topic := msg.Topic
		log.Printf("[Kafka] Received %s event | Partition: %d | Offset: %d", topic, msg.Partition, msg.Offset)

		var evt struct {
			AdID string `json:"adId"`
		}

		// Parse the event
		if err := json.Unmarshal(msg.Value, &evt); err != nil {
			log.Printf("[Kafka] ERROR unmarshaling %s event: %v", topic, err)
		} else {
			eventType := topic[:len(topic)-1] // 'impressions' -> 'impression'

			// Increment metric in MongoDB
			err := c.ms.Increment(evt.AdID, eventType)
			if err != nil {
				log.Printf("[Metrics] ERROR saving to MongoDB for AdID %s: %v", evt.AdID, err)
			} else {
				log.Printf("[Metrics] Incremented %s for AdID: %s", eventType, evt.AdID)
			}
		}

		// THE MAGIC FIX: Mark the message as processed!
		// This tells Kafka to commit the offset so we never read this message again.
		session.MarkMessage(msg, "")
	}

	return nil
}

// 2. Updated startConsumer function
func startConsumer(brokers []string, ms *storage.MetricsStore) {
	cfg := sarama.NewConfig()
	// This only applies the VERY first time the consumer group starts.
	// After that, it relies on the committed offsets.
	cfg.Consumer.Offsets.Initial = sarama.OffsetOldest

	// This ID is how Kafka identifies this specific consumer.
	// Changing this ID will cause it to read from the beginning again!
	groupID := "ad-metrics-processor"

	cg, err := sarama.NewConsumerGroup(brokers, groupID, cfg)
	if err != nil {
		log.Fatalf("[Kafka] Consumer group creation failed: %v", err)
	}

	consumer := &metricsConsumer{ms: ms}
	topics := []string{"impressions", "clicks"}

	// Run the consumer in the background
	go func() {
		for {
			// Consume joins the cluster, syncs state, and processes messages.
			// It blocks until a rebalance happens or context is canceled.
			err := cg.Consume(context.Background(), topics, consumer)
			if err != nil {
				log.Printf("[Kafka] Error from consumer group: %v", err)
			}
		}
	}()

	log.Printf("[Kafka] Started Consumer Group '%s' for topics: %v", groupID, topics)
}
