# Multi-Tenant Rate Limiting System

A comprehensive 4-layer rate limiting system for LLM usage that protects both the provider (Ollama Cloud) and ensures fair usage across tenants.

## Architecture

### 4-Layer Protection

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Global Rate Limits (Protect Ollama Cloud)         │
│  • 100 requests/minute across all tenants                   │
│  • 1000 requests/hour across all tenants                    │
│  • Fail open with warning if Redis is down                  │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Per-Tenant Daily Limits (Fair Usage)              │
│  • Free: 50 requests/day                                    │
│  • Pro: 500 requests/day                                    │
│  • Enterprise: 5,000 requests/day                           │
│  • Return 429 status when exceeded                          │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: Per-Tenant Token Limits (Cost Control)            │
│  • Free: 100K tokens/day                                    │
│  • Pro: 1M tokens/day                                       │
│  • Track running count in Redis                             │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Per-User Burst Limits (Prevent Spam)              │
│  • 10-100 requests/minute per user (depends on tier)      │
│  • 2-20 concurrent requests max (depends on tier)           │
│  • Sliding window with Redis                                │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Database Migration

```bash
# Apply the Supabase migration
supabase db push
```

### 3. Basic Usage

```typescript
import { withRateLimit } from './middleware/rate-limit';

// In your API route
async function chatHandler(request) {
  const result = await withRateLimit(
    {
      tenantId: request.headers['x-tenant-id'],
      userSessionId: request.headers['x-session-id'],
      estimatedTokens: 1000,
    },
    async () => {
      // Your chat logic here
      return await callLLM(request);
    }
  );
  
  return result;
}
```

## Configuration

### Subscription Tiers

Defined in `src/lib/subscription-tiers.ts`:

```typescript
const TIER_LIMITS = {
  free: {
    dailyRequests: 50,
    dailyTokens: 100_000,
    burstRequestsPerMinute: 10,
    maxConcurrentRequests: 2,
  },
  pro: {
    dailyRequests: 500,
    dailyTokens: 1_000_000,
    burstRequestsPerMinute: 30,
    maxConcurrentRequests: 5,
  },
  enterprise: {
    dailyRequests: 5000,
    dailyTokens: 10_000_000,
    burstRequestsPerMinute: 100,
    maxConcurrentRequests: 20,
  },
};
```

### Alert Thresholds

- **Warning**: 80% of quota → Webhook alert
- **Critical**: 95% of quota → Urgent alert

## API Reference

### Core Functions

#### `withRateLimit(context, handler, options)`
Main middleware that applies all 4 layers of protection.

```typescript
const result = await withRateLimit(
  { tenantId: 'tenant-1', userSessionId: 'session-1' },
  async () => { /* your code */ },
  { estimatedTokens: 500 }
);
```

#### `checkRateLimits(context, options)`
Pre-flight limit check without executing a handler.

```typescript
const status = await checkRateLimits(context, { estimatedTokens: 500 });
if (!status.allowed) {
  // Handle rate limit
}
```

#### `rateLimiter.getTenantUsage(tenantId, tier)`
Get current usage statistics.

```typescript
const usage = await rateLimiter.getTenantUsage('tenant-1', 'pro');
console.log(usage.requests.percentage); // 45.5
```

### Middleware Options

```typescript
interface RateLimitOptions {
  skipGlobalCheck?: boolean;   // Skip Layer 1
  skipTenantCheck?: boolean;   // Skip Layer 2
  skipTokenCheck?: boolean;    // Skip Layer 3
  skipBurstCheck?: boolean;    // Skip Layer 4
  estimatedTokens?: number;    // For Layer 3 pre-check
}
```

## Error Handling

When rate limits are exceeded, a `RateLimitError` is thrown:

```typescript
try {
  await withRateLimit(context, handler);
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(error.statusCode);      // 429
    console.log(error.message);         // "Daily limit reached..."
    console.log(error.retryAfter);      // seconds until retry
    console.log(error.limitType);       // "tenant-daily"
    console.log(error.currentUsage);    // 50
    console.log(error.limit);           // 50
  }
}
```

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test src/lib/__tests__/rate-limiter.test.ts
```

## Redis Configuration

The system works without Redis using in-memory cache, but Redis is recommended for production:

```typescript
import { createRateLimiter } from './lib/rate-limiter';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
const limiter = createRateLimiter(redis);
```

## Files Created

| File | Description |
|------|-------------|
| `src/lib/subscription-tiers.ts` | Tier definitions and limits |
| `src/lib/rate-limiter.ts` | Core rate limiting logic with 4 layers |
| `src/lib/tenant-quota.ts` | Tenant settings and quota management |
| `src/middleware/rate-limit.ts` | Middleware and error handling |
| `src/app/api/chat/route.ts` | Example chat API with rate limiting |
| `supabase/migrations/add_rate_limits.sql` | Database schema |
| `src/lib/__tests__/rate-limiter.test.ts` | Comprehensive test suite |
| `src/examples/express-integration.ts` | Express.js example |
| `src/examples/webhook-handler.ts` | Webhook alert handler |

## Acceptance Criteria Checklist

- [x] 429 response when tenant exceeds daily limit
- [x] Clear error message: "Daily limit reached. Upgrade or try tomorrow."
- [x] Admin dashboard functions for usage vs limits
- [x] Global limit protects from total outage
- [x] Redis fallback (memory cache if Redis unavailable)
- [x] Webhook/alert when tenant hits 80% of limit
- [x] Tests for 1000 rapid requests simulation
- [x] Tests for multi-tenant isolation
- [x] Tests for Redis failure resilience
