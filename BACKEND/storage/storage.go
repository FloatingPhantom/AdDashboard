package storage

import (
	"errors"
	"sync"

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

// InMemoryStore holds ads in a thread-safe map

type InMemoryStore struct {
	mu  sync.RWMutex
	ads map[string]*models.Ad
}

func NewInMemoryStore() *InMemoryStore {
	return &InMemoryStore{ads: make(map[string]*models.Ad)}
}

func (s *InMemoryStore) List() []*models.Ad {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]*models.Ad, 0, len(s.ads))
	for _, a := range s.ads {
		result = append(result, a)
	}
	return result
}

func (s *InMemoryStore) Get(id string) (*models.Ad, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	ad, ok := s.ads[id]
	if !ok {
		return nil, ErrNotFound
	}
	return ad, nil
}

// Create stores a new ad. Returns an error if operation fails.
func (s *InMemoryStore) Create(ad *models.Ad) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ads[ad.ID] = ad
	return nil
}

func (s *InMemoryStore) Update(ad *models.Ad) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.ads[ad.ID]; !ok {
		return ErrNotFound
	}
	s.ads[ad.ID] = ad
	return nil
}

func (s *InMemoryStore) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.ads[id]; !ok {
		return ErrNotFound
	}
	delete(s.ads, id)
	return nil
}
