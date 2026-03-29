# Legitimate Interest Assessment (LIA) Template

This template helps document your Legitimate Interest Assessment (LIA) when using **Article 6.1(f)** (Legitimate Interest) as your legal basis for processing under GDPR.

---

## Assessment Date: {YYYY-MM-DD}

## Processing Activity: {Activity Name}

## Data Controller: {Organization Name}

---

## 1. Purpose Test

**What is the legitimate interest?**

_Describe why you want to process the data. What are you trying to achieve?_

Example:
> We have a legitimate interest in understanding how users interact with our services to:
> - Identify and resolve technical issues promptly
> - Understand user journey patterns and pain points
> - Improve user interface and user experience
> - Monitor for fraudulent or malicious activity
> - Optimize service performance and reliability

---

## 2. Necessity Test

**Is the processing necessary to achieve the legitimate interest?**

_Explain why this processing is necessary. Could you achieve the same result another way?_

Example:
> Session replay is necessary because:
> - Error reports alone don't provide context about what led to an error
> - Traditional analytics (heatmaps, clickmaps) don't show complete user flows
> - Without session data, user-reported issues cannot be reproduced and fixed
> - Alternative: User interviews are expensive, infrequent, and may not capture actual behavior
> - Alternative: Direct observation is not scalable for distributed users

---

## 3. Balancing Test

### 3.1 Impact on Data Subjects

**What is the impact on individuals' privacy?**

- [ ] **Minimal**: Aggregated, anonymized data only
- [ ] **Low**: Pseudonymous identifiers, no directly identifiable PII
- [x] **Medium**: May include user actions, form inputs (passwords excluded)
- [ ] **High**: Includes identifiable PII or sensitive data

**Mitigation measures:**
- Form fields with `type="password"` are automatically masked/excluded
- PII detection and redaction for known patterns (emails, SSN, credit cards)
- Short retention periods (default: 90 days)
- Access restricted to authorized personnel

### 3.2 Data Subject Expectations

**Would individuals reasonably expect this processing?**

- Users understand that services track usage for improvement
- Privacy policy clearly discloses session recording
- Data is used internally only, not sold or shared
- No individual profiling for decisions with legal/significant effects

### 3.3 Control and Rights

**How can individuals exercise their rights?**

- **Transparency**: Privacy policy clearly explains processing
- **Opt-out**: Users can disable session recording (via cookie/consent manager)
- **Access**: Users can request their session data
- **Rectification**: Users can request corrections to associated data
- **Erasure**: Users can request deletion of their session data
- **Objection**: Users can object to processing based on legitimate interest

**Balancing:**
- Impact: Low to medium (usage data, not sensitive)
- User rights: Fully supported
- Transparency: Clear privacy policy
- **Conclusion: Legitimate interest prevails in this case**

---

## 4. Documentation

**Responsible Team:** {Team Name}

**Review Frequency:** Quarterly

**Last Review:** {YYYY-MM-DD}

**Next Review:** {YYYY-MM-DD}

**Approved By:**
- Name: {Name}
- Role: {DPO / Privacy Lead / Manager}
- Date: {YYYY-MM-DD}

---

## Quick Reference: LIA Decision Tree

```
                    ┌─────────────────────────────┐
                    │    Is there a legitimate    │
                    │      interest? (Purpose)     │
                    └───────────┬─────────────────┘
                                │ Yes
                    ┌───────────▼─────────────────┐
                    │  Is processing necessary  │
                    │         (Necessity)       │
                    └───────────┬───────────────┘
                                │ Yes
                    ┌───────────▼───────────────┐
                    │  Do individual interests  │
                    │      override?            │
                    │    (Balancing)            │
                    └───────────┬───────────────┘
                          No  │               │ Yes
                    ┌─────────▼───┐     ┌───────▼────────┐
                    │  LEGITIMATE │     │ NOT LEGITIMATE │
                    │   INTEREST  │     │    INTEREST    │
                    └─────────────┘     │ Use another    │
                                          │ basis or stop  │
                                          └────────────────┘
```

---

## Notes

- Keep this LIA up-to-date
- Review when processing changes
- Review when risks/impacts change
- Make available to supervisory authority if requested (GDPR Art. 30)

## References

- GDPR Article 6.1(f)
- ICO Guidance on Legitimate Interests
- EDPB Guidelines on Legitimate Interest
