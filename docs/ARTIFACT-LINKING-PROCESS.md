# Artifact Linking Process for Remy-Tracker

## Overview
This document describes how to properly create artifacts and link them to tickets in Remy-Tracker.

**Last Updated:** 2026-03-15 (after REMY-186 fix)

---

## API-Based Workflow (Recommended)

Since REMY-186 was fixed, use the API endpoints for all artifact operations.

### Step 1: Create an Artifact

**Endpoint:** `POST /api/artifacts`

```bash
curl -X POST http://localhost:3474/api/artifacts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Kalshi SDK Research",
    "file_name": "SDK-RESEARCH.md",
    "content": "# Kalshi SDK Research\n\nDocument content here...",
    "description": "Optional description"
  }'
```

**Response:**
```json
{
  "id": 24,
  "artifact_number": "ART-001",
  "title": "Kalshi SDK Research",
  "file_name": "SDK-RESEARCH.md",
  "file_size": 8776,
  "mime_type": "text/markdown"
}
```

**Alternative: Import from file path:**
```bash
curl -X POST http://localhost:3474/api/artifacts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Kalshi SDK Research",
    "file_name": "SDK-RESEARCH.md",
    "file_path": "~/projects/kalshi-trader/docs/SDK-RESEARCH.md"
  }'
```

### Step 2: Link Artifact to Ticket

**Endpoint:** `POST /api/tickets/{ticketId}/artifacts`

```bash
curl -X POST http://localhost:3474/api/tickets/153/artifacts \
  -H "Content-Type: application/json" \
  -d '{"artifactId": 24}'
```

**Response:**
```json
{
  "success": true,
  "ticketId": 153,
  "artifactId": 24
}
```

### Step 3: Verify Link

**Endpoint:** `GET /api/tickets/{ticketId}/artifacts`

```bash
curl http://localhost:3474/api/tickets/153/artifacts
```

**Response:**
```json
{
  "ticketId": 153,
  "artifacts": [
    {
      "id": 24,
      "artifact_number": "ART-001",
      "title": "Kalshi SDK Research",
      "file_name": "SDK-RESEARCH.md"
    }
  ],
  "count": 1
}
```

---

## Complete Example

Linking a research document to REMY-130:

```bash
# 1. Create the artifact
ARTIFACT_ID=$(curl -s -X POST http://localhost:3474/api/artifacts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Kalshi SDK Research - SDK-RESEARCH.md",
    "file_name": "SDK-RESEARCH.md",
    "content": "# Kalshi SDK Research\n\nComprehensive research on Kalshi SDK options..."
  }' | jq -r '.id')

# 2. Link to ticket (REMY-130 = ticket ID 153)
curl -X POST http://localhost:3474/api/tickets/153/artifacts \
  -H "Content-Type: application/json" \
  -d "{\"artifactId\": $ARTIFACT_ID}"

# 3. Verify
curl http://localhost:3474/api/tickets/153/artifacts
```

---

## File Locations

**Research documents should be stored in:**
- Kalshi-Trader: `~/projects/kalshi-trader/docs/`
- General research: `~/.openclaw/workspace/memory/`
- Project-specific: `{project}/docs/`

---

## Current Kalshi-Trader Research Documents

| Ticket | Artifact | Document | Status |
|--------|----------|----------|--------|
| REMY-130 | KALSHI-001 | SDK-RESEARCH.md | ✅ Linked |
| REMY-131 | KALSHI-002 | MARKET-DATA-API.md | ✅ Linked |
| REMY-132 | KALSHI-003 | ORDER-API.md | ✅ Linked |
| REMY-133 | KALSHI-004 | DEMO-ENVIRONMENT.md | ✅ Linked |
| REMY-153 | KALSHI-005 | ML-PIPELINE-RESEARCH.md | ✅ Linked |

---

## API Reference

### Create Artifact
- **URL:** `POST /api/artifacts`
- **Body:** `{ title, file_name, content?, file_path?, description? }`
- **Allowed extensions:** `.md`, `.txt`
- **Max size:** 1MB

### Link to Ticket
- **URL:** `POST /api/tickets/{ticketId}/artifacts`
- **Body:** `{ artifactId }`
- **Note:** Use camelCase `artifactId`, not snake_case

### Unlink from Ticket
- **URL:** `DELETE /api/tickets/{ticketId}/artifacts`
- **Body:** `{ artifactId }`

### Get Ticket Artifacts
- **URL:** `GET /api/tickets/{ticketId}/artifacts`

### Get All Artifacts
- **URL:** `GET /api/artifacts`
- **Query params:** `?search={term}&limit={n}&offset={n}`

---

## Troubleshooting

**Error: "Invalid file type"**
- Ensure file_name ends with `.md` or `.txt`
- Extension is case-insensitive

**Error: "Failed to link artifact"**
- Use `artifactId` (camelCase), not `artifact_id`
- Verify ticket ID and artifact ID exist

**Error: "Duplicate artifact"**
- Content hash matches existing artifact
- Use existing artifact and link to ticket instead

---

## Related Tickets

- **REMY-186:** Fix Artifact API - File Type Validation Bug (completed)
- **REMY-130-153:** Kalshi-Trader research documents (all linked)

---

**Document Created:** 2026-03-15  
**Updated:** 2026-03-15 (post REMY-186 fix)  
**Purpose:** Document artifact linking process for team consistency
