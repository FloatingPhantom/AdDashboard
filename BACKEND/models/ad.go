package models

import (
	"time"
)

// Ad represents an advertisement record
// Includes metadata for scheduling and geofencing.

type Ad struct {
	ID         string  `json:"id" bson:"id"`
	Name       string  `json:"name" bson:"name"`
	Status     string  `json:"status" bson:"status"` // "Active" or "Paused"
	DailyLimit float64 `json:"dailyLimit" bson:"dailyLimit"`

	// Scheduling fields
	StartDate *time.Time `json:"startDate,omitempty" bson:"startDate,omitempty"`
	EndDate   *time.Time `json:"endDate,omitempty" bson:"endDate,omitempty"`

	// Geofencing: simple list of location identifiers (e.g. country codes, city names, or geojson strings)
	Geofences []string `json:"geofences,omitempty" bson:"geofences,omitempty"`

	// new billing fields
	Type string `json:"type" bson:"type"` // "image" or "video"
	URL  string `json:"url" bson:"url"`
	// remaining money for the day, decremented per click
	Balance float64 `json:"balance" bson:"balance"`
}
