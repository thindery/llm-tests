# GDPR Legal Basis Implementation

This document describes the GDPR legal basis implementation for the AgentTrace platform.

## Overview

AgentTrace implements comprehensive GDPR Article 30 processing activity records to ensure compliance with data protection regulations. All data processing activities are documented with legal basis, retention policies, and security measures.

## Legal Basis Types

The following GDPR Article 6 legal bases are supported:

| Basis Type | Code | Description |
|------------|------|-------------|
| Consent | 6.1(a) | Data subject has given consent |
| Contract | 6.1(b) | Processing necessary for contract performance |
| Legal Obligation | 6.1(c) | Compliance with legal obligation |
| Vital Interests | 6.1(d) | Protecting vital interests |
| Public Task | 6.1(e) | Task in public interest |
| Legitimate Interest | 6.1(f) | Legitimate interests (requires LIA) |

## Processing Activities

### Default Activities

When a project is created, the following default processing activities are established:

#### Session Replay Analytics
- **Purpose**: Record and replay user sessions for debugging and UI/UX analysis
- **Legal Basis**: Legitimate Interest (Analytics)
- **Data Categories**: session_id, user_actions, timestamp, url, user_agent
- **Retention**: 90 days
- **Recipients**: Internal team only
- **Safeguards**: Data encrypted at rest and in transit; access restricted to authorized personnel

### Creating Custom Activities

You can create custom processing activities via:

1. **Dashboard**: Navigate to `/dashboard/[project]/privacy`
2. **API**: Use the `/api/v1/processing/activities` endpoints

### Activity Requirements

Each processing activity must specify:

- **Name**: Clear, descriptive name
- **Purpose**: Why the data is being processed
- **Legal Basis**: One of the six GDPR Article 6 bases
- **Data Categories**: What types of data are processed
- **Retention Period**: How long data is kept
- **Recipients**: Who can access the data
- **Safeguards**: Security measures in place

## Legitimate Interest Assessment (LIA)

When using "Legitimate Interest" (Art. 6.1f) as legal basis, you must document a Legitimate Interest Assessment (LIA) that addresses:

1. **Purpose test**: What is the legitimate interest?
2. **Necessity test**: Why is processing necessary to achieve this interest?
3. **Balancing test**: Do data subject rights override the interest?

### Default LIA Template

```markdown
## Legitimate Interest Assessment: {Activity Name}

### Purpose Test
We have a legitimate interest in understanding how users interact with our 
services to improve functionality and user experience.

### Necessity Test
Session replay is necessary to:
- Identify and resolve technical issues
- Understand user journey patterns
- Improve user interface design
- Detect fraudulent activity

### Balancing Test
- Impact: Low - session data is pseudonymous
- User Expectations: Users expect services to work properly
- Rights: Users can opt out, request deletion, or object
- Mitigation: Data is encrypted, access is restricted, retention is limited
```

## API Reference

### Endpoints

#### Processing Activities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/processing/activities` | List all activities |
| POST | `/api/v1/processing/activities` | Create activity |
| GET | `/api/v1/processing/activities/{id}` | Get activity details |
| PATCH | `/api/v1/processing/activities/{id}` | Update activity |
| DELETE | `/api/v1/processing/activities/{id}` | Delete activity (soft) |

#### Legal Basis

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/processing/legal-basis` | List all legal basis |
| POST | `/api/v1/processing/legal-basis` | Create legal basis |
| GET | `/api/v1/processing/legal-basis/{id}` | Get legal basis details |
| PATCH | `/api/v1/processing/legal-basis/{id}` | Update legal basis |
| DELETE | `/api/v1/processing/legal-basis/{id}` | Delete legal basis (soft) |

#### Export (Article 30 Compliance)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/processing/export/csv` | Export as CSV |
| GET | `/api/v1/processing/export/markdown` | Export as Markdown |

### Example: Create Legal Basis

```bash
curl -X POST "https://api.agenttrace.com/api/v1/processing/legal-basis?project_id=my-project" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Analytics",
    "basis_type": "legitimate_interest",
    "description": "Processing for analytics and UX improvement",
    "legitimate_interest_reason": "We have a legitimate interest in understanding user behavior..."
  }'
```

### Example: Create Processing Activity

```bash
curl -X POST "https://api.agenttrace.com/api/v1/processing/activities?project_id=my-project" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Session Recording",
    "purpose": "Record user sessions for debugging",
    "legal_basis_id": "uuid-of-legal-basis",
    "data_categories": ["session_id", "user_actions", "timestamp"],
    "data_retention_days": 90,
    "recipients": "Internal engineering team",
    "safeguards": "Encrypted storage, access restricted"
  }'
```

## SDK Integration

When initializing the AgentTrace SDK, include the legal basis ID:

```javascript
import { AgentTrace } from '@agenttrace/sdk';

const tracker = new AgentTrace({
  projectId: 'your-project-id',
  apiKey: 'your-api-key',
  legalBasis: {
    id: 'uuid-of-legal-basis',
    consentRequired: false  // Set to true if using consent basis
  }
});

tracker.init();
```

## Data Subject Rights

The processing activities system supports GDPR data subject rights:

- **Right to be informed**: Processing activities are documented
- **Right of access**: Activities can be exported
- **Right to rectification**: Event data can be updated
- **Right to erasure**: Events can be deleted
- **Right to restrict processing**: Activities can be deactivated
- **Right to data portability**: Export in machine-readable format
- **Right to object**: Legitimate interest basis can be challenged

## Article 30 Record Keeping

Organization must maintain records of processing activities. Use the export endpoints to generate Article 30 compliant reports:

- **CSV format**: For supervisory authority submission
- **Markdown format**: For internal documentation

To generate a report:

1. Go to `/dashboard/[project]/privacy`
2. Click "Export Article 30 Records"
3. Select format (CSV or Markdown)
4. Download or copy to clipboard

## Compliance Checklist

- [ ] Define legal basis for each processing activity
- [ ] Document Legitimate Interest Assessments (if applicable)
- [ ] Specify data retention periods
- [ ] Identify data recipients
- [ ] Document security safeguards
- [ ] Regular review of processing activities (quarterly recommended)
- [ ] Export Article 30 records for audit

## Related Documentation

- `/legal/lia-template.md` - Legitimate Interest Assessment template
- GDPR Article 30: Records of processing activities
- GDPR Article 6: Lawfulness of processing

## Support

For questions about GDPR compliance or processing activities:

- Email: privacy@agenttrace.com
- Dashboard: `/dashboard/[project]/privacy`
- API Documentation: `/docs`
