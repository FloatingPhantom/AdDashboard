package storage

import (
	"errors"

	"myrik.com/ad/models"
)

var (
	ErrNotFound = errors.New("ad not found")
)

// AdsStore defines persistence operations for ads.
type AdsStore interface {
	List() []*models.Ad
	Get(id string) (*models.Ad, error)
	Create(ad *models.Ad) error
	Update(ad *models.Ad) error
	Delete(id string) error
}
