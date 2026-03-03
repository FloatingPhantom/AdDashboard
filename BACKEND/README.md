# Ad Backend (Go)

This directory contains a simple REST API server implemented in Go using the Gin framework. It powers the ad management dashboard with the following capabilities:

- CRUD operations for ads persisted in MongoDB
- Fixed total account balance ($5,000) enforced when creating new ads
- Ads now include `type` (image or video) and a destination `url`; pricing is $1 per click for banner/image ads and $2 per click for video ads
- Each ad tracks its own daily balance which is decremented when click events are processed
- Ad scheduling (start/end times)
- Geofencing metadata

All state (ads and metrics) is stored in MongoDB. There is no in-process data store; metrics flow through Kafka into Mongo and are queried directly from there.

## Running the server

```bash
cd BACKEND
go mod tidy         # fetch dependencies
go run main.go      # start server on http://localhost:8080
```

## Endpoints

The `/metrics/:id` response now also returns `spend` (clicks × price) and current `balance` remaining on the ad.  Click events automatically deduct from the ad's balance when Kafka messages are consumed.

## Endpoints

| Method | Path               | Description                                 |
|--------|--------------------|---------------------------------------------|
| GET    | /ads               | List all ads                                |
| POST   | /ads               | Create a new ad                             |
| GET    | /ads/:id           | Retrieve a single ad                        |
| PUT    | /ads/:id           | Update an existing ad                       |
| DELETE | /ads/:id           | Delete an ad                                |
| POST   | /events/impression | Track an impression (ad rendered)           |
| POST   | /events/click      | Track a click                               |
| GET    | /metrics/:id       | Fetch aggregated "big four" metrics        |

The ingestion endpoints send messages to Kafka topics (`impressions`, `clicks`). A background consumer aggregates counts into MongoDB. The metrics route reads from Mongo and computes CTR/CPC, enabling the React dashboard to poll for updated statistics.

## Scalability

Traffic flows through Kafka so the service can handle millions of events per day without blocking the primary database. Mongo stores only aggregated counters.

### Payload example (create/edit)

```json
{
  "name": "Spring Sale",
  "dailyLimit": 50,
  "status": "Active",
  "startDate": "2026-03-02T00:00:00Z",
  "endDate": "2026-03-10T00:00:00Z",
  "geofences": ["US", "CA"]
}
```

`dailyLimit` must not exceed remaining capacity calculated from other active ads.

## Notes

- To incorporate real scheduling/geofencing logic (e.g. filtering ads to show based on request time/coordinate), extend the handlers accordingly.
- For persistence, replace the in-memory store with a database implementation.
