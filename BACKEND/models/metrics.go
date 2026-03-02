package models

import "time"

// Metrics holds aggregated counters for an ad.

type Metrics struct {
	AdID        string    `bson:"adId" json:"adId"`
	Impressions int64     `bson:"impressions" json:"impressions"`
	Clicks      int64     `bson:"clicks" json:"clicks"`
	UpdatedAt   time.Time `bson:"updatedAt" json:"updatedAt"`
}
