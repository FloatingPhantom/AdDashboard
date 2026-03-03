package storage

import (
    "context"
    "fmt"
    "strconv"

    "github.com/redis/go-redis/v9"
)

// DecrementBudget atomically subtracts `amount` from the real-time budget
// counter stored in Redis for the given adID. The key pattern is assumed to be
// `ad:budget:<adID>`. If the key does not yet exist the script treats the
// current value as 0, subtracts the amount, stores the new value, and returns
// it. This ensures callers don't have to check existence beforehand and can
// operate very quickly in a single round‑trip.
//
// The implementation uses a Lua script because Redis transactions (WATCH +
// MULTI/EXEC) would require two round trips when the key doesn't exist, and the
// script runs entirely on the server ensuring atomicity even under heavy load.
//
// It returns the resulting budget after the subtraction (which may be negative)
// and any error encountered while communicating with Redis.
func DecrementBudget(ctx context.Context, rdb *redis.Client, adID string, amount float64) (float64, error) {
    key := fmt.Sprintf("ad:budget:%s", adID)

    // Lua script performs the arithmetic atomically on the Redis server.
    // KEYS[1] - budget key
    // ARGV[1] - amount to subtract
    // If the key does not exist, redis.call("GET") returns nil, so we coerce
    // it to "0" before converting to a number.
    lua := redis.NewScript(`
local curr = tonumber(redis.call("GET", KEYS[1]) or "0")
local amt = tonumber(ARGV[1])
local new = curr - amt
redis.call("SET", KEYS[1], new)
return new
`)

    res, err := lua.Run(ctx, rdb, []string{key}, amount).Result()
    if err != nil {
        return 0, err
    }

    switch v := res.(type) {
    case int64:
        return float64(v), nil
    case float64:
        return v, nil
    case string:
        f, err := strconv.ParseFloat(v, 64)
        if err != nil {
            return 0, err
        }
        return f, nil
    default:
        return 0, fmt.Errorf("unexpected return type %T", v)
    }
}
