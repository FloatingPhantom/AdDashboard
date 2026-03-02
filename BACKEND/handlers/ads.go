package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"myrik.com/ad/models"
	"myrik.com/ad/storage"
)

const MaxBalance = 5000.0

// calculateRemaining returns remaining capacity based on active ads' daily limits
func calculateRemaining(ads []*models.Ad) float64 {
	var sum float64
	for _, a := range ads {
		if a.Status == "Active" {
			sum += a.DailyLimit
		}
	}
	return MaxBalance - sum
}

func RegisterAdRoutes(r *gin.Engine, store storage.AdsStore) {
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
			remaining := calculateRemaining(store.List())
			if input.DailyLimit > remaining {
				c.JSON(http.StatusBadRequest, gin.H{"error": "daily limit exceeds remaining capacity"})
				return
			}
			input.ID = uuid.NewString()
			if input.Status == "" {
				input.Status = "Active"
			}
			now := time.Now()
			if input.StartDate == nil {
				input.StartDate = &now
			}
			if err := store.Create(&input); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
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
			existing.Name = input.Name
			existing.DailyLimit = input.DailyLimit
			existing.Status = input.Status
			existing.StartDate = input.StartDate
			existing.EndDate = input.EndDate
			existing.Geofences = input.Geofences

			if err := store.Update(existing); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, existing)
		})

		ads.DELETE("/:id", func(c *gin.Context) {
			id := c.Param("id")
			if err := store.Delete(id); err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
				return
			}
			c.Status(http.StatusNoContent)
		})
	}
}
