# REMY Analytics Subprocessor Disclosure

**Last Updated:** March 29, 2026  
**Effective Date:** March 29, 2026  
**Version:** 1.0

---

## Overview

This document provides transparency about the third-party subprocessors engaged by REMY Analytics, Inc. ("REMY") to process personal data on behalf of our customers in accordance with Article 28 of the General Data Protection Regulation (GDPR) and applicable data protection laws.

A "subprocessor" is any third-party data processor engaged by REMY who has or potentially will have access to customer data or hosting environments containing customer data.

---

## Subprocessor Categories

We categorize subprocessors by the function they perform:

| Category | Description |
|----------|-------------|
| **Hosting** | Cloud infrastructure and compute services |
| **Storage** | Object storage and data persistence |
| **Database** | Database management systems and authentication |
| **CDN** | Content delivery networks and edge caching |
| **Monitoring** | Application monitoring and error tracking |
| **Analytics** | Product analytics (optional integrations) |

---

## Active Subprocessors

### Infrastructure & Hosting

#### Railway
- **Legal Name:** Railway Technologies Inc.
- **Service:** Cloud hosting and compute infrastructure for application deployment
- **Location:** United States
- **Data Center Locations:** US West (California), US East (Virginia), EU West (Amsterdam)
- **Data Processing:** Infrastructure metadata, Application logs, System metrics
- **Security Certifications:** SOC 2 Type II, ISO 27001
- **DPA Status:** ✅ Signed
- **Transfer Mechanism:** Standard Contractual Clauses (2021 version)
- **Privacy Policy:** [railway.app/legal/privacy](https://railway.app/legal/privacy)
- **Security:** [railway.app/legal/security](https://railway.app/legal/security)

#### Vercel
- **Legal Name:** Vercel Inc.
- **Service:** Edge network and frontend deployment platform
- **Location:** United States
- **Data Center Locations:** Global Edge Network, US (Virginia), EU (Dublin)
- **Data Processing:** Static assets, Edge function logs, Deployment metadata
- **Security Certifications:** SOC 2 Type II, ISO 27001, GDPR
- **DPA Status:** ✅ Signed
- **Transfer Mechanism:** Standard Contractual Clauses (2021 version) + Data Processing Agreement
- **Privacy Policy:** [vercel.com/legal/privacy-policy](https://vercel.com/legal/privacy-policy)
- **Security:** [vercel.com/security](https://vercel.com/security)
- **DPA:** [vercel.com/legal/data-processing-agreement](https://vercel.com/legal/data-processing-agreement)

### Data Storage

#### Cloudflare R2
- **Legal Name:** Cloudflare, Inc.
- **Service:** Object storage for session recordings and asset storage
- **Location:** United States
- **Data Center Locations:** Global (200+ cities), North America, Europe, Asia-Pacific
- **Data Processing:** Session recordings, Asset files, Backup data
- **Data Sensitivity:** High
- **Security Certifications:** SOC 2 Type II, ISO 27001, ISO 27018, GDPR
- **DPA Status:** ✅ Signed
- **Transfer Mechanism:** Standard Contractual Clauses + EU SCCs for transfers
- **Privacy Policy:** [cloudflare.com/privacy](https://www.cloudflare.com/privacy/)
- **Security:** [cloudflare.com/security](https://www.cloudflare.com/security/)
- **DPA:** [cloudflare.com/cloudflare-customer-dpa](https://www.cloudflare.com/cloudflare-customer-dpa/)

### Database Services

#### Supabase
- **Legal Name:** Supabase Inc.
- **Service:** Managed PostgreSQL database and authentication services
- **Location:** United States
- **Data Center Locations:** AWS US East, AWS US West, AWS EU West, AWS Asia Pacific
- **Data Processing:** User data, Session metadata, Application data, Authentication data
- **Data Sensitivity:** High
- **Security Certifications:** SOC 2 Type II, ISO 27001, GDPR
- **DPA Status:** ✅ Signed
- **Transfer Mechanism:** Standard Contractual Clauses
- **Privacy Policy:** [supabase.com/privacy](https://supabase.com/privacy)
- **Security:** [supabase.com/security](https://supabase.com/security)
- **DPA:** [supabase.com/legal/dpa](https://supabase.com/legal/dpa)

### Content Delivery & Security

#### Cloudflare CDN
- **Legal Name:** Cloudflare, Inc.
- **Service:** Content delivery network and DDoS protection
- **Location:** United States
- **Data Center Locations:** Global (200+ cities)
- **Data Processing:** Cached content, TLS termination data, Access logs
- **Security Certifications:** SOC 2 Type II, ISO 27001, ISO 27701
- **DPA Status:** ✅ Signed
- **Transfer Mechanism:** Standard Contractual Clauses + adequacy where applicable
- **Privacy Policy:** [cloudflare.com/privacy](https://www.cloudflare.com/privacy/)
- **Compliance:** [cloudflare.com/trust-hub](https://www.cloudflare.com/trust-hub/compliance-resources/)
- **DPA:** [cloudflare.com/cloudflare-customer-dpa](https://www.cloudflare.com/cloudflare-customer-dpa/)

### Application Monitoring

#### Sentry
- **Legal Name:** Functional Software, Inc.
- **Service:** Error monitoring and application performance tracking
- **Location:** United States
- **Data Center Locations:** US (Iowa), EU (Belgium)
- **Data Processing:** Error logs, Stack traces, Device information, User context
- **Security Certifications:** SOC 2 Type II, ISO 27001
- **DPA Status:** ✅ Signed
- **Transfer Mechanism:** Standard Contractual Clauses (2021 version)
- **Privacy Policy:** [sentry.io/privacy](https://sentry.io/privacy/)
- **Security:** [sentry.io/security](https://sentry.io/security/)
- **DPA:** [sentry.io/legal/dpa](https://sentry.io/legal/dpa/)

---

## DPA Research Summary

### Railway DPA Status
Railway provides a Data Processing Agreement (DPA) as part of their Enterprise and Business plans. The DPA incorporates the EU Standard Contractual Clauses (2021 version) for international data transfers. Railway is SOC 2 Type II certified.

### Cloudflare R2 DPA Status
Cloudflare provides a comprehensive Customer Data Processing Agreement that covers all services including R2 storage. Cloudflare has certified compliance with the EU-US Data Privacy Framework and maintains EU SCCs for transfers. ISO 27018 certification provides additional protection for cloud privacy.

### Vercel DPA Status
Vercel provides a GDPR-compliant Data Processing Agreement that automatically applies to all customers. The DPA includes Standard Contractual Clauses and Vercel maintains EU data residency options through edge network configuration.

### Supabase DPA Status
Supabase provides a comprehensive Data Processing Agreement with Standard Contractual Clauses for international data transfers. Supabase undergoes annual SOC 2 Type II audits and maintains ISO 27001 certification.

### Sentry DPA Status
Sentry provides a Data Processing Agreement with Standard Contractual Clauses. Sentry offers both US and EU data residency options and maintains SOC 2 Type II certification.

---

## Data Transfer Safeguards

For subprocessors located outside the European Economic Area (EEA), we implement appropriate safeguards in accordance with GDPR Article 46:

1. **Standard Contractual Clauses (SCCs):** All subprocessors operating outside the EEA are required to sign the EU Commission's Standard Contractual Clauses (2021 version) as a transfer mechanism.

2. **Adequacy Decisions:** Where applicable, we rely on adequacy decisions for jurisdictions recognized by the European Commission as providing adequate protection.

3. **Binding Corporate Rules:** Some subprocessors operate under approved Binding Corporate Rules for international data transfers.

4. **Additional Technical Measures:**
   - End-to-end encryption for data in transit (TLS 1.3)
   - At-rest encryption using AES-256
   - IP anonymization options
   - Field-level data masking

---

## Subprocessor Changes

### Notification Process

REMY will notify customers of new subprocessors or changes to existing subprocessors:

- **New Subprocessors:** Minimum 30 days advance notice before any new subprocessor processes personal data
- **Material Changes:** Minimum 30 days notice for changes affecting data processing, security, or location
- **Non-Material Changes:** 7 days notice for non-material changes (e.g., new certifications)

### Notification Methods

Customers will be notified via:
1. Email notification to the primary account contact
2. In-app notification banner
3. Update to this disclosure document
4. API notification endpoint (for enterprise customers)

### Objection Process

Customers may object to a new subprocessor by contacting privacy@remyanalytics.com within **15 days** of notification. We will work with you to find a suitable alternative or, if not possible, allow termination of services in accordance with your Service Agreement.

---

## Security & Compliance Requirements

All subprocessors must meet or exceed the following requirements:

### Security Certifications (at least one required)
- SOC 2 Type II
- ISO 27001
- ISO 27018 (for cloud privacy)
- ISO 27701 (for privacy information management)

### Contractual Requirements
- Signed Data Processing Agreement (DPA)
- Standard Contractual Clauses for international transfers
- Confidentiality obligations for personnel
- Data breach notification within 24 hours
- Audit rights and annual third-party assessments

### Technical Requirements
- Encryption in transit (TLS 1.3 minimum)
- Encryption at rest (AES-256 minimum)
- Multi-factor authentication for administrative access
- Regular security assessments and penetration testing
- Incident response and business continuity plans

---

## Data Retention & Deletion

Subprocessor data retention is controlled by REMY and follows our retention policies:

| Data Type | Retention Period | Deletion Process |
|-----------|-----------------|------------------|
| Session recordings | Per customer configuration (default: 90 days) | Automated purging |
| Error logs | 30 days | Automated deletion |
| System metrics | 1 year | Automated archival |
| Access logs | 90 days | Automated deletion |

Upon contract termination, all subprocessors are contractually obligated to:
1. Return or delete all customer data within 30 days
2. Provide written certification of deletion
3. Delete backup data in accordance with their retention schedules (maximum 90 days)

---

## Audit & Verification

### Annual Reviews
- All subprocessors undergo annual security and compliance reviews
- Security certifications verified for currency
- Risk assessments updated annually

### Customer Audit Rights
Customers may request:
- Copy of current subprocessor DPA
- Summary of recent security assessments
- Details on data processing locations

Contact privacy@remyanalytics.com for audit-related requests.

### Third-Party Audits
REMY engages third-party auditors to verify subprocessor compliance annually. Audit reports are available to customers under NDA.

---

## Subprocessor History

### Recent Changes (Last 90 Days)

| Date | Change | Subprocessor | Details |
|------|--------|--------------|---------|
| 2026-03-29 | Initial disclosure | All | First publication of this subprocessor list |

### Planned Changes

None at this time. Check back for updates.

---

## Contact Information

### Data Protection Officer
**Email:** dpo@remyanalytics.com  
**Address:** REMY Analytics, Inc., 123 Privacy Lane, San Francisco, CA 94105

### Privacy Team
**Email:** privacy@remyanalytics.com  
**Web:** [remyanalytics.com/privacy](https://remyanalytics.com/privacy)

---

## Updates to This Disclosure

This disclosure is reviewed and updated quarterly. Updates will be:
- Posted to this page with an updated effective date
- Communicated to customers via email
- Recorded in the Subprocessor History section

---

## API Access

Subprocessor information is also available via our API:

```
GET /api/v1/subprocessors
```

Returns JSON-formatted subprocessor disclosure data for programmatic access.

For API documentation, visit: [docs.remyanalytics.com/api](https://docs.remyanalytics.com/api)

---

*This document is part of REMY's GDPR compliance program. For questions or concerns about our subprocessors, please contact privacy@remyanalytics.com.*

---

**Document Information**
- **Document ID:** subproc-disclosure-v1.0
- **Version:** 1.0
- **Effective Date:** March 29, 2026
- **Next Review:** June 29, 2026
- **Classification:** Public
