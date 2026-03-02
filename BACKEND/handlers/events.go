package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/Shopify/sarama"
	"github.com/gin-gonic/gin"
	"myrik.com/ad/models"
	"myrik.com/ad/storage"
)

// We'll send simple JSON messages to Kafka with adId and timestamp

type eventMessage struct {
	AdID string `json:"adId"`
	Time int64  `json:"time"`
}

func RegisterEventRoutes(r *gin.Engine, producer sarama.SyncProducer) {
	ev := r.Group("/events")
	{
		ev.POST("/impression", func(c *gin.Context) {
			var body models.Metrics // using same struct for simplicity
			if err := c.ShouldBindJSON(&body); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			payload, _ := json.Marshal(eventMessage{AdID: body.AdID, Time: time.Now().Unix()})
			msg := &sarama.ProducerMessage{
				Topic: "impressions",
				Value: sarama.ByteEncoder(payload),
			}
			if _, _, err := producer.SendMessage(msg); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.Status(http.StatusAccepted)
		})

		ev.POST("/click", func(c *gin.Context) {
			var body models.Metrics
			if err := c.ShouldBindJSON(&body); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			payload, _ := json.Marshal(eventMessage{AdID: body.AdID, Time: time.Now().Unix()})
			msg := &sarama.ProducerMessage{
				Topic: "clicks",
				Value: sarama.ByteEncoder(payload),
			}
			if _, _, err := producer.SendMessage(msg); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.Status(http.StatusAccepted)
		})
	}
}

func RegisterMetricsRoute(r *gin.Engine, ms *storage.MetricsStore, adStore storage.AdsStore) {
	r.GET("/metrics/:id", func(c *gin.Context) {
		id := c.Param("id")
		m, err := ms.Get(id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		// compute CTR
		ctr := 0.0
		if m.Impressions > 0 {
			ctr = float64(m.Clicks) / float64(m.Impressions) * 100
		}
		// compute CPC using ad's daily limit if available
		cpc := 0.0
		if m.Clicks > 0 {
			if ad, err := adStore.Get(id); err == nil {
				if ad.DailyLimit > 0 {
					cpc = ad.DailyLimit / float64(m.Clicks)
				}
			}
		}
		c.JSON(http.StatusOK, gin.H{
			"adId":        m.AdID,
			"impressions": m.Impressions,
			"clicks":      m.Clicks,
			"ctr":         ctr,
			"cpc":         cpc,
			"updatedAt":   m.UpdatedAt,
		})
	})
}
