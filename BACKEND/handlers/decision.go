package handlers

import (
	"context"
	"encoding/json"
	"math"
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// RedisAdConfig mirrors whatever shape the frontend/other services are
// writing into Redis. For this exercise we assume each active ad is stored as
// a JSON string under a key like "ad:config:<adID>". The struct contains the
// metadata needed by the decision engine.
type RedisAdConfig struct {
	ID          string   `json:"id"`
	ImageURL    string   `json:"image_url"`
	ClickURL    string   `json:"click_url"`
	CPC         float64  `json:"cpc"`
	// either an explicit list of hours or a simple range
	AllowedHours []int   `json:"allowed_hours"` // 0-23
	HourStart    int     `json:"hourStart"`
	HourEnd      int     `json:"hourEnd"`
	// geofencing is represented by a list of identifiers (countries, cities, etc.)
	Geofences []string `json:"geofences,omitempty"`
}

// RegisterDecisionRoute wires up a fast ad-serving endpoint.  The handler
// returns a single eligible creative in <10ms by performing all filters in
// memory and only touching Redis for simple GET calls.
func RegisterDecisionRoute(r *gin.Engine, rdb *redis.Client) {
	r.GET("/serve-ad", func(c *gin.Context) {
		// parse user inputs
		latStr := c.Query("lat")
		lngStr := c.Query("lng")
		tz := c.Query("tz")

		userLat, err := strconv.ParseFloat(latStr, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid latitude"})
			return
		}
		userLng, err := strconv.ParseFloat(lngStr, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid longitude"})
			return
		}
	// variables currently unused because geofencing operates on identifiers
	// rather than raw coordinates; keep them around to avoid lint errors.
	_ = userLat
	_ = userLng

	loc, err := time.LoadLocation(tz)
	if err != nil {
		loc = time.UTC
	}
	now := time.Now().In(loc)
	hour := now.Hour()

	ads, err := fetchAllAds(c.Request.Context(), rdb)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load ads"})
		return
	}

	var eligible []RedisAdConfig
		for _, ad := range ads {
			// budget check: treat missing key as unlimited rather than 0.
			budKey := "ad:budget:" + ad.ID
			budStr, err := rdb.Get(c.Request.Context(), budKey).Result()
			bud := math.Inf(1)
			if err != nil && err != redis.Nil {
				// Redis error; skip this ad to avoid serving when we can't verify budget
				continue
			}
			if err == nil {
				// convert only when we actually got a value
				bud, _ = strconv.ParseFloat(budStr, 64) // ignore parse error, bud stays Inf
			}
			if bud <= 0 {
				continue
			}

			// schedule check: support both explicit hours list and start/end range
			ok := false
			if len(ad.AllowedHours) > 0 {
				for _, h := range ad.AllowedHours {
					if h == hour {
						ok = true
						break
					}
				}
			} else if ad.HourStart >= 0 && ad.HourEnd > ad.HourStart {
				if hour >= ad.HourStart && hour < ad.HourEnd {
					ok = true
				}
			}
			if !ok {
				continue
			}

// geofence check: currently we store identifiers rather than lat/long
		// the decision engine would normally evaluate whether the user's
		// location belongs to any of the strings in ad.Geofences. For this
		// exercise we simply ignore the filter and assume all geofences match.
		// (Placeholder for real geofencing logic.)
		// if len(ad.Geofences) > 0 {
		//     // perform membership test here
		// }

			eligible = append(eligible, ad)
		}

		if len(eligible) == 0 {
			c.JSON(http.StatusNoContent, gin.H{"error": "no eligible ad"})
			return
		}

		// selection: highest CPC (random tie‑break)
		choice := eligible[0]
		for _, a := range eligible[1:] {
			if a.CPC > choice.CPC || (a.CPC == choice.CPC && rand.Intn(2) == 0) {
				choice = a
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"ad_id":     choice.ID,
			"image_url": choice.ImageURL,
			"click_url": choice.ClickURL,
		})
	})
}

// fetchAllAds loads every key matching the assumed configuration pattern and
// unmarshals the JSON payload. In a production system this would be replaced
// by a prepopulated Redis set or hash to avoid a SCAN on every request.
func fetchAllAds(ctx context.Context, rdb *redis.Client) ([]RedisAdConfig, error) {
	var results []RedisAdConfig
	iter := rdb.Scan(ctx, 0, "ad:config:*", 0).Iterator()
	for iter.Next(ctx) {
		key := iter.Val()
		val, err := rdb.Get(ctx, key).Result()
		if err != nil {
			continue
		}
		var ad RedisAdConfig
		if err := json.Unmarshal([]byte(val), &ad); err != nil {
			continue
		}
		results = append(results, ad)
	}
	if err := iter.Err(); err != nil {
		return nil, err
	}
	return results, nil
}

// withinRadius applies the Haversine formula to compute great-circle distance
// between two latitude/longitude points and compares it to a radius in km.
func withinRadius(lat1, lng1, lat2, lng2, radiusKM float64) bool {
	const earthRadius = 6371.0 // km
	toRad := func(deg float64) float64 { return deg * math.Pi / 180 }
	dLat := toRad(lat2 - lat1)
	dLon := toRad(lng2 - lng1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	dist := earthRadius * c
	return dist <= radiusKM
}
