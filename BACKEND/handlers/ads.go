package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"myrik.com/ad/models"
	"myrik.com/ad/storage"
)

const MaxBalance = 5000.0

// calculateRemaining returns remaining capacity based on all ads' daily limits
func calculateRemaining(ads []*models.Ad) float64 {
	var sum float64
	for _, a := range ads {
		sum += a.DailyLimit
	}
	return MaxBalance - sum
}

// SyncAdToRedis serialises an Ad and writes the configuration and budget
// into Redis.  It's used by the creation handler and by the startup warm‑up
// routine so that the decision engine always has the most recent data.
func SyncAdToRedis(ctx context.Context, rdb *redis.Client, ad *models.Ad) error {

	fmt.Println("SYNC ad started for: ", ad.Name)
	cfg := RedisAdConfig{
		ID:           ad.ID,
		ImageURL:     ad.URL,
		ClickURL:     ad.URL,
		CPC:          1.0, // hard‑coded for now
		AllowedHours: []int{},
		HourStart:    ad.HourStart,
		HourEnd:      ad.HourEnd,
		Geofences:    ad.Geofences,
	}
	// serialise the config
	data, err := json.Marshal(cfg)
	if err != nil {
		return err
	}
	keyCfg := "ad:config:" + ad.ID
	if err := rdb.Set(ctx, keyCfg, data, 0).Err(); err != nil {
		return err
	}
	keyBud := "ad:budget:" + ad.ID
	if err := rdb.Set(ctx, keyBud, fmt.Sprintf("%f", ad.Balance), 0).Err(); err != nil {
		return err
	}
	return nil
}

// WarmUpRedisCache loads every ad stored in MongoDB and pushes it into Redis.
// The "active" filtering logic is trivial here (all ads are treated as active)
// but could be enhanced later when a status field is added.
func WarmUpRedisCache(ctx context.Context, store storage.AdsStore, rdb *redis.Client) error {

	fmt.Println("WARM UP REDIS CACHE STARTED...")
	ads := store.List()
	for _, a := range ads {
		if err := SyncAdToRedis(ctx, rdb, a); err != nil {
			fmt.Println("WARM UP REDIS CACHE ERRRRROOOOORR...")
			return err
		}
	}
	return nil
}

func RegisterAdRoutes(r *gin.Engine, store storage.AdsStore, rdb *redis.Client) {
	ads := r.Group("/ads")
	{
		ads.GET("", func(c *gin.Context) {
			c.JSON(http.StatusOK, store.List())
		})

		ads.POST("", func(c *gin.Context) {
			var input models.Ad
			if err := c.ShouldBindJSON(&input); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			// validation
			if input.DailyLimit < 0 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "daily limit cannot be negative"})
				return
			}
			if input.Type != "image" && input.Type != "video" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "type must be \"image\" or \"video\""})
				return
			}
			// schedule range validation
			if input.HourStart < 0 || input.HourStart > 23 || input.HourEnd < 1 || input.HourEnd > 24 || input.HourStart >= input.HourEnd {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid hour range"})
				return
			}
			remaining := calculateRemaining(store.List())
			if input.DailyLimit > remaining {
				c.JSON(http.StatusBadRequest, gin.H{"error": "daily limit exceeds remaining capacity"})
				return
			}
			// optional: URL may be empty or validate format elsewhere
			input.ID = uuid.NewString()

			// set initial balance equal to the daily limit
			input.Balance = input.DailyLimit
			if err := store.Create(&input); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			// sync the new ad into Redis so the decision engine can pick it up
			if err := SyncAdToRedis(c.Request.Context(), rdb, &input); err != nil {
				// log but don't fail the request; DB is source of truth.
				// in production we'd use structured logging instead of Printf.
				fmt.Printf("warning: failed to sync ad to redis: %v\n", err)
			}
			c.JSON(http.StatusCreated, input)
		})

		ads.GET("/:id", func(c *gin.Context) {
			id := c.Param("id")
			ad, err := store.Get(id)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
				return
			}
			c.JSON(http.StatusOK, ad)
		})

		ads.PUT("/:id", func(c *gin.Context) {
			id := c.Param("id")
			existing, err := store.Get(id)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
				return
			}
			var input models.Ad
			if err := c.ShouldBindJSON(&input); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			// preserve immutable fields
			limitChanged := existing.DailyLimit != input.DailyLimit
			existing.Name = input.Name
			existing.DailyLimit = input.DailyLimit
			existing.HourStart = input.HourStart
			existing.HourEnd = input.HourEnd
			existing.Geofences = input.Geofences
			existing.Type = input.Type
			existing.URL = input.URL
			// only reset balance if daily limit changed
			if limitChanged {
				existing.Balance = input.DailyLimit
			}
			// validate again for update
			if existing.DailyLimit < 0 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "daily limit cannot be negative"})
				return
			}
			if existing.Type != "image" && existing.Type != "video" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "type must be \"image\" or \"video\""})
				return
			}
			// validate updated hour range as well
			if existing.HourStart < 0 || existing.HourStart > 23 || existing.HourEnd < 1 || existing.HourEnd > 24 || existing.HourStart >= existing.HourEnd {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid hour range"})
				return
			}
			// recalc remaining budget when daily limit changed
			remaining := calculateRemaining(store.List())
			if existing.DailyLimit > remaining {
				c.JSON(http.StatusBadRequest, gin.H{"error": "daily limit exceeds remaining capacity"})
				return
			}
			if err := store.Update(existing); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, existing)
		})

		ads.DELETE("/:id", func(c *gin.Context) {
			id := c.Param("id")
			if err := store.Delete(id); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.Status(http.StatusNoContent)
		})
	}
}
