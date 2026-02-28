# Pantry-Pal API Deployment Strategy Research
**Date:** 2026-02-22  
**Researcher:** AI Research Agent  
**Deadline:** 2026-02-23 7:00 AM CT

---

## Executive Summary

After evaluating 3 distinct deployment architectures for Pantry-Pal's Node.js + SQLite API, **Recommendation: Option 2 - Vercel + Railway** provides the best balance of developer experience, cost-effectiveness, and straightforward migration path while preserving SQLite compatibility.

---

## Current Architecture Challenges

| Challenge | Impact |
|-----------|--------|
| **Ephemeral Filesystem** | Vercel serverless functions lose SQLite data between invocations |
| **Coordinated Deploys** | Frontend + API can fall out of sync if not managed |
| **GitHub Integration** | Need automatic deploys on push to both repos |
| **2-Repo Complexity** | Current separation adds overhead for maintenance |

---

## Option Comparison

### Option 1: Vercel Serverless Functions (Pure Vercel)
Deploy Node.js API as serverless functions directly on Vercel alongside the frontend.

| Aspect | Details |
|--------|---------|
| **SQLite Strategy** | Migrate to **Turso** (Vercel-integrated SQLite) or use **Vercel KV** (Redis) |
| **Pros** | • Single platform = simpler billing/monitoring<br>• Serverless scaling = pay-per-request<br>• Native GitHub integration<br>• Edge deployment globally |
| **Cons** | • Requires database migration (SQLite → Turso)<br>• Cold start latency (200-500ms)<br>• Connection pooling complexity<br>• Function timeout limits (10s hobby, 60s pro)<br>• Vendor lock-in with Turso |
| **Cost (Estimated)** | • Vercel Pro: $20/mo<br>• Turso: Free tier (500MB) → $29/mo (2GB)<br>• **Total: $0-50/mo** |
| **Migration Effort** | **HIGH** - Requires code changes for Turso/libSQL compatibility |
| **Maintenance** | Medium - Single platform but new tech stack |

**Turso Migration Notes:**
- Use `libsql` client instead of `better-sqlite3` or `sqlite3`
- Turso supports HTTP-based connections (good for serverless)
- Some SQLite pragmas/features not supported

---

### Option 2: Vercel + Railway/Fly.io (Recommended)
Frontend on Vercel, API deployed to Railway or Fly.io as a containerized service.

| Aspect | Details |
|--------|---------|
| **SQLite Strategy** | **Keep native SQLite** + persistent volume (Railway) or **Migrate to PostgreSQL** (optional) |
| **Pros** | • Zero code changes if keeping SQLite<br>• Railway/Fly.io support persistent volumes<br>• Can migrate to Postgres later optionally<br>• Clear separation of concerns<br>• Better API performance (no cold starts) |
| **Cons** | • Two platforms to monitor<br>• Slightly more complex initial setup<br>• Coordinated deploys need GitHub Actions |
| **Cost (Estimated)** | • Vercel Free: $0<br>• Railway Starter: $5/mo (512MB RAM, 1GB storage)<br>• Fly.io Free: $0 (3 shared-cpu VMs, 3GB volumes)<br>• **Total: $0-5/mo** |
| **Migration Effort** | **LOW** - Minimal changes, just deploy existing code |
| **Maintenance** | Low-Medium - Familiar SQLite stack |

**Platform Comparison:**

| Feature | Railway | Fly.io |
|---------|---------|--------|
| Free Tier | $5 credit/month | 3 VMs + 3GB volumes |
| SQLite Persistence | ✅ Volumes | ✅ Volumes |
| Postgres | ✅ Builtin | ✅ Builtin |
| GitHub Deploy | ✅ Auto | ✅ Auto |
| Custom Domain | ✅ | ✅ |
| Regions | Limited (~8) | Global (40+) |
| Learning Curve | Low | Medium |
| **Verdict** | ⭐ Easier setup | More control |

---

### Option 3: Monorepo Approach
Combine pantry-pal and pantry-pal-api into single repository.

| Aspect | Details |
|--------|---------|
| **SQLite Strategy** | Can use any option (Turso, Railway, Postgres) |
| **Pros** | • Single repo = atomic deploys<br>• Easier to share types/code<br>• One CI/CD pipeline<br>• Clear dependency versioning |
| **Cons** | • Complex GitHub Actions for path-based deploys<br>• Blurs frontend/backend boundaries<br>• Larger repo = slower CI<br>• Requires repo reorganization |
| **Cost** | Same as Option 1 or 2 (infrastructure doesn't change) |
| **Migration Effort** | **MEDIUM-HIGH** - Subtree merge + history preservation |
| **Maintenance** | Medium - Initially complex, then simpler |

**Monorepo Tools:**
- **Turborepo** (Vercel) - Build orchestration
- **Nx** - Full monorepo toolchain
- **pnpm workspaces** - Simple, package-manager native

---

## Detailed Comparison Matrix

| Criteria | Option 1 (Vercel Pure) | Option 2 (Vercel + Railway) | Option 3 (Monorepo) |
|----------|----------------------|----------------------------|---------------------|
| **Setup Complexity** | Medium | Low | High |
| **Migration Effort** | High | Low | Medium |
| **Maintenance** | Medium | Low | Medium |
| **Monthly Cost** | $0-50 | $0-5 | Same as O1/O2 |
| **Cold Starts** | Yes (200-500ms) | No | Depends on choice |
| **SQLite Native** | No (Turso) | Yes | Optional |
| **Vendor Lock-in** | High (Vercel+Turso) | Low | Low |
| **Learning Curve** | Medium (new tech) | Low (existing stack) | Medium |
| **Scalability** | Auto | Manual | Same as O1/O2 |
| **Dev Experience** | Good | Excellent | Good |

---

## Recommendation: Option 2 - Vercel + Railway

### Why Railway over Fly.io?
1. **Lower learning curve** - Railway has excellent DX for Node.js
2. **SQLite persistence** - Built-in volume support with easy management
3. **Better free tier** - $5 credit goes further for small apps
4. **GitHub auto-deploy** - Seamless integration
5. **Migration later** - Easy to add Postgres when you're ready

### Architecture Overview
```
┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │◄────┤   GitHub Push   │
│   (Vercel)      │     └─────────────────┘
└────────┬────────┘
         │ API Calls
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Node.js API    │◄────┤   GitHub Push   │
│  (Railway)      │     └─────────────────┘
│  + SQLite       │
└─────────────────┘
```

---

## Step-by-Step Setup Guide (Option 2)

### Phase 1: Deploy API to Railway

**1.1 Prepare Repository**
```bash
# In pantry-pal-api repo
# Ensure you have a start script in package.json:
# "start": "node server.js" or "start": "node index.js"
```

**1.2 Railway Setup**
1. Sign up at <https://railway.app>
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `pantry-pal-api` repository
4. Railway auto-detects Node.js

**1.3 Configure Environment**
```
# In Railway Dashboard → Variables
NODE_ENV=production
PORT=3000  # Railway sets this automatically
DATABASE_PATH=/data/pantry.db
```

**1.4 Add Persistent Volume**
1. Go to Settings → Volumes
2. Add volume: Mount Path = `/data`
3. Size: Start with 1GB (free tier)

**1.5 Verify Deployment**
- Access the generated Railway URL
- Test health endpoint
- Verify SQLite writes persist across restarts

**1.6 Add Custom Domain (Optional)**
- Settings → Domains → Generate Domain or Add Custom
- Example: `api.pantry-pal.app`

---

### Phase 2: Configure Frontend on Vercel

**2.1 Update API Base URL**
```javascript
// In pantry-pal frontend, update API client:
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
// Change to:
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.pantry-pal.app';
```

**2.2 Add Environment Variable in Vercel**
```
NEXT_PUBLIC_API_URL=https://api.pantry-pal.app
```

**2.3 Configure CORS (if needed)**
```javascript
// In your API server.js
app.use(cors({
  origin: ['https://pantry-pal.vercel.app', 'http://localhost:3000'],
  credentials: true
}));
```

---

### Phase 3: Coordinated Deployment Strategy

**3.1 Option A: Repository Dispatch (Recommended)**

Create a GitHub Actions workflow that triggers Railway deploy when Vercel deploys:

**In pantry-pal repo (frontend):**
```yaml
# .github/workflows/deploy-api.yml
name: Deploy API After Frontend

on:
  push:
    branches: [main]

jobs:
  wait-for-vercel:
    runs-on: ubuntu-latest
    steps:
      - name: Wait for Vercel Deploy
        uses: patrickedqvist/wait-for-vercel-preview@v1.3.1
        id: wait
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          max_attempts: 30
      
      # Railway deploys automatically on push to API repo
      # If you need manual trigger, add webhook call here
```

**3.2 Option B: Monorepo-style Coordinated Deploy**

If you want true atomic deploys, create a 3rd "deploy" repo:

```yaml
# .github/workflows/deploy-all.yml
name: Coordinated Deploy

on:
  workflow_dispatch:
  schedule:
    - cron: '0 12 * * *'  # Daily at noon

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Frontend Deploy
        run: |
          curl -X POST "${{ secrets.VERCEL_DEPLOY_HOOK }}"
      
      - name: Trigger API Deploy
        run: |
          curl -X POST "${{ secrets.RAILWAY_DEPLOY_HOOK }}"
```

**3.3 Option C: Manual Sync (Start Here)**
- Railway auto-deploys on push to `main`
- Vercel auto-deploys on push to `main`
- Keep API backward-compatible during deploys
- Monitor both dashboards

---

## Migration Plan from 2-Repo Setup

### Week 1: API Migration (Railway)
- [ ] Sign up for Railway
- [ ] Connect pantry-pal-api repo
- [ ] Add persistent volume for SQLite
- [ ] Configure environment variables
- [ ] Update CORS settings
- [ ] Test API endpoints
- [ ] Verify SQLite persistence

### Week 2: Frontend Update
- [ ] Update API URLs in frontend
- [ ] Add NEXT_PUBLIC_API_URL to Vercel
- [ ] Test on Vercel preview branch
- [ ] Deploy to production

### Week 3: Optimization
- [ ] Set up Railway custom domain
- [ ] Configure GitHub deploy hooks
- [ ] Add monitoring/alerts (Railway logs + Vercel Analytics)
- [ ] Document the setup

### Rollback Strategy
- Keep local dev environment working
- Document old deployment method
- Maintain environment variable backups
- If Railway fails, can quickly switch to Fly.io (same code works)

---

## Future Migration Path (When Ready)

### SQLite → PostgreSQL (Optional Later)

When you outgrow SQLite:

1. **In Railway Dashboard:**
   - Add Postgres service (one click)
   - Get connection string

2. **Update API Code:**
   ```javascript
   // Install: npm install pg
   const { Pool } = require('pg');
   const pool = new Pool({ connectionString: process.env.DATABASE_URL });
   
   // Replace SQLite queries with Postgres
   ```

3. **Data Migration:**
   ```bash
   # Export SQLite → Import Postgres
   sqlite3 pantry.db .dump > dump.sql
   # Convert SQL dialect using scripts
   ```

**Cost at that point:**
- Railway Postgres: $5-15/mo (depends on usage)
- Vercel: $0-20/mo
- **Total: $5-35/mo** (still reasonable)

---

## Cost Projections

| Scale | Monthly Cost | Notes |
|-------|--------------|-------|
| **MVP (0-100 users)** | $0 | Railway free tier + Vercel free |
| **Growing (100-1k users)** | $5 | Railway starter plan |
| **Established (1k-10k users)** | $25-50 | Railway + Postgres upgrade |
| **Scale (10k+ users)** | $100+ | Consider fully managed solutions |

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Railway volumes fail | Low | Daily backups via Railway dashboard |
| CORS misconfiguration | Medium | Test all origins in staging |
| Deploy desync | Low | Use same branch strategy (main=prod) |
| Cost spikes | Low | Railway's hard spend caps |
| SQLite concurrency limits | Low | SQLite WAL mode + Railway volume |

---

## Quick Decision Guide

| If you want... | Choose... |
|----------------|-----------|
| Minimal code changes now | **Option 2** (Vercel + Railway) |
| Single platform | **Option 1** (accept SQLite migration pain) |
| Maximum TypeScript sharing | **Option 3** (Monorepo) |
| Easiest path forward | **Option 2** (Recommended) |
| Lowest cost | **Option 2** (Free tiers cover both) |

---

## Resources

- Railway Docs: <https://docs.railway.app/>
- Railway Volumes: <https://docs.railway.app/deploy/volumes>
- Vercel Serverless Functions: <https://vercel.com/docs/functions>
- Turso (SQLite alternative): <https://turso.tech/>

---

## Conclusion

**Recommendation: Proceed with Option 2 (Vercel + Railway)** for immediate deployment. This preserves your existing SQLite setup while providing room to grow. The migration is low-risk, reversible, and keeps development velocity high.

Estimated setup time: **4-6 hours** for initial migration, **2-3 hours** for polish/optimization.

**Next Steps:**
1. Review this document with thindery
2. Confirm Railway account/access
3. Schedule migration window
4. Execute Phase 1 (API deployment)

---

*Report generated: 2026-02-22 21:30 CST*  
*Contact: Research Agent for questions on implementation details*
