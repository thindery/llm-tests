# Vercel Deployment from Git

This feature enables automatic deployment of sites from GitHub repository subdirectories using Vercel.

## Overview

- **Deploy from subdirectory:** `sites/{siteName}/`
- **Auto-deploy on push:** GitHub push triggers Vercel deployment
- **Custom domains:** `{siteName}-{userId}.agentpaige.com`
- **Release tracking:** All deployments tracked in `site_releases` table

## Architecture

```
Git Push → Vercel Build → Webhook Event → Database Update
     ↑                                              ↓
  GitHub                                      Custom Domain
```

## Files Created

### Database
- `supabase/migrations/add_site_deployments.sql` - Tables for sites and releases

### Library
- `src/lib/vercel/deploy.ts` - Deployment functions
- `src/lib/vercel/webhook-handler.ts` - Webhook event processing
- `src/lib/vercel/index.ts` - Module exports

### API Routes
- `src/app/api/deploy/webhook/route.ts` - Vercel webhook endpoint
- `src/app/api/deploy/trigger/route.ts` - Manual deployment trigger

## Database Schema

### sites
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | TEXT | Owner ID |
| site_name | TEXT | Site name |
| repo_name | TEXT | GitHub repo (org/repo) |
| subdirectory | TEXT | Path in repo (e.g., `sites/portfolio`) |
| project_id | TEXT | Vercel project ID |
| custom_domain | TEXT | Custom domain |
| status | ENUM | inactive, building, ready, error |

### site_releases
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| site_id | UUID | Reference to sites |
| deployment_id | TEXT | Vercel deployment ID |
| git_commit_sha | TEXT | Git commit SHA |
| status | ENUM | pending, building, ready, error, canceled |
| url | TEXT | Deployment URL |
| custom_domain_url | TEXT | URL with custom domain |

## Environment Variables

```bash
# Vercel API
VERCEL_TOKEN=your_vercel_token
VERCEL_WEBHOOK_SECRET=your_webhook_secret_for_verification

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

## API Usage

### Trigger Manual Deployment

```bash
POST /api/deploy/trigger
Content-Type: application/json

{
  "siteId": "uuid-of-site",
  "commitSha": "optional-commit-sha-for-rollback"
}
```

Response:
```json
{
  "success": true,
  "deploymentId": "dpl_xxx",
  "releaseId": "uuid-of-release",
  "url": "https://site-username-agentpaige.vercel.app"
}
```

### Webhook Endpoint (Vercel → App)

```bash
POST /api/deploy/webhook
Content-Type: application/json

# Vercel webhook payload format
{
  "id": "evt_xxx",
  "type": "deployment.succeeded",
  "createdAt": 1700000000,
  "payload": {
    "deployment": {
      "id": "dpl_xxx",
      "name": "site-name",
      "url": "https://...",
      "meta": {
        "githubCommitSha": "abc123...",
        "githubCommitBranch": "main"
      }
    }
  }
}
```

## Vercel API Integration

### Deploy from Git

```typescript
import { deployFromGit } from '@/lib/vercel';

const result = await deployFromGit({
  siteId: 'site-uuid',
  userId: 'user123',
  siteName: 'portfolio',
  repo: 'agent-paige-sites/user123',
  ref: 'main',
  rootDirectory: 'sites/portfolio',
  projectId: 'prj_xxx', // optional
});
```

### Rollback to Previous Release

```typescript
import { rollbackToRelease } from '@/lib/vercel';

const result = await rollbackToRelease('release-uuid');
```

## Custom Domain Format

Sites are deployed to custom domains with the pattern:
```
{siteName}-{userId}.agentpaige.com
```

Example: `portfolio-user123.agentpaige.com`

## Setup Instructions

1. **Configure Vercel Integration:**
   - Get Vercel token from https://vercel.com/account/tokens
   - Add webhook endpoint in Vercel project settings
   - Point webhook to `https://your-app.com/api/deploy/webhook`

2. **Run Database Migration:**
   ```bash
   # Apply the migration to create tables
   supabase db push
   ```

3. **Set Environment Variables:**
   - Add all required env vars to your deployment platform

4. **Create Site in Database:**
   ```sql
   INSERT INTO sites (user_id, site_name, repo_name, subdirectory, project_id)
   VALUES ('user123', 'portfolio', 'agent-paige-sites/user123', 'sites/portfolio', 'prj_xxx');
   ```

## Webhook Events Handled

- `deployment.created` - New deployment started
- `deployment.building` - Build in progress
- `deployment.succeeded` - Deployment complete
- `deployment.failed` - Deployment failed
- `deployment.canceled` - Deployment canceled
- `deployment.ready` - Deployment ready (alias assigned)
- `deployment.error` - Error during deployment

## Security Considerations

1. **Webhook Verification:** Implement signature verification in production
2. **Authentication:** Protect manual trigger endpoint with auth
3. **Rate Limiting:** Consider rate limits on deployment triggers
4. **Secrets:** Store Vercel token securely, never in client code
