# Data Processing Agreement (DPA)

**Version:** 1.0  
**Effective Date:** {{EFFECTIVE_DATE}}  
**Controller:** {{CONTROLLER_NAME}} ("Customer")  
**Processor:** REMY Analytics, Inc. ("Processor")

---

## Article 1: Subject Matter and Duration

### 1.1 Subject Matter
This Data Processing Agreement ("DPA") sets out the terms for processing personal data on behalf of the Controller in accordance with Article 28 of the General Data Protection Regulation (EU) 2016/679 ("GDPR").

### 1.2 Duration
This DPA shall remain in effect for the duration of the Service Agreement between the parties and shall automatically terminate upon cessation of the Service Agreement, unless terminated earlier in accordance with its terms or as required by applicable law. Upon termination, Processor shall return or delete all personal data in accordance with Article 11.

---

## Article 2: Nature and Purpose of Processing

### 2.1 Processing Activities
The Processor shall process personal data for the following purposes:
- **Session Recording:** Capturing user interactions with Customer's websites for UX analysis, debugging, and optimization
- **Analytics:** Aggregating user behavior data to generate insights, heatmaps, and conversion funnels
- **Error Tracking:** Identifying and diagnosing technical issues and JavaScript errors
- **Performance Monitoring:** Measuring page load times and application performance metrics

### 2.2 Processing Nature
Processing activities include:
- Collection and storage of interaction data
- Automated analysis and categorization of user sessions
- Generation of aggregated reports and visualizations
- Temporary caching for performance optimization

---

## Article 3: Types of Personal Data

The Processor shall process the following categories of personal data:

| Category | Data Elements |
|----------|--------------|
| **Technical Identifiers** | IP address (anonymized/last octet truncated), device ID, session ID |
| **Browser Data** | User agent string, browser type and version, operating system, screen resolution |
| **Interaction Data** | Page views, clicks, scrolls, form inputs (non-sensitive), mouse movements, touch events |
| **Geolocation** | Approximate location derived from IP address (country/region level) |
| **Timestamps** | Session start/end times, page visit durations, event timestamps |

**Note:** The Processor does NOT intentionally collect:
- Special category data (Article 9 GDPR)
- Financial information
- Government identifiers
- Health data
- Biometric data

---

## Article 4: Categories of Data Subjects

The personal data processed relates to the following categories of data subjects:

1. **Website Visitors** – End users who visit and interact with Customer's websites
2. **Registered Users** – Authenticated users of Customer's applications
3. **Customer Support Users** – Users submitting support requests or feedback forms
4. **Beta Testers** – Users participating in Customer's testing programs

---

## Article 5: Controller Obligations

### 5.1 Consent and Transparency
The Controller shall:
- Obtain lawful consent from data subjects where required
- Provide transparent privacy notices informing users of session recording
- Honor opt-out requests and "Do Not Track" signals
- Ensure data subjects are informed of their rights under GDPR

### 5.2 Lawful Basis
The Controller warrants that it has a valid lawful basis for processing under Article 6 GDPR, including:
- Legitimate interest (for session analytics and website optimization)
- Consent (where required for certain tracking activities)
- Contractual necessity (where applicable)

### 5.3 Data Minimization
The Controller agrees to:
- Configure the Services to exclude sensitive data fields from recording
- Implement data masking for personally identifiable information
- Not intentionally transmit special category data to the Processor

---

## Article 6: Subprocessor Authorization

### 6.1 Authorized Subprocessors
The Controller hereby authorizes the Processor to engage the following Subprocessors:

| Subprocessor | Purpose | Location |
|--------------|---------|----------|
| Amazon Web Services (AWS) | Cloud infrastructure and storage | EU (Frankfurt), US |
| Cloudflare | CDN and security services | Global |
| PostHog | Product analytics (optional integration) | EU, US |
| Sentry | Error tracking and monitoring | US |

### 6.2 Subprocessor Changes
The Processor shall:
- Notify the Controller at least 30 days in advance of adding or replacing Subprocessors
- Provide the Controller the opportunity to object to changes
- Ensure all Subprocessors are bound by data protection obligations equivalent to this DPA

### 6.3 Liability
The Processor remains fully liable to the Controller for the performance of its Subprocessors' obligations.

---

## Article 7: Security Measures

The Processor shall implement appropriate technical and organizational measures (TOMs) to ensure a level of security appropriate to the risk:

### 7.1 Encryption
- **Data in Transit:** TLS 1.3 encryption for all data transmission
- **Data at Rest:** AES-256 encryption for stored personal data
- **Key Management:** Hardware Security Modules (HSM) for key storage and rotation

### 7.2 Access Controls
- Role-based access control (RBAC) with principle of least privilege
- Multi-factor authentication (MFA) required for all administrative access
- Regular access reviews and automatic deprovisioning
- Audit logging of all data access and administrative actions

### 7.3 Infrastructure Security
- SOC 2 Type II certified data centers
- Network segmentation and firewall protection
- Intrusion detection and prevention systems
- Regular vulnerability scanning and penetration testing
- DDoS protection

### 7.4 Data Minimization
- Automatic data retention limits (configurable by Customer)
- IP address anonymization options
- Field-level data masking capabilities
- Session recording opt-out mechanisms

---

## Article 8: Data Subject Rights Assistance

### 8.1 Cooperation
The Processor shall promptly notify the Controller of any data subject requests received directly and shall not respond to such requests without the Controller's authorization.

### 8.2 Technical Assistance
Upon the Controller's written request, the Processor shall provide reasonable technical assistance to enable the Controller to fulfill its obligations to respond to:
- **Access Requests (Article 15):** Export of personal data in machine-readable format
- **Rectification (Article 16):** Correction of inaccurate personal data
- **Erasure (Article 17):** Deletion of personal data ("right to be forgotten")
- **Restriction (Article 18):** Suspension of processing activities
- **Data Portability (Article 20):** Structured export of personal data
- **Objection (Article 21):** Cessation of processing where objected to

### 8.3 Response Time
The Processor shall provide requested assistance within 5 business days of receiving the Controller's request.

---

## Article 9: Data Breach Notification

### 9.1 Breach Detection
The Processor shall implement and maintain appropriate measures to detect personal data breaches.

### 9.2 Notification Timing
In the event of a personal data breach affecting personal data processed under this DPA, the Processor shall:
- Notify the Controller without undue delay and in any event within **24 hours** of becoming aware of the breach
- Provide all relevant information including:
  - Nature of the breach
  - Categories and approximate number of data subjects affected
  - Likely consequences
  - Measures taken or proposed to address the breach

### 9.3 Documentation
The Processor shall maintain records of all personal data breaches and make such records available to the Controller upon request.

---

## Article 10: Audit Rights

### 10.1 Annual Audit
The Controller, or an independent auditor appointed by the Controller, shall have the right to audit the Processor's compliance with this DPA annually at the Controller's expense.

### 10.2 Audit Scope
Audits may include:
- Review of documentation relating to security measures
- Verification of Subprocessor agreements
- Inspection of data processing facilities
- Review of access logs and security incident records

### 10.3 Additional Audits
Additional audits may be conducted at the Controller's request where:
- Required by a supervisory authority
- Triggered by a breach or suspected breach
- Mandated by changes in applicable law

### 10.4 Audit Conditions
The Controller shall:
- Provide reasonable advance notice (minimum 30 days)
- Conduct audits during business hours
- Ensure auditors are bound by confidentiality obligations
- Not disrupt Processor's operations

---

## Article 11: Data Return and Deletion

### 11.1 Upon Termination
Upon termination or expiry of the Service Agreement, the Processor shall, at the Controller's election:
- **Return:** Provide all personal data in a structured, commonly used, machine-readable format (e.g., JSON, CSV)
- **Delete:** Permanently delete all copies of personal data from its systems

### 11.2 Deletion Timeline
All personal data shall be returned or deleted within 30 days of termination, unless:
- Required to be retained by applicable law
- Necessary for the establishment, exercise, or defense of legal claims

### 11.3 Certification
Upon completion, the Processor shall provide written certification confirming the return or deletion of personal data.

### 11.4 Backup Data
Backups containing personal data shall be deleted in accordance with the Processor's backup retention policy (not to exceed 90 days), provided such data is not restored to active systems.

---

## Article 12: Data Protection Officer

### 12.1 DPO Contact
The Processor has designated a Data Protection Officer:

**Email:** dpo@remyanalytics.com  
**Address:** REMY Analytics, Inc., 123 Privacy Lane, San Francisco, CA 94105

### 12.2 Communications
All data protection inquiries, breach notifications, and data subject requests should be directed to the DPO.

---

## Article 13: Limitation of Liability

### 13.1 Contractual Liability
Each party's liability arising out of or in connection with this DPA shall be subject to the limitation of liability provisions in the Service Agreement.

### 13.2 GDPR Liability
Nothing in this DPA limits the liability of either party for:
- Violations of GDPR provisions for which such party is directly responsible
- Failure to comply with supervisory authority orders
- Willful misconduct or gross negligence

### 13.3 Indemnification
The Processor shall indemnify and hold harmless the Controller from and against any claims, damages, losses, and expenses (including legal fees) arising from the Processor's breach of this DPA or violation of applicable data protection law.

---

## Article 14: General Provisions

### 14.1 Governing Law
This DPA shall be governed by and construed in accordance with the laws of the State of California, without regard to conflict of law principles.

### 14.2 Severability
If any provision of this DPA is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.

### 14.3 Amendments
This DPA may only be amended by written agreement signed by both parties.

### 14.4 Entire Agreement
This DPA, together with the Service Agreement and Privacy Policy, constitutes the entire agreement between the parties concerning data processing.

---

## Article 15: Signature and Execution

By executing this DPA, the parties acknowledge and agree to be bound by its terms.

**CONTROLLER (Customer):**

Signed: ___________________________

Name: {{CONTROLLER_REP_NAME}}

Title: {{CONTROLLER_REP_TITLE}}

Date: {{SIGNATURE_DATE}}

---

**PROCESSOR (REMY Analytics, Inc.):**

Signed: ___________________________

Name: {{PROCESSOR_REP_NAME}}

Title: {{PROCESSOR_REP_TITLE}}

Date: {{SIGNATURE_DATE}}

---

## Appendix A: Technical and Organizational Measures

See Processor's Security Documentation at https://remyanalytics.com/security

## Appendix B: Data Processing Details

| Element | Description |
|---------|-------------|
| Processing Purpose | Session recording, user analytics, error tracking |
| Data Categories | IP address, user agent, interaction data, timestamps |
| Data Subjects | Website visitors, registered users |
| Retention Period | Configurable (default: 90 days) |
| Data Location | EU (primary), US (backup) |

---

*This Data Processing Agreement is effective as of {{EFFECTIVE_DATE}}*

Document ID: {{DOCUMENT_ID}}  
Digital Signature: {{DIGITAL_SIGNATURE}}  
Generated: {{GENERATED_TIMESTAMP}}
