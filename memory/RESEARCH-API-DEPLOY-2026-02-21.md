# Pantry-Pal API Deployment Strategy Research
**Research Date:** 2026-02-20  
**Due:** 2026-02-21 07:00 CST  
**Researcher:** remy-researcher

---

## Executive Summary

For thindery's Pantry-Pal project, **Option 2 (Vercel + Railway/Fly.io Split)** is the **RECOMMENDED** approach. It provides the best balance of "deploy on push" workflow, cost efficiency at current scale, and future migration flexibility.

### Quick Recommendation
| Criteria | Winner |
|----------|--------|
| Best Overall | **Vercel + Railway** |
| Lowest Effort | Vercel Serverless + Vercel Postgres |
| Lowest Cost (now) | Railway/Fly.io + SQLite |
| Most Scalable | Vercel + Railway Postgres |
| Single Deploy Trigger | Monorepo (but significant tradeoffs) |

---

## Option 1: Vercel Serverless Functions

### Overview
Convert the Node.js API to Vercel Functions (serverless) and host entirely on Vercel's platform.

### The SQLite Problem
**⚠️ CRITICAL LIMITATION:** Vercel's serverless environment has an **ephemeral filesystem**. 
- SQLite writes to disk
- Each serverless invocation may run on a different compute instance
- Data written by one request may not exist for the next request
- **SQLite on Vercel Functions is essentially non-functional for persistent data**

### Solutions

#### 1A: Vercel Postgres (formerly Neon integration)
- **Pros:** Native Vercel integration, serverless connection pooling, automatic scaling
- **Cons:** Higher cost, network latency between function and DB

**Pricing (Vercel Postgres):**
| Plan | Storage | Monthly Cost | Notes |
|------|---------|--------------|-------|
| Hobby/Free | 256 MB | $0 | Limited to 1 concurrent connection |
| Pro | First 4GB included | $20/function charges still apply | $0.10/GB after 4GB |
| Neon Direct | First 0.5GB free | $0-19/GB depending on plan | Better value direct |

#### 1B: Turso (SQLite for Serverless)
- LibSQL fork of SQLite designed for edge/serverless
- Edge replicated, not technically "SQLite" but API-compatible SQL
- **Pricing:** Free tier: 500 databases, 10GB total storage

### Setup Steps
```bash
# 1. Add vercel.json to api repo
{
  "version": 2,
  "builds": [{ "src": "api/**/*.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/api/(.*)", "dest": "/api/$1" }]
}

# 2. Install serverless adapter (if using Express)
npm install @vercel/node

# 3. Create api/index.js entry point
# 4. Add database connection using Vercel Postgres or Turso
# 5. Deploy: vercel --prod
```

### Gotchas
1. **Cold Start Latency:** 50-500ms on first request after idle
2. **Connection Limits:** Postgres connection pools can exhaust; use Prisma Accelerate or similar
3. **Request Timeout:** 60s (Hobby) / 900s (Pro) - not suitable for long-running jobs
4. **SQLite Impossible:** Must migrate off SQLite immediately

---

## Option 2: Vercel + Railway/Fly.io Split (RECOMMENDED)

### Overview
- **Frontend:** Deploy pantry-pal-web on Vercel (as intended)
- **Backend:** Deploy pantry-pal-api on Railway or Fly.io (persistent compute)

### Why This Wins
- Vercel is king for Next.js - keeps thindery's preferred platform
- Railway/Fly gives persistent filesystem for SQLite (temporarily) or cheap Postgres
- Simple GitHub auto-deploy available on all platforms
- Can migrate SQLite → Postgres on Railway without changing deployment strategy

### Railway Details
**Pricing:**
| Tier | Cost | What You Get |
|------|------|--------------|
| Hobby (Free) | $0 | 512MB RAM, shared CPU, sleeps after inactivity |
| Starter | $5/mo | 1GB RAM, persistent, always-on |
| Pro | $10-50/mo | 2-8GB RAM, more CPU |
| Postgres | +$5/mo | Managed PostgreSQL (optional) |

**SQLite on Railway:**
- ✅ **Possible!** Railway gives persistent disk
- But: Risk of data loss on redeploys (volume must be configured correctly)
- Better: Just use Railway Postgres for $5/mo

### Fly.io Details
**Pricing:**
| Tier | Cost | What You Get |
|------|------|--------------|
| Free | $0 | 3 shared-cpu-1x VMs, 1GB RAM total, 3GB storage |
| Pay-as-go | ~$1.94/mo per vm | Additional VMs |
| Postgres | Included | Fly Postgres is actually good (but complex to manage) |

**SQLite on Fly.io:**
- ✅ **Possible with volumes** - create a persistent volume, mount to app
- Volume pricing: $0.15/GB/month

### Coordinated Deployment Strategy

**Option A: Separate GitHub Actions**
```yaml
# .github/workflows/deploy.yml (frontend)
name: Deploy Frontend
on:
  push:
    branches: [main]
    paths: ['web/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: vercel/action-deploy@v1

# .github/workflows/deploy-api.yml (backend)  
name: Deploy API
on:
  push:
    branches: [main]
    paths: ['api/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: railway/workflows/deploy@v1
```

**Option B: Monorepo with path-based triggers** (see Option 3)

### Setup Steps (Railway)
```bash
# 1. Connect GitHub repo to Railway dashboard
# 2. Add environment variables (DATABASE_URL, JWT_SECRET, etc.)
# 3. Set start command: "npm start" or "node server.js"
# 4. Enable auto-deploy on push

# For SQLite persistence:
railway volume add pantry-data --mount /app/data
# Update code to write to /app/data/pantry.db
```

### Setup Steps (Fly.io)
```bash
# 1. Install flyctl
# 2. Initialize:
flyctl launch --name pantry-pal-api --region ord

# 3. Create volume for SQLite persistence (if staying on SQLite):
flyctl volumes create pantry_data --region ord --size 1

# 4. Edit fly.toml:
[mounts]
source="pantry_data"
destination="/data"

# 5. Deploy:
flyctl deploy

# GitHub Actions auto-deploys on push (fly deploy --remote-only)
```

### Gotchas
1. **CORS Configuration:** Frontend on vercel.app, backend on railway.app - must configure CORS properly
2. **Environment Sync:** Two sets of env vars to manage (consider Doppler or similar)
3. **Domain Configuration:** May want custom domain for API (api.pantry-pal.app → Railway/Fly, pantry-pal.app → Vercel)
4. **Railway Free Tier:** Sleeps after 15 min inactivity - first request has 5-10s cold start

---

## Option 3: Monorepo Approach

### Overview
- Combine pantry-pal-web and pantry-pal-api into one repository
- Use Vercel to deploy both frontend and backend from same repo

### How It Works
```
pantry-pal/
├── web/              # Next.js frontend
│   └── package.json
├── api/              # Node.js backend
│   └── package.json
├── vercel.json       # Root config
└── package.json      # Workspace root
```

### Vercel Monorepo Support
Vercel **does** support monorepos:
1. Set "Root Directory" in Vercel project settings (e.g., `web/`)
2. Can create multiple Vercel projects from one repo
3. Each project deploys independently based on path changes

### Setup
```json
// vercel.json in web/
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

```json
// vercel.json in api/ (if deploying as Vercel Functions)
{
  "version": 2,
  "routes": [{ "src": "/(.*)", "dest": "/api/$1" }]
}
```

### The Problem
This **doesn't solve the SQLite issue**. You still face the same constraints:
- Deploy API as Vercel Functions → No SQLite (ephemeral fs)
- Deploy API elsewhere → Back to Option 2

### When Monorepo Makes Sense
1. You want synchronized versioning between frontend/backend
2. You need atomic deploys (both ship together)
3. Your team is comfortable with workspace tools (npm workspaces, pnpm, turbo)

### Gotchas
1. **Build Complexity:** Separate build processes can conflict
2. **Versioning:** Tied releases can be painful (want frontend hotfix without API redeploy?)
3. **Team Scaling:** Harder to manage permissions/access separately
4. **CI/CD:** Need sophisticated path-based triggers to avoid unnecessary builds

---

## Option 4: Vercel Pro + Edge Config/Functions

### Overview
- Use Vercel Edge Functions (runs on Cloudflare Workers runtime)
- Vercel Edge Config for lightweight data

### Edge Functions vs Serverless
| Feature | Serverless Functions | Edge Functions |
|---------|---------------------|----------------|
| Runtime | Node.js | V8 Isolate (limited Node.js APIs) |
| Region | Single region | Global (250+ locations) |
| Cold Start | 50-500ms | ~0ms |
| Execution Time | 60-900s | 30s |
| Memory | Up to 1GB | 128MB max |
| Cost | $0.60/GB-hour | $0.40/million invocations |

### Edge Config
- Key-value storage for Edge Functions
- **Not a database** - max 100KB per read, designed for feature flags/config
- Cannot replace SQLite/Postgres for app data

### The Reality
**Edge Functions cannot run the current Node.js API** because:
1. Limited Node.js compatibility (no fs, many npm packages broken)
2. SQLite drivers won't work (no native bindings support)
3. 128MB memory limit (too small for many use cases)
4. 30s execution limit

This option is **not viable** for a full API replacement unless completely rewriting with edge-compatible libraries (Prisma Edge, etc.)

### Gotchas
1. **Package Compatibility:** Most Node.js packages don't work on Edge
2. **Debugging:** Harder to debug than serverless
3. **Use Case:** Only suitable for simple read-only APIs or middleware

---

## Migration Path: SQLite → Postgres

### Timeline Recommendation
**Phase 1 (Now):** Use Railway/Fly.io with SQLite
- Fastest path to deployment
- No data migration needed
- Keep existing code

**Phase 2 (When ready):** Migrate to Postgres on Railway
```bash
# 1. Export SQLite to SQL file
sqlite3 pantry.db .dump > pantry.sql

# 2. Create Railway Postgres instance
railway add --database postgres

# 3. Import to Postgres
psql $DATABASE_URL < pantry.sql

# 4. Update application code
# - Change SQLite queries to Postgres-compatible (usually minimal)
# - Switch from 'sqlite3' package to 'pg' or Prisma
```

**Migration Effort: 2-4 hours**
- Schema likely compatible (SQLite is close to Postgres)
- Query syntax mostly the same
- Connection string changes

### Schema Compatibility Issues to Watch
| SQLite | Postgres | Fix |
|--------|----------|-----|
| `INTEGER PRIMARY KEY` | `SERIAL` or `GENERATED` | Minor |
| `DATETIME` | `TIMESTAMP` | Same |
| `AUTOINCREMENT` | `SERIAL` | Minor |
| No strict types | Strict types | May need data cleaning |
| `IS ''` | `= ''` | Postgres handles empty vs null differently |

---

## Cost Comparison (Current + Growth)

### Scenario A: Minimal Usage (Hobby/Side Project)
| Option | Monthly Cost | Notes |
|--------|--------------|-------|
| Vercel + Railway SQLite (Free) | $0 | Railway sleeps, Vercel free |
| Vercel + Fly (Free) | $0 | Fly free tier generous |
| Vercel + Turso | $0 | 10GB storage |
| Vercel Postgres | $0 | 256MB, connection limited |

### Scenario B: Active Usage (Always-on, small traffic)
| Option | Monthly Cost | Notes |
|--------|--------------|-------|
| Vercel + Railway Starter + SQLite | $5/mo | Railway always-on |
| Vercel + Railway + Postgres | $10/mo | $5 + $5 DB |
| Vercel + Fly (1 VM) | ~$2/mo | Very cheap |
| Vercel Pro + Postgres | $20+/mo | Vercel Pro required for production |

### Scenario C: Growth (10k users, production)
| Option | Monthly Cost | Notes |
|--------|--------------|-------|
| Vercel Pro + Railway Pro | $40-60/mo | Scales well |
| Vercel + Fly (2-3 VMs) | $10-20/mo | Cheapest scale option |
| Vercel Enterprise | $100+/mo | Not needed until large scale |

---

## Decision Matrix

### Effort vs Capability vs Cost

| Option | Setup Effort | Maintenance | SQLite Works | Auto Deploy | Current Cost | Growth Cost | Recommendation |
|--------|-------------|-------------|--------------|-------------|--------------|-------------|----------------|
| **1. Vercel Serverless** | ⭐⭐⭐ High | ⭐⭐ Medium | ❌ No | ✅ Yes | $0 | $20+ | ❌ SQLite blocker |
| **1. + Turso** | ⭐⭐ Medium | ⭐ Low | ⚠️ Rewrite | ✅ Yes | $0 | $0-10 | ⭐ Good if rewriting DB |
| **2. Vercel + Railway** | ⭐ Low | ⭐ Low | ✅ Yes | ✅ Yes | $0-5 | $20-40 | ⭐⭐⭐ **BEST** |
| **2. Vercel + Fly** | ⭐ Low | ⭐⭐ Medium | ✅ Yes | ✅ Yes | $0-2 | $10-20 | ⭐⭐ **GREAT** |
| **3. Monorepo** | ⭐⭐⭐ High | ⭐⭐⭐ High | ❌ No | ✅ Yes | $0 | $20+ | ❌ Complexity without benefit |
| **4. Edge Config** | ⭐⭐⭐ High | ⭐⭐⭐ High | ❌ No | ✅ Yes | $0 | $? | ❌ Not viable for full API |

### Scoring
- **Setup Effort:** ⭐ = Hours, ⭐⭐ = Days, ⭐⭐⭐ = Weeks
- **Maintenance:** ⭐ = Low, ⭐⭐ = Medium, ⭐⭐⭐ = High
- **SQLite Works:** Can keep current SQLite code without major rewrites

---

## Final Recommendations

### 🏆 Primary Recommendation: Vercel + Railway

**Why:**
1. Keeps Next.js frontend where it belongs (Vercel)
2. Railway has best-in-class developer experience
3. SQLite works out of box (persistent volume)
4. $5/mo "Starter" tier eliminates cold starts
5. Built-in managed Postgres when ready to migrate
6. Auto-deploy from GitHub works perfectly

**Setup Steps:**
1. Deploy pantry-pal-web to Vercel (current repo, no changes)
2. Connect pantry-pal-api to Railway
3. Add environment variable: `DATABASE_PATH=/app/data/pantry.db`
4. Add Railway volume: `railway volume add data --mount /app/data`
5. Configure frontend `.env.local`: `NEXT_PUBLIC_API_URL=https://pantry-pal-api.up.railway.app`
6. Enable auto-deploy in Railway settings
7. (Optional) Add Railway Postgres for $5/mo when ready

### 🥈 Alternative: Vercel + Fly.io
**Choose if:** You want more control, lower cost, comfortable with CLI tools

### 🥉 Fallback: Vercel + Turso
**Choose if:** You want everything on Vercel ecosystem, willing to rewrite data layer

---

## Immediate Action Items

1. **Decision:** Confirm Railway vs Fly.io preference
2. **Railway account:** Create at railway.app (GitHub SSO available)
3. **API deployment:** Connect pantry-pal-api repo to Railway
4. **Frontend update:** Point API calls to new Railway URL
5. **CORS:** Add `CORS_ORIGIN=https://pantry-pal-web.vercel.app` to Railway env vars
6. **Optional:** Set custom domain (api.pantry-pal.app) for Railway backend

---

*Research completed: 2026-02-20 21:45 CST*
*Next steps: Review with thindery and implement chosen solution*
