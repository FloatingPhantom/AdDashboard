package models

// Ad represents an advertisement record
// Includes metadata for scheduling and geofencing.

type Ad struct {
	ID         string  `json:"id" bson:"id"`
	Name       string  `json:"name" bson:"name"`
	DailyLimit float64 `json:"dailyLimit" bson:"dailyLimit"`

	// Scheduling fields: use hour range within the day (0-24). The decision
	// engine will expand this range into allowed hours or use it directly when
	// loading from Redis.
	HourStart int `json:"hourStart" bson:"hourStart"` // inclusive 0-23
	HourEnd   int `json:"hourEnd" bson:"hourEnd"`     // exclusive 1-24

	// Geofencing: simple list of location identifiers (e.g. country codes, city names, or geojson strings)
	Geofences []string `json:"geofences,omitempty" bson:"geofences,omitempty"`

	// new billing fields
	Type string `json:"type" bson:"type"` // "image" or "video"
	URL  string `json:"url" bson:"url"`
	// remaining money for the day, decremented per click
	Balance float64 `json:"balance" bson:"balance"`
}
