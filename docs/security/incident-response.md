# Security Incident Response Plan

**Document ID:** SEC-IRP-001  
**Version:** 1.0  
**Effective Date:** 2026-03-29  
**Owner:** Security Team / Data Protection Officer  
**Ticket:** REMY-260

---

## 1. Purpose and Scope

This document defines the Security Incident Response Plan (SIRP) for REMY Analytics, Inc. It establishes procedures for detecting, reporting, assessing, and responding to security incidents, with specific focus on personal data breaches subject to GDPR notification requirements.

**Scope:** All systems, applications, and processes handling personal data.

**Legal Basis:** GDPR Articles 33, 34, and 35.

---

## 2. Definitions

| Term | Definition |
|------|------------|
| **Security Incident** | Any event that compromises the confidentiality, availability, or integrity of data |
| **Personal Data Breach** | A breach of security leading to accidental/unlawful destruction, loss, alteration, or unauthorized disclosure of personal data |
| **DPIA** | Data Protection Impact Assessment |
| **DPA** | Data Protection Authority (Supervisory Authority) |
| **High Risk** | Likely to result in high risk to rights and freedoms of natural persons |

---

## 3. Incident Classification

### 3.1 Severity Levels

| Severity | Criteria | DPA Notification | Individual Notification |
|----------|----------|------------------|------------------------|
| **Low** | < 100 users, no special categories, remote harm likelihood | Not required | Not required |
| **Medium** | 100-1,000 users, or possible harm likelihood | Required | Assess |
| **High** | 1,000-10,000 users, probable harm, or special categories | Required | Required |
| **Critical** | > 10,000 users, certain harm, or sensitive special categories | Required | Required |

### 3.2 Breach Types

- **Unauthorized Access** - External or internal unauthorized system access
- **Unauthorized Disclosure** - Data shared with unauthorized recipients
- **Data Loss** - Accidental deletion or data unavailability
- **Data Corruption** - Unauthorized modification of data
- **Ransomware** - Malicious encryption of data
- **Insider Threat** - Malicious actions by authorized users
- **Third Party Breach** - Breach at data processor or partner
- **Physical Security** - Physical intrusion affecting data
- **Misconfiguration** - Accidental exposure due to configuration error

---

## 4. Incident Response Workflow

### 4.1 Detection Phase

**Discovery Sources:**
- Automated monitoring systems
- Security alerts and SIEM
- User reports
- Internal audits
- Penetration testing
- Third-party notifications
- Customer complaints

**Initial Actions:**
1. Document discovery timestamp
2. Preserve evidence
3. Contain immediate threat
4. Notify security team

### 4.2 Assessment Phase (Within 2 Hours)

**DPIA Notification:**
- Severity High/Critical: Immediate notification
- Severity Medium: Within 2 hours of discovery
- Severity Low: Document in incident log

**Assessment Criteria:**
- Number of affected data subjects
- Categories of personal data involved
- Special category data presence
- Likelihood of harm
- Severity of potential impact

### 4.3 Containment Phase (Ongoing)

**Immediate Containment:**
```
Priority 1: Stop ongoing unauthorized access
Priority 2: Preserve forensic evidence
Priority 3: Restore affected systems
```

**Containment Measures:**
- Revoke compromised credentials
- Isolate affected systems
- Block malicious IPs/ranges
- Disable vulnerable services
- Restrict access permissions

### 4.4 Notification Phase

**GDPR Article 33 - DPA Notification:**
- **Deadline:** 72 hours from becoming aware
- **Template:** `/legal/breach-templates/dpa-notification.md`
- **Recipient:** Lead supervisory authority (ICO for UK)

**GDPR Article 34 - Individual Notification:**
- **Trigger:** High risk to rights and freedoms
- **Deadline:** Without undue delay
- **Template:** `/legal/breach-templates/individual-notification.md`
- **Method:** Email, post, or public communication

**Customer Notification:**
- **Trigger:** Affects customer data or B2B relationships
- **Timeline:** Parallel to regulatory notifications
- **Template:** `/legal/breach-templates/customer-notification.md`

### 4.5 Remediation Phase

**Required Actions:**
1. Address root cause
2. Implement corrective measures
3. Verify effectiveness
4. Document lessons learned
5. Update security controls

---

## 5. Roles and Responsibilities

### 5.1 Incident Response Team

| Role | Responsibility |
|------|----------------|
| **Security Team Lead** | Overall incident coordination, DPA liaison |
| **Data Protection Officer** | GDPR compliance assessment, notification decisions |
| **Legal Counsel** | Regulatory requirements, legal risk assessment |
| **Engineering Lead** | Technical remediation, system hardening |
| **Communications Lead** | External/internal communications, stakeholder updates |

### 5.2 Escalation Matrix

| Severity | Escalation Path |
|----------|-----------------|
| Low | Security Team → Engineering |
| Medium | Security Team → DPO → Legal |
| High | Security Team → DPO → Legal → Senior Management |
| Critical | Security Team → DPO → Legal → CEO/Board → External Forensics |

---

## 6. Automated Monitoring

### 6.1 Detection Rules

**Bulk Data Export Detection:**
```
Trigger: > 1,000 records exported in single operation
Severity: Medium (assess context)
Action: Alert security team, log for review

Trigger: > 10,000 records exported
Severity: High
Action: Block export, require approval

Trigger: > 100,000 records exported
Severity: Critical
Action: Block and alert immediately
```

**Unusual Access Patterns:**
```
Trigger: Login from new country/IP
Severity: Low-Medium
Action: Alert user, require MFA

Trigger: Multiple failed logins (> 10 in 5 mins)
Severity: Medium
Action: Temporarily block account

Trigger: After-hours bulk access
Severity: Medium
Action: Log and alert
```

---

## 7. Notification Templates

All GDPR breach notification templates are located in `/legal/breach-templates/`:

1. **`dpa-notification.md`** - Article 33 supervisory authority notification
2. **`individual-notification.md`** - Article 34 data subject notification
3. **`customer-notification.md`** - Business/customer partner notification

---

## 8. API Reference

### 8.1 Incident Management API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/security/incidents` | GET | List security incidents |
| `/api/v1/security/incidents` | POST | Create new incident |
| `/api/v1/security/incidents/{id}` | GET | Get incident details |
| `/api/v1/security/incidents/{id}` | PATCH | Update incident |
| `/api/v1/security/incidents/{id}/notify` | POST | Trigger notification |

### 8.2 Database Schema

**Primary Table:** `security_incidents`
**Related Tables:**
- `security_incident_events` - Timeline tracking
- `security_incident_notifications` - Notification log

**Views:**
- `security_incidents_open` - Open incidents with deadline tracking
- `security_incident_statistics` - Compliance metrics
- `security_incident_gdpr_compliance` - GDPR compliance dashboard

---

## 9. Compliance Tracking

### 9.1 GDPR Timeline Requirements

| Requirement | Deadline | Tracking |
|------------|----------|----------|
| DPA Notification (Article 33) | 72 hours from awareness | `dpa_notified_at` |
| Individual Notification (Article 34) | Without undue delay | `individuals_notified_at` |

---

## 10. Contact Information

**Primary Security Contact:**  
security@remyanalytics.com

**Data Protection Officer:**  
dpo@remyanalytics.com

**Emergency Security Line:**  
Available 24/7 to authorized personnel

---

## 11. Testing and Review

### 11.1 Tabletop Exercises

**Frequency:** Quarterly  
**Participants:** Incident Response Team, Legal, Engineering  
**Scenarios:**
- Data breach in production database
- Ransomware attack
- Insider threat
- Third-party processor breach
- Misconfiguration exposure

### 11.2 Plan Review

**Annual Review:** Full review of this document  
**After Each Incident:** Post-incident review  
**Trigger Events:** Major infrastructure changes, new regulatory requirements

---

*Document controlled by: Security Team*  
*Last updated: 2026-03-29*  
*Next review: 2027-03-29*
