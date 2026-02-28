# Pantry-Pal Deployment Guide

**Date:** 2026-02-26  
**Project:** Pantry-Pal (Next.js Frontend + Node.js/Express/SQLite Backend)  
**Research Scope:** Deployment Strategy Comparison & Recommendation

---

## Executive Summary

Pantry-Pal currently consists of two separate repositories:
- **Frontend:** Next.js application (`pantry-pal` repo)
- **Backend:** Node.js + Express + SQLite (`pantry-pal-api` repo)

This guide evaluates three deployment strategies, comparing complexity, cost, scalability, and maintainability. Given the user's preference for Vercel, **Option 2 (Hybrid: Vercel + Railway/Fly.io)** is recommended as the most pragmatic solution.

---

## Current Architecture Overview

```
┌─────────────────┐         ┌─────────────────────┐
│  Next.js App    │  ──────▶│  Node.js + Express  │
│  (Frontend)     │  HTTP   │  + SQLite           │
│                 │         │                     │
└─────────────────┘         │  - Auth Endpoints   │
   pantry-pal               │  - Pantry Data API  │
                            │  - Local DB File    │
                            └─────────────────────┘
                               pantry-pal-api
```

**Critical Constraint:** SQLite is a file-based database. This creates deployment challenges on serverless platforms with ephemeral filesystems.

---

## Option 1: Vercel Serverless Functions (All-in-One)

### Concept
Deploy both frontend and API as Vercel Functions, converting the Express app to serverless handlers, and migrating SQLite to Vercel KV or a serverless PostgreSQL.

### Architecture

```
┌─────────────────────────────────────────┐
│           Vercel Platform             │
│  ┌─────────────────────────────────┐  │
│  │      Next.js App (Frontend)     │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │   Serverless Functions (API)    │  │
│  │   - /api/auth                   │  │
│  │   - /api/pantry                 │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │   Vercel KV OR Vercel Postgres │  │
│  │   (Persistent Data Layer)     │  │
│  └─────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Implementation Steps

#### 1. Convert Express to Serverless Functions

Create `api/auth.js`:
```javascript
// api/auth.js
import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
  
  if (req.method === 'POST') {
    // Handle auth logic using KV for session storage
    const session = await kv.set(`session:${userId}`, token, { ex: 86400 });
    res.status(200).json({ success: true, token });
  }
}
```

#### 2. Database Migration (SQLite → Vercel Postgres)

Install dependencies:
```bash
npm install @vercel/postgres
```

Migration script:
```javascript
// scripts/migrate-to-postgres.js
import { sql } from '@vercel/postgres';

async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS pantry_items (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      quantity INTEGER DEFAULT 1,
      expiry_date TIMESTAMP,
      category VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;
  
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;
}
```

#### 3. Vercel Configuration

```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/next"
    },
    {
      "src": "api/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/$1"
    }
  ],
  "crons": [
    {
      "path": "/api/cleanup-expired",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Pros & Cons

| Aspect | Pros | Cons |
|--------|------|------|
| **Cost** | Generous free tier | KV/Postgres add costs at scale |
| **Complexity** | Single platform, unified CI/CD | Requires significant code refactoring |
| **Performance** | Edge-optimized | Cold starts on infrequent functions |
| **Scalability** | Auto-scales infinitely | KV has rate limits |
| **Data Integrity** | Redis/Postgres persistence | Migration effort required |
| **Development** | Preview deployments per PR | Local dev requires Vercel CLI |

### Migration Complexity: **HIGH**
- Estimated effort: 2-3 days
- Database migration requires schema transformation
- Testing required for all API endpoints
- Session handling needs rewrite

---

## Option 2: Hybrid Approach (Recommended)

### Concept
Deploy frontend on Vercel (optimal for Next.js), backend on Railway or Fly.io (optimal for persistent Node.js apps with SQLite or easy Postgres).

### Architecture

```
┌──────────────────┐      ┌──────────────────────┐
│    Vercel        │      │   Railway / Fly.io   │
│  ┌────────────┐  │      │  ┌────────────────┐  │
│  │ Next.js    │  │◀────▶│  │ Node.js API    │  │
│  │ Frontend   │  │ HTTPS│  │ + Express      │  │
│  └────────────┘  │      │  │                │  │
│                  │      │  │ - SQLite file  │  │
│  Auto-deploys    │      │  │   OR Postgres  │  │
│  on git push     │      │  └────────────────┘  │
│                  │      │                      │
│  Preview URLs    │      │  Auto-deploys        │
│  per PR          │      │  on git push         │
└──────────────────┘      └──────────────────────┘
```

### Platform Comparison: Railway vs Fly.io

| Feature | Railway | Fly.io |
|---------|---------|--------|
| **Free Tier** | $5/month credit, 500 hrs | 3 shared-cpu-1x VMs, 1GB RAM |
| **SQLite** | ✅ Persistent disk | ✅ Persistent volumes |
| **Postgres** | ✅ Managed, $0.01/GB | ✅ Managed, free tier available |
| **Deploy** | Git push → auto-deploy | Git push or `fly deploy` |
| **Custom Domains** | ✅ | ✅ |
| **SSL** | Auto | Auto |
| **Regions** | Limited | 30+ global regions |
| **Learning Curve** | Lower | Moderate |

**Recommendation:** Railway for simplicity, Fly.io for global distribution.

### Implementation Steps

#### 1. Frontend on Vercel

```bash
# In pantry-pal repo
npm install

# Create vercel.json for SPA routing
```

```json
// vercel.json (in pantry-pal repo)
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://your-api-domain.com"
        }
      ]
    }
  ]
}
```

Environment variables in Vercel Dashboard:
```
NEXT_PUBLIC_API_URL=https://pantry-pal-api.railway.app
```

Or use Next.js rewrites for cleaner API calls:
```javascript
// next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL}/:path*`,
      },
    ];
  },
};
```

#### 2. Backend on Railway

```bash
# In pantry-pal-api repo
# Add railway.json config
```

```json
// railway.json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

GitHub Actions for coordinated deploys:
```yaml
# .github/workflows/deploy.yml (in both repos)
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Railway
        if: github.repository == 'user/pantry-pal-api'
        uses: railway/cli@v2
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
        
      - name: Deploy Frontend (via Vercel webhook)
        if: github.repository == 'user/pantry-pal'
        run: |
          curl -X POST "${{ secrets.VERCEL_DEPLOY_HOOK }}"
```

#### 3. CORS Configuration

```javascript
// In pantry-pal-api (server.js or app.js)
const cors = require('cors');

const allowedOrigins = [
  'http://localhost:3000',              // Local dev
  'https://pantry-pal.vercel.app',      // Production
  'https://pantry-pal-git-*.vercel.app' // Preview deployments (wildcard)
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl)
    if (!origin) return callback(null, true);
    
    // Check against allowed origins
    const allowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = new RegExp(allowed.replace('*', '.*'));
        return pattern.test(origin);
      }
      return allowed === origin;
    });
    
    if (allowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### 4. Environment Variable Coordination

Create a shared `.env.example`:
```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://api-pantry-pal.up.railway.app
NEXT_PUBLIC_APP_NAME=PantryPal

# Backend (.env)
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://pantry-pal.vercel.app
DATABASE_URL=./data/pantry.db  # Or Postgres URL
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGINS=https://pantry-pal.vercel.app,https://pantry-pal-git-main.vercel.app
```

Script to sync secrets:
```bash
#!/bin/bash
# scripts/sync-secrets.sh

# Sync JWT_SECRET between platforms
VERCEL_TOKEN="${VERCEL_TOKEN}"
RAILWAY_TOKEN="${RAILWAY_TOKEN}"

JWT_SECRET=$(openssl rand -hex 32)

echo "Setting JWT_SECRET across platforms..."
vercel env add JWT_SECRET production <<< "$JWT_SECRET"
railway variables set JWT_SECRET="$JWT_SECRET"
```

### Pros & Cons

| Aspect | Pros | Cons |
|--------|------|------|
| **Cost** | Vercel free + Railway free = $0 start | Costs scale with usage |
| **Complexity** | Minimal code changes | Two platforms to manage |
| **Performance** | Next.js optimized on Vercel | Network latency between services |
| **Scalability** | Independent scaling | API becomes bottleneck first |
| **Data Integrity** | SQLite works, easy Postgres upgrade | SQLite has single-server limitation |
| **Development** | Familiar Express patterns | Need to manage two deploy pipelines |
| **Flexibility** | Each platform does what it does best | More environment configs |

### Migration Complexity: **LOW**
- Estimated effort: 4-6 hours
- Minimal code changes required
- Mostly configuration and env vars

---

## Option 3: Monorepo Approach

### Concept
Combine both repositories into a single Vercel monorepo using Turborepo or Nx, with unified deployment pipeline.

### Architecture

```
pantry-pal-monorepo/
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # Node.js Express API
├── packages/
│   ├── shared-types/     # Shared TypeScript types
│   ├── ui/               # Shared UI components
│   └── config/           # Shared ESLint, TS configs
├── package.json          # Root workspace config
└── turbo.json            # Turborepo pipeline
```

### Implementation Steps

#### 1. Setup Turborepo

```bash
# Create new monorepo
npx create-turbo@latest pantry-pal-monorepo
cd pantry-pal-monorepo

# Move existing code
mv ../pantry-pal/* apps/web/
mv ../pantry-pal-api/* apps/api/
```

#### 2. Workspace Configuration

```json
// package.json (root)
{
  "name": "pantry-pal-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "devDependencies": {
    "turbo": "^1.11.0"
  }
}
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {}
  }
}
```

#### 3. Vercel Monorepo Config

```json
// vercel.json (in apps/web)
{
  "version": 2,
  "buildCommand": "cd ../.. && turbo run build --filter=web...",
  "installCommand": "npm install"
}
```

For the API as a separate deployment or serverless:
```json
// apps/api/vercel.json
{
  "version": 2,
  "builds": [
    { "src": "server.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "/server.js" }
  ]
}
```

#### 4. Shared Types Package

```typescript
// packages/shared-types/src/index.ts
export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  expiryDate?: Date;
  category: 'dairy' | 'produce' | 'meat' | 'pantry' | 'frozen';
  userId: string;
}

export interface User {
  id: string;
  email: string;
  createdAt: Date;
}
```

### Pros & Cons

| Aspect | Pros | Cons |
|--------|------|------|
| **Code Sharing** | Types, utilities shared easily | Initial migration complexity |
| **CI/CD** | Single pipeline for both | Overkill for small projects |
| **Development** | `turbo dev` runs everything | Learning curve for monorepo tools |
| **Consistency** | Shared linting, TypeScript configs | Build times increase |
| **Atomic Deploys** | Frontend/API deploy together | More complex rollback |
| **Team Scaling** | Clear package boundaries | Needs team alignment |

### Migration Complexity: **MEDIUM-HIGH**
- Estimated effort: 1-2 days
- Significant repository restructuring
- CI/CD pipeline changes
- Team workflow adjustments

---

## Comparison Table

| Criteria | Option 1: Vercel Serverless | Option 2: Hybrid (Recommended) | Option 3: Monorepo |
|----------|----------------------------|--------------------------------|--------------------|
| **Setup Time** | 2-3 days | 4-6 hours | 1-2 days |
| **Code Changes** | Extensive refactoring | Minimal | Moderate restructuring |
| **Ongoing Complexity** | Low (single platform) | Medium (two platforms) | Medium (Turborepo) |
| **Cost at Start** | $0-5/mo | $0/mo | $0/mo |
| **Cost at Scale** | Vercel Pro + KV fees | API scaling costs | Vercel Pro |
| **SQLite Migration** | Required | Optional | Optional |
| **Cold Starts** | Occasional (functions) | None (always-on) | None |
| **Debugging** | Vercel logs only | Split logs | Unified logs |
| **Best For** | New projects | Existing projects needing quick deploy | Large teams, shared code |
| **Risk Level** | High (replatforming) | Low | Medium |

---

## Recommended Approach: Option 2 (Hybrid)

### Why Option 2?

1. **Minimal Effort:** Your current Express app with SQLite works as-is
2. **User Preference:** You want to use Vercel for the frontend
3. **Gradual Migration:** Can migrate to Postgres later without changing architecture
4. **Cost Effective:** Both platforms have generous free tiers
5. **Low Risk:** If something breaks, it's clear which platform is responsible

### Step-by-Step Setup Guide

#### Phase 1: Backend Deployment (Railway)

**Step 1.1:** Create Railway account
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login
```

**Step 1.2:** Create new project from GitHub
```bash
cd pantry-pal-api
railway init --name pantry-pal-api
railway link
```

**Step 1.3:** Configure persistent storage for SQLite
```bash
# In Railway dashboard, add Volume Mount:
# Mount Path: /app/data
# Target: pantry-pal-api service
```

Update database connection:
```javascript
// db.js modification
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/app/data/pantry.db'  // Railway volume
  : './pantry.db';          // Local dev
```

**Step 1.4:** Environment variables
```bash
railway variables set NODE_ENV=production
railway variables set FRONTEND_URL=https://your-app.vercel.app
railway variables set JWT_SECRET=$(openssl rand -hex 32)
```

**Step 1.5:** Add health check endpoint
```javascript
// Add to server.js
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

**Step 1.6:** Deploy
```bash
railway up
railway domain  # Get your URL
```

#### Phase 2: Frontend Deployment (Vercel)

**Step 2.1:** Connect GitHub repo
- Go to Vercel dashboard
- Import `pantry-pal` repo
- Framework: Next.js

**Step 2.2:** Environment variables
```
NEXT_PUBLIC_API_URL=https://pantry-pal-api-production.up.railway.app
```

**Step 2.3:** Add CORS config to Next.js
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
```

**Step 2.4:** Deploy
```bash
vercel --prod
```

#### Phase 3: Coordinated Deployments

**Step 3.1:** GitHub Actions for dependency awareness
```yaml
# .github/workflows/deploy-api.yml (in pantry-pal-api repo)
name: Deploy API

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway up --service pantry-pal-api
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
      
      - name: Notify deployment complete
        run: |
          curl -X POST "${{ secrets.DEPLOY_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d '{"service":"api","status":"deployed"}'
```

```yaml
# .github/workflows/deploy-web.yml (in pantry-pal repo)
name: Deploy Frontend

on:
  push:
    branches: [main]
  repository_dispatch:
    types: [api-deployed]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Vercel CLI
        run: npm install -g vercel@latest
      
      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Build
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Deploy
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

#### Phase 4: Optional - Migrate to Postgres (Future)

When ready to scale beyond SQLite:

**Step 4.1:** Add Railway Postgres
```bash
railway add --database postgres
railway connect postgres
```

**Step 4.2:** Migrate data using `pgloader` or custom script
```bash
# Convert SQLite to SQL
sqlite3 pantry.db .dump > pantry.sql

# Modify SQL for Postgres compatibility
# - Remove SQLite-specific pragmas
# - Change AUTOINCREMENT to SERIAL
# - Change types (TEXT remains, INTEGER becomes BIGINT)

# Import to Postgres
psql $DATABASE_URL < pantry.sql
```

---

## Cost Projections

### Option 2 (Recommended): Hybrid Vercel + Railway

**Month 1-3 (Hobby Phase):**
- Vercel: $0 (free tier: 100GB bandwidth)
- Railway: $0 (free $5 credit covers 500 hours)
- **Total: $0/month**

**Month 6 (Growth Phase):**
- Vercel: $0 (still within free tier)
- Railway: $5-20 (additional compute + storage)
- **Total: $5-20/month**

**Year 1 (Scale Phase):**
- Vercel: $20 (Pro plan for analytics, more bandwidth)
- Railway: $20-50 (Postgres + multiple instances)
- **Total: $40-70/month**

### vs Option 1: All Vercel

**Month 1-3:**
- Vercel Hosting: $0
- Vercel KV: $0 (250MB, 3k req/day)
- **Total: $0/month**

**Month 6:**
- Vercel Hosting: $20 (Pro)
- Vercel KV: $10 (higher volume)
- **Total: $30/month**

**Year 1:**
- Vercel Pro: $20
- Vercel KV/Postgres: $30-50
- **Total: $50-70/month**

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| CORS issues | Medium | Medium | Test all origins, use wildcard for previews |
| API downtime | Low | High | Health checks, Railway auto-restart |
| Data loss | Low | Critical | Railway volume backups, migrate to Postgres |
| Cost creep | Medium | Low | Set billing alerts, monitor usage |
| Deployment drift | Medium | Medium | Automated triggers, version pinning |

---

## Next Steps Checklist

### Immediate (This Week)
- [ ] Create Railway account and deploy `pantry-pal-api`
- [ ] Configure persistent volume for SQLite
- [ ] Deploy `pantry-pal` frontend to Vercel
- [ ] Set up CORS on backend
- [ ] Add `/health` endpoint
- [ ] Test end-to-end locally

### Short-term (Next 2 Weeks)
- [ ] Set up GitHub Actions auto-deploy
- [ ] Configure staging/preview environments
- [ ] Add monitoring (Railway metrics + Vercel Analytics)
- [ ] Document environment variables
- [ ] Create runbook for common issues

### Future Considerations
- [ ] Migrate SQLite → PostgreSQL when needed
- [ ] Evaluate adding Redis for session caching
- [ ] Implement API rate limiting
- [ ] Consider CDN for static assets
- [ ] Set up log aggregation (if scale increases)

---

## Additional Resources

- **Railway Docs:** https://docs.railway.app
- **Vercel Deployment:** https://vercel.com/docs/concepts/deployments
- **Fly.io Alternative:** https://fly.io/docs/
- **Turborepo:** https://turbo.build/repo/docs
- **CORS Guide:** https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

---

## Appendix: Database Migration Script

If migrating from SQLite to PostgreSQL:

```javascript
// scripts/migrate-sqlite-to-postgres.js
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();

const sqliteDb = new sqlite3.Database('/app/data/pantry.db');
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  // Get all pantry items from SQLite
  const items = await new Promise((resolve, reject) => {
    sqliteDb.all('SELECT * FROM items', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  
  // Insert into Postgres
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    
    for (const item of items) {
      await client.query(
        `INSERT INTO pantry_items (id, user_id, name, quantity, expiry_date, category)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [item.id, item.user_id, item.name, item.quantity, item.expiry_date, item.category]
      );
    }
    
    await client.query('COMMIT');
    console.log(`Migrated ${items.length} items`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  
  sqliteDb.close();
  await pgPool.end();
}

migrate().catch(console.error);
```

---

*Document generated: 2026-02-26*  
*For questions or updates, edit this file in `~/.openclaw/workspace/memory/`*