package main

import (
	"context"
	"encoding/json"
	"log"
	"sync"

	"github.com/Shopify/sarama"
	"myrik.com/ad/storage" // Ensure this path matches your module
)

// 1. We create a struct to hold our dependencies and handle the messages
type metricsConsumer struct {
	ms      *storage.MetricsStore
	adStore storage.AdsStore
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

		var evt struct {
			AdID string `json:"adId"`
		}

		if err := json.Unmarshal(msg.Value, &evt); err != nil {
			log.Printf("[Kafka] ERROR unmarshaling %s event: %v", topic, err)
		} else {
			eventType := topic[:len(topic)-1] // 'impressions' -> 'impression'

			// increment metric
			err := c.ms.Increment(evt.AdID, eventType)
			if err != nil {
				log.Printf("[Metrics] ERROR saving to MongoDB for AdID %s: %v", evt.AdID, err)
			} else {
				log.Printf("[Metrics] Incremented %s for AdID: %s", eventType, evt.AdID)
			}

			// if it's a click, also charge the ad balance
			if eventType == "click" {
				if ad, err := c.adStore.Get(evt.AdID); err == nil {
					cost := 1.0
					if ad.Type == "video" {
						cost = 2.0
					}
					if err := c.adStore.Charge(evt.AdID, cost); err != nil {
						log.Printf("[Billing] failed to charge AdID %s: %v", evt.AdID, err)
					} else {
						log.Printf("[Billing] charged $%.2f for AdID %s", cost, evt.AdID)
					}
				}
			}
		}

		// mark & commit
		session.MarkMessage(msg, "")
		session.Commit()
	}
	return nil
}

// Update the function signature to take a Context and a WaitGroup
func startConsumer(ctx context.Context, wg *sync.WaitGroup, brokers []string, ms *storage.MetricsStore, adStore storage.AdsStore) {
	defer wg.Done() // Tell main we are completely finished when this function exits

	cfg := sarama.NewConfig()
	cfg.Version = sarama.V2_8_0_0
	cfg.Consumer.Offsets.Initial = sarama.OffsetNewest

	// Ensure auto-commit is enabled (it usually is by default, but good to be explicit)
	cfg.Consumer.Offsets.AutoCommit.Enable = true

	groupID := "ad-metrics-processor"

	cg, err := sarama.NewConsumerGroup(brokers, groupID, cfg)
	if err != nil {
		log.Fatalf("[Kafka] Consumer group creation failed: %v", err)
	}
	defer cg.Close() // Ensure the consumer group is cleanly closed

	consumer := &metricsConsumer{ms: ms, adStore: adStore}
	topics := []string{"impressions", "clicks"}

	log.Printf("[Kafka] Started Consumer Group '%s' for topics: %v", groupID, topics)

	// We run the consume loop until the context is canceled
	for {
		// Pass the context into cg.Consume.
		// When the context is canceled, Consume will exit.
		err := cg.Consume(ctx, topics, consumer)
		if err != nil {
			log.Printf("[Kafka] Error from consumer group: %v", err)
		}

		// If the context was canceled, break the loop and exit
		if ctx.Err() != nil {
			log.Println("[Kafka] Consumer loop exiting due to context cancellation...")
			return
		}
	}
}
