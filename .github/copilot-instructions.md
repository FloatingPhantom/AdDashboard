# MyRik Ad Management Platform - AI Coding Guide

## Architecture Overview

**MyRik** is a full-stack ad management dashboard with three independent layers:

1. **Frontend** (React + React Router)  
   - SPA with two main routes: `/` (inventory) and `/ads/:id` (metrics)  
   - State management via React hooks; no Redux/MobX
   - All backend calls via `src/api.js` (single entry point for HTTP)

2. **Backend** (Go + Gin)  
   - REST API on `localhost:8080`
   - Interface-based design: `storage.AdsStore` is implemented by `MongoAdsStore`
   - No in-memory cache; all data persists to Mongo immediately

3. **Infrastructure** (Kafka + MongoDB)  
   - **Kafka (localhost:9092)**: Event queue for impressions/clicks  
   - **MongoDB (localhost:27017)**: Persistence layer for ads & metrics  
   - **Docker Compose** in `KAFKA/` directory manages all services

## Critical Data Flow

```
Frontend → Backend HTTP → Kafka (async producer)
                       ↓
                Kafka Consumer (background goroutine)
                       ↓
                    MongoDB (atomic increment)
                       ↓
Frontend polls /metrics/:id ← reads aggregated counts from Mongo
```

**Fire-and-forget tracking**: `trackImpression()` and `trackClick()` in `AdInventory.js` don't wait for response.

## Backend File Organization

```
BACKEND/
├── main.go              # Entrypoint; initializes Mongo, Kafka, Gin router
├── handlers/
│   ├── ads.go          # CRUD routes: /ads GET/POST/PUT/DELETE/:id
│   └── events.go       # Tracking routes: /events/impression, /events/click + /metrics/:id
├── storage/
│   ├── storage.go      # AdsStore interface definition
│   ├── mongo_ads.go    # Implements AdsStore for ads persistence
│   └── metrics.go      # MetricsStore for Mongo metrics aggregation
└── models/
    ├── ad.go           # Ad struct with bson/json tags
    └── metrics.go      # Metrics struct for aggregated counters
```

**Key pattern**: All storage operations use interfaces defined in `storage.go`. No in-memory stores—`mongoAds` is the only implementation used.

## Frontend File Organization

```
src/
├── App.js                    # Router + state management (ads list, modals)
├── api.js                    # HTTP client; all endpoints call localhost:8080
├── components/
│   ├── BudgetHeader.js       # Shows total balance & remaining capacity
│   ├── AdInventory.js        # Table of ads; calls trackImpression on render
│   ├── AdMetrics.js          # Metrics page; fetches /metrics/:id
│   ├── AdFormModal.js        # Create/edit ad form
│   └── ConfirmDeleteModal.js # Delete confirmation
└── index.css                 # Tailwind directives
```

**Routing via React Router**: Ad names are `<Link>` to `/ads/:id`; click fires `trackClick()` event.

## Critical Conventions

### Go Backend
- **Error handling**: Errors returned, not panicked (see handlers for patterns)
- **Timeout contexts**: All Mongo operations use 5-second timeouts
- **CORS**: Middleware allows `*` origin for development
- **Event field mapping**: Kafka topic names (`impressions`, `clicks`) converted to singular form (`impression`, `click`) before Mongo increment
- **Config values**: 
  - MongoDB URI: `mongodb://admin:password@localhost:27017`
  - Kafka brokers: `["localhost:9092"]`
  - Database: `adbackend`
  - Collections: `ads`, `ad_metrics`

### React Frontend
- **API abstractions**: Never call `fetch()` directly outside `api.js`
- **Async in handlers**: Form submissions and CRUD use `async/await` with try-catch
- **Ad balance math**: `remainingCapacity = 5000 - sum(active_ad.dailyLimit)` (account‑level cap)
- **Billing**: clicks deduct from ad-specific `balance`, cost dependent on ad `type` (image=$1, video=$2).
- **Billing**: clicks deduct from ad-specific `balance`, cost dependent on ad `type`.
- **Validation on Create**: Block if `dailyLimit > remainingCapacity`; edit is unrestricted
- **Red flag styling**: Daily limit of `0` renders in red text

### Shared Conventions
- Ad ID: UUID string (generated via `google/uuid` in Go)
- Timestamps: RFC3339/ISO8601 for JSON serialization
- Status field: `"Active"` or `"Paused"`
- Start/End dates: Omitted if null; stored as pointers in Go

## Developer Workflows

### Local Setup
```bash
# Terminal 1: Infrastructure
cd KAFKA
docker-compose up -d

# Terminal 2: Backend
cd BACKEND
go mod tidy                    # ensures dependencies are resolved
go build ./...                 # compile all packages
go run main.go                 # start server on :8080 (check main.go for actual port)

# Terminal 3: Frontend
npm install
npm start                      # starts on http://localhost:3000
```

### Testing Event Flow
```bash
# Create ad (copy returned id)
curl -X POST http://localhost:8080/ads \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","dailyLimit":50}'

# Track impression
curl -X POST http://localhost:8080/events/impression \
  -H "Content-Type: application/json" \
  -d '{"adId":"<copied-id>"}'

# Verify aggregation (1-2s delay for Kafka consumer)
curl http://localhost:8080/metrics/<copied-id>
```

### Build & Deploy
- **Frontend build**: `npm run build` outputs to `build/`
- **Backend build**: `go build ./...` creates `ad.exe` (executable name)

## Integration Points

### Frontend → Backend
- `api.js` centralizes all HTTP calls
- All API calls relative to `BASE_URL = 'http://localhost:8080'` (backend also runs on 8080)
- Error handling: thrown errors caught in handlers, displayed via `alert()` or state

### Backend → Kafka
- `sarama.SyncProducer` sends to topics `impressions` and `clicks`
- Payload: `{"adId":"uuid","time":timestamp}`
- Fire-and-forget from API perspective (202 Accepted returned immediately)

### Kafka → MongoDB
- Background consumer starts at app init (`go startConsumer(...)`)
- Reads from both topics; converts topic name to event type
- Increments counters atomically: `$inc: {impressions: 1}` or `{clicks: 1}`
- Upserts document if missing; updates timestamp on every event

## Known Issues & Maintenance Notes

- **Port note**: both frontend proxy and backend use port 8080; no mismatch present.
- **README.txt** already references port 8080; ensure it matches the running service.
- **No persistence on failure**: If metrics consumer crashes, Kafka messages remain queued but aren't processed until consumer restarts.
- **Scaling consideration**: Single Kafka consumer processes both `impressions` and `clicks` serially; for 10M/day, consider consumer groups & partitioning.

## When Modifying Each Layer

### Adding a new CRUD field to Ads
1. Update `models/ad.go` struct with `json` and `bson` tags
2. Update `handlers/ads.go` input validation if needed
3. Frontend form in `AdFormModal.js` to handle new field

### Adding a new tracking metric
1. Add field to `models/metrics.go`
2. Update `storage/metrics.go` `Increment()` to handle new event type
3. Update `handlers/events.go` `RegisterMetricsRoute` to compute/return new metric
4. Frontend `AdMetrics.js` to display new metric card

### Debugging
- **Mongo**: Check collections with Mongo Express on `localhost:8082`
- **Kafka**: Use Kafka UI on `localhost:8081` to inspect topics/messages
- **Go logs**: Check console output; `log.Printf` statements in handlers, consumer
- **React**: Browser DevTools; check `api.js` network tab for failed requests
