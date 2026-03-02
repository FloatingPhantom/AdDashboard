package storage

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"myrik.com/ad/models"
)

// MetricsStore handles metrics persistence in MongoDB.

type MetricsStore struct {
	col *mongo.Collection
}

func NewMetricsStore(db *mongo.Database) *MetricsStore {
	col := db.Collection("ad_metrics")
	// ensure index on adId
	idx := mongo.IndexModel{
		Keys:    bson.D{{Key: "adId", Value: 1}},
		Options: options.Index().SetUnique(true),
	}
	col.Indexes().CreateOne(context.Background(), idx)
	return &MetricsStore{col: col}
}

func (s *MetricsStore) Increment(adID string, event string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	update := bson.M{
		"$setOnInsert": bson.M{"adId": adID, "updatedAt": time.Now()},
	}
	if event == "impression" {
		update["$inc"] = bson.M{"impressions": 1}
	} else if event == "click" {
		update["$inc"] = bson.M{"clicks": 1}
	}
	update["$set"] = bson.M{"updatedAt": time.Now()}
	_, err := s.col.UpdateOne(ctx, bson.M{"adId": adID}, update, options.Update().SetUpsert(true))
	return err
}

func (s *MetricsStore) Get(adID string) (*models.Metrics, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var m models.Metrics
	err := s.col.FindOne(ctx, bson.M{"adId": adID}).Decode(&m)
	if err == mongo.ErrNoDocuments {
		// return empty metrics
		return &models.Metrics{AdID: adID}, nil
	}
	return &m, err
}
