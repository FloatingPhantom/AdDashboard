# /serve-ad Decision Engine – Flow Documentation

This document describes the real-time Decision Engine implemented at the `/serve-ad` HTTP endpoint.
It explains inputs, Redis data layout, filtering rules, selection behavior, example request/response, and operational notes.

## Summary
- Endpoint: `GET /serve-ad`
- Purpose: Return a single ad (creative) to display to a user, chosen in real time using Redis-backed state.
- Target latency: sub-10ms request path (in-memory Redis ops + minimal CPU work).

## Inputs (Query Parameters)
- `lat` — user latitude (decimal degrees)
- `lng` — user longitude (decimal degrees)
- `tz` — user's time zone string (IANA format, e.g. `America/New_York`) — used to evaluate local hour for schedule filtering

Example request:

```
GET /serve-ad?lat=40.7128&lng=-74.0060&tz=America/New_York
```

## Redis Data Model (assumptions)
1. Ad configuration objects stored as JSON under keys:
   - `ad:config:<adID>` -> JSON
   - Example JSON shape (used by the Decision Engine):

```json
{
  "id": "ccf73b24-be44-4926-ad97-847be7252760",
  "image_url": "https://cdn.example.com/creative.jpg",
  "click_url": "https://advertiser.example/landing",
  "cpc": 1.0,
  // scheduling is expressed as a start/end hour range
  "hourStart": 8,
  "hourEnd": 18,
  "center_lat": 40.7128,
  "center_lng": -74.0060,
  "radius_km": 50
}
```

2. Real-time remaining budget per ad (float) stored under:
   - `ad:budget:<adID>` -> e.g. `10.0`
   - If key is missing, it is treated as `0` (no budget) by the Decision Engine.

3. (Optional / recommended) Index of active ad ids:
   - `ad:active` -> Redis `SET` or `ZSET` containing `<adID>` for quick enumeration (preferred to `SCAN`).

## Decision Flow (handler logic)
1. Parse and validate `lat`, `lng`, `tz` inputs. Convert `tz` to a `time.Location`; fallback to UTC.
2. Determine user's local hour via `time.Now().In(location).Hour()`.
3. Load candidate ads from Redis:
   - Preferred: `SMEMBERS ad:active` to get IDs, then `MGET`/`pipeline GET` of `ad:config:<id>` values.
   - Fallback (less ideal for large scale): `SCAN` for keys `ad:config:*` and `GET` each value.
4. For each ad config, apply filters (short-circuiting as soon as one fails):
   - Budget filter: fetch `ad:budget:<adID>` and parse float; skip if `<= 0`.
   - Schedule filter: either look for the current hour in `allowed_hours`, or if the config provides `hourStart`/`hourEnd` treat it as a half-open range [start,end) and include when the user's local hour falls within it.
   - Geofence filter: compute great-circle distance using Haversine formula between user (`lat`,`lng`) and ad's (`center_lat`,`center_lng`); skip if distance > `radius_km`.
5. Collect all eligible ads into an in-memory slice.
6. Selection strategy:
   - Primary: choose the ad with the highest `cpc`.
   - Tie-breaker: random pick among equal‑CPC candidates.
   - Alternative strategies (not currently implemented): weighted random by `cpc`, priority score including historical CTR, etc.
7. Return a small JSON response with the creative fields needed by the client:

```json
{
  "ad_id": "<adID>",
  "image_url": "https://...",
  "click_url": "https://..."
}
```

If no eligible ad is found, the endpoint returns HTTP `204 No Content` (or `200` with an empty payload depending on integration requirements).

## Example (based on user-provided ad list)
Given the single ad in your list:

```json
{
  "id": "ccf73b24-be44-4926-ad97-847be7252760",
  "name": "Shubh sale",
  "dailyLimit": 10,
  "startDate": "2026-03-03T00:00:00Z",
  "endDate": "2026-03-05T00:00:00Z",
  "type": "image",
  "url": "https://shubh.com",
  "balance": 10
}
```

Assume the matching Redis config for this ad (`ad:config:ccf73b24-...`) contains a geofence centered near the user's location, and `ad:budget:ccf73b24-...` is `10.0`.

- Request: `GET /serve-ad?lat=40.7128&lng=-74.0060&tz=America/New_York`
- If local hour satisfies the schedule (either via `allowed_hours` or `hourStart`/`hourEnd`) and the user is within `radius_km`, the engine will return:

```json
{
  "ad_id": "ccf73b24-be44-4926-ad97-847be7252760",
  "image_url": "https://cdn.example.com/creative-for-shubh.jpg",
  "click_url": "https://shubh.com"
}
```

If any filter fails (budget <= 0, hour not allowed, user out of radius), the endpoint will return no ad.

## Budget & Tracking Integration (how it ties together)
- Clicks/impressions endpoints call `DecrementBudget(adID, amount)` prior to sending events to Kafka.
- `DecrementBudget` is implemented as a single Lua script running on Redis to atomically subtract the amount and return the resulting budget.
- The Decision Engine uses the same `ad:budget:<adID>` key to determine eligibility in real time.
- To avoid race conditions where concurrent clicks temporarily allow slightly overspent behavior, consider the following:
  - Apply an additional guard at serve-time (e.g., require budget > CPC * safetyFactor, or immediately reserve budget when serving using an atomic Lua reserve script that sets a short TTL reservation).

## Performance & Scaling Notes
- Avoid `SCAN` on every request for high QPS. Instead maintain an `ad:active` `SET` (or `ZSET`) updated when campaigns are created/updated/paused; fetch members and pipeline `MGET`.
- Use Redis `GEOADD` + `GEORADIUS` for geospatial filtering at scale (it will be much faster than computing Haversine in the app for large candidate sets).
- Precompute/approximate bounding boxes to prefilter candidates before precise Haversine checks.
- Keep responses minimal (only fields the client needs) to reduce serialization cost.
- Use connection pooling and warm Redis connections in the app to hit sub-10ms latency targets.
- Consider per‑region Redis clusters or partitioning if serving globally at >10k rps.

## Operational considerations
- Daily budget reset: use a background job that resets `ad:budget:<adID>` to the configured `dailyLimit` at midnight (or store daily counters with date suffixes and switch keys each day).
- Monitoring: track served-impressions per ad in Redis or via the existing Kafka → Mongo consumer so you can reconcile totals and detect drift.
- Failure modes: if Redis is unavailable, degrade gracefully (return `204 No Content`) and record telemetry for investigation.

## Error handling & response codes
- `400 Bad Request` — malformed query params (invalid lat/lng).
- `204 No Content` — no eligible ad to serve.
- `500 Internal Server Error` — Redis errors or config parsing failures.

---

File created: `BACKEND/docs/serve-ad.md`

If you want, I can also:
- Add a small example Redis seed script showing how to write `ad:config:<id>` and `ad:budget:<id>` for your provided ad.
- Convert geofence filtering to Redis GEO indexes and update the handler accordingly.
Which would you prefer next?   
