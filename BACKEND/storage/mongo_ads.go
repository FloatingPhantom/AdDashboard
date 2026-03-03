package storage

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"myrik.com/ad/models"
)

type MongoAdsStore struct {
	col *mongo.Collection
}

func NewMongoAdsStore(db *mongo.Database) *MongoAdsStore {
	col := db.Collection("ads")
	// ensure unique index on id
	idx := mongo.IndexModel{
		Keys:    bson.D{{Key: "id", Value: 1}},
		Options: options.Index().SetUnique(true),
	}
	col.Indexes().CreateOne(context.Background(), idx)
	return &MongoAdsStore{col: col}
}

func (m *MongoAdsStore) List() []*models.Ad {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cur, err := m.col.Find(ctx, bson.M{})
	if err != nil {
		return []*models.Ad{}
	}
	defer cur.Close(ctx)
	var res []*models.Ad
	for cur.Next(ctx) {
		var a models.Ad
		if err := cur.Decode(&a); err == nil {
			res = append(res, &a)
		}
	}
	return res
}

func (m *MongoAdsStore) Get(id string) (*models.Ad, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var a models.Ad
	err := m.col.FindOne(ctx, bson.M{"id": id}).Decode(&a)
	if err == mongo.ErrNoDocuments {
		return nil, ErrNotFound
	}
	return &a, err
}

func (m *MongoAdsStore) Create(ad *models.Ad) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := m.col.InsertOne(ctx, ad)
	return err
}

func (m *MongoAdsStore) Update(ad *models.Ad) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	res, err := m.col.ReplaceOne(ctx, bson.M{"id": ad.ID}, ad)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return ErrNotFound
	}
	return nil
}

func (m *MongoAdsStore) Delete(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	res, err := m.col.DeleteOne(ctx, bson.M{"id": id})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return ErrNotFound
	}
	return nil
}

// Charge deducts a positive amount from the ad's balance. It uses an atomic
// $inc to ensure concurrent safety and returns ErrNotFound if the ad
// doesn't exist.
func (m *MongoAdsStore) Charge(id string, amount float64) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	res, err := m.col.UpdateOne(ctx,
		bson.M{"id": id},
		bson.M{"$inc": bson.M{"balance": -amount}},
	)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return ErrNotFound
	}
	return nil
}
