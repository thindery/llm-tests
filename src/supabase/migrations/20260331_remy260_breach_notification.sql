-- GDPR Breach Notification Database Schema
-- Ticket: REMY-260
-- Implements: GDPR Articles 33-34 breach notification requirements
-- Timestamp: 2026-03-31

-- =====================================================
-- BREACH RECORDS (Primary table)
-- All breaches must be documented, even if not notified
-- =====================================================

CREATE TABLE breach_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    
    -- Breach identification
    breach_id TEXT UNIQUE NOT NULL,  -- Format: BREACH-YYYY-NNNNN
    breach_discovered_at TIMESTAMPTZ NOT NULL,
    breach_occurred_at TIMESTAMPTZ NOT NULL,
    breach_reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Classification
    category TEXT NOT NULL CHECK (category IN (
        'confidentiality', 'integrity', 'availability', 'accidental', 
        'malicious', 'system', 'human_error', 'third_party'
    )),
    description TEXT NOT NULL,
    root_cause TEXT NOT NULL,
    
    -- Data affected (GDPR Article 33(3)(a))
    affected_data_categories TEXT[] NOT NULL,
    affected_subject_categories TEXT[] NOT NULL,
    approximate_data_subjects_count INTEGER NOT NULL DEFAULT 0,
    approximate_records_count INTEGER NOT NULL DEFAULT 0,
    
    -- Personal data types (Article 33(3)(b))
    data_types_description TEXT NOT NULL,
    personal_data_types TEXT[] NOT NULL,
    
    -- Risk assessment (Article 33(3)(c)-(d))
    likelihood TEXT CHECK (likelihood IN ('unlikely', 'possible', 'likely', 'certain')),
    severity TEXT CHECK (severity IN ('negligible', 'limited', 'significant', 'severe')),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    
    -- Consequences (Article 33(3)(d))
    likely_consequences TEXT NOT NULL,
    cross_border_impact BOOLEAN NOT NULL DEFAULT FALSE,
    affected_member_states TEXT[] DEFAULT '{}',
    
    -- Mitigation measures (Article 33(3)(e))
    containment_measures TEXT NOT NULL,
    mitigation_measures_taken TEXT[] DEFAULT '{}',
    
    -- Notification requirements
    requires_dpa_notification BOOLEAN NOT NULL DEFAULT FALSE,
    requires_subject_notification BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- DPA notification tracking (Article 33)
    dpa_notification_deadline TIMESTAMPTZ,
    dpa_notification_sent_at TIMESTAMPTZ,
    dpa_notification_method TEXT CHECK (dpa_notification_method IN (
        'online_form', 'email', 'phone', 'postal'
    )),
    dpa_contact JSONB,  -- EUDataProtectionAuthority structure
    dpa_response_received_at TIMESTAMPTZ,
    dpa_response_notes TEXT,
    
    -- Data subject notification tracking (Article 34)
    subject_notification_sent_at TIMESTAMPTZ,
    subject_notification_method TEXT CHECK (subject_notification_method IN (
        'email', 'sms', 'phone', 'postal', 'public_announcement', 'website_banner'
    )),
    subject_notification_template TEXT DEFAULT 'subject_high_risk',
    subjects_notified_count INTEGER DEFAULT 0,
    subjects_failed_count INTEGER DEFAULT 0,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'assessing', 'dpa_notified', 'dpa_acknowledged', 
        'subjects_notified', 'remediation', 'resolved', 'closed', 'appealed'
    )),
    
    -- Investigation
    investigation_lead TEXT NOT NULL,
    investigation_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    investigation_completed_at TIMESTAMPTZ,
    investigation_findings TEXT,
    
    -- Evidence
    evidence_collected JSONB DEFAULT '[]',
    
    -- Remediation
    remediation_plan JSONB,
    remediation_completed_at TIMESTAMPTZ,
    lessons_learned TEXT,
    
    -- Metadata
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for breach records
CREATE INDEX idx_breach_project_id ON breach_records(project_id);
CREATE INDEX idx_breach_status ON breach_records(status);
CREATE INDEX idx_breach_risk_level ON breach_records(risk_level);
CREATE INDEX idx_breach_category ON breach_records(category);
CREATE INDEX idx_breach_discovered_at ON breach_records(breach_discovered_at);
CREATE INDEX idx_breach_dpa_deadline ON breach_records(dpa_notification_deadline);
CREATE INDEX idx_breach_dpa_notification_sent ON breach_records(dpa_notification_sent_at);
CREATE INDEX idx_breach_subject_notification_sent ON breach_records(subject_notification_sent_at);

-- =====================================================
-- STATUS HISTORY
-- Track all status changes
-- =====================================================

CREATE TABLE breach_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breach_id TEXT NOT NULL REFERENCES breach_records(breach_id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN (
        'draft', 'assessing', 'dpa_notified', 'dpa_acknowledged',
        'subjects_notified', 'remediation', 'resolved', 'closed', 'appealed'
    )),
    changed_by TEXT NOT NULL,
    reason TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_breach_status_history_breach_id ON breach_status_history(breach_id);
CREATE INDEX idx_breach_status_history_timestamp ON breach_status_history(timestamp);

-- =====================================================
-- EVIDENCE COLLECTION
-- Chain of custody for breach evidence
-- =====================================================

CREATE TABLE breach_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breach_id TEXT NOT NULL REFERENCES breach_records(breach_id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'log', 'screenshot', 'file', 'email', 'report', 'other'
    )),
    title TEXT NOT NULL,
    description TEXT,
    file_path TEXT,
    file_hash TEXT,  -- SHA-256 for integrity
    collected_by TEXT NOT NULL,
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_breach_evidence_breach_id ON breach_evidence(breach_id);
CREATE INDEX idx_breach_evidence_collected_at ON breach_evidence(collected_at);

-- =====================================================
-- REMEDIATION STEPS
-- Track remediation workflow
-- =====================================================

CREATE TABLE breach_remediation_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breach_id TEXT NOT NULL REFERENCES breach_records(breach_id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_progress', 'completed', 'cancelled'
    )),
    assigned_to TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_breach_remediation_breach_id ON breach_remediation_steps(breach_id);
CREATE INDEX idx_breach_remediation_status ON breach_remediation_steps(status);
CREATE INDEX idx_breach_remediation_priority ON breach_remediation_steps(priority);

-- =====================================================
-- AUDIT LOG
-- Complete audit trail for all breach actions
-- =====================================================

CREATE TABLE breach_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breach_id TEXT NOT NULL REFERENCES breach_records(breach_id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT
);

CREATE INDEX idx_breach_audit_log_breach_id ON breach_audit_log(breach_id);
CREATE INDEX idx_breach_audit_log_timestamp ON breach_audit_log(timestamp);
CREATE INDEX idx_breach_audit_log_action ON breach_audit_log(action);

-- =====================================================
-- DPA NOTIFICATION LOG
-- Track DPA notifications sent
-- =====================================================

CREATE TABLE breach_dpa_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breach_id TEXT NOT NULL REFERENCES breach_records(breach_id) ON DELETE CASCADE,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_by TEXT NOT NULL,
    method TEXT NOT NULL CHECK (method IN (
        'online_form', 'email', 'phone', 'postal'
    )),
    dpa_contact JSONB NOT NULL,
    notification_content TEXT NOT NULL,
    subject TEXT,
    acknowledgement_received BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    dpa_response TEXT,
    attachments TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_breach_dpa_notifications_breach_id ON breach_dpa_notifications(breach_id);
CREATE INDEX idx_breach_dpa_notifications_sent_at ON breach_dpa_notifications(sent_at);

-- =====================================================
-- SUBJECT NOTIFICATION LOG
-- Track data subject notifications sent (Article 34)
-- =====================================================

CREATE TABLE breach_subject_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breach_id TEXT NOT NULL REFERENCES breach_records(breach_id) ON DELETE CASCADE,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_by TEXT NOT NULL,
    method TEXT NOT NULL CHECK (method IN (
        'email', 'sms', 'phone', 'postal', 'public_announcement', 'website_banner'
    )),
    recipients TEXT[],
    template_used TEXT NOT NULL,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    bounce_count INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_breach_subject_notifications_breach_id ON breach_subject_notifications(breach_id);
CREATE INDEX idx_breach_subject_notifications_sent_at ON breach_subject_notifications(sent_at);

-- =====================================================
-- AFFECTED DATA SUBJECTS
-- Track which specific subjects were affected
-- =====================================================

CREATE TABLE affected_data_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breach_id TEXT NOT NULL REFERENCES breach_records(breach_id) ON DELETE CASCADE,
    email TEXT,
    phone TEXT,
    user_id TEXT,
    data_categories TEXT[],  -- Which categories affected this subject
    notification_sent_at TIMESTAMPTZ,
    notification_method TEXT,
    notification_status TEXT DEFAULT 'pending' CHECK (notification_status IN (
        'pending', 'sent', 'failed', 'bounced'
    )),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_affected_subjects_breach_id ON affected_data_subjects(breach_id);
CREATE INDEX idx_affected_subjects_email ON affected_data_subjects(email);
CREATE INDEX idx_affected_subjects_user_id ON affected_data_subjects(user_id);

-- =====================================================
-- NOTIFICATION TEMPLATES
-- Pre-defined breach notification templates
-- =====================================================

CREATE TABLE breach_notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- DPA template
    dpa_template_subject TEXT NOT NULL,
    dpa_template_body TEXT NOT NULL,
    dpa_required_fields TEXT[] DEFAULT '{}',
    
    -- Subject template
    subject_template_subject TEXT NOT NULL,
    subject_template_body TEXT NOT NULL,
    subject_required_fields TEXT[] DEFAULT '{}',
    subject_channels TEXT[] DEFAULT '{}',
    
    -- Applicability
    applicable_risk_levels TEXT[] NOT NULL,
    applicable_categories TEXT[] NOT NULL,
    
    language TEXT DEFAULT 'en',
    version TEXT DEFAULT '1.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_breach_templates_risk_levels ON breach_notification_templates USING GIN(applicable_risk_levels);

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

-- Function to automatically set updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER breach_records_updated_at
    BEFORE UPDATE ON breach_records
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER breach_remediation_steps_updated_at
    BEFORE UPDATE ON breach_remediation_steps
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER breach_notification_templates_updated_at
    BEFORE UPDATE ON breach_notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Function to calculate DPA notification deadline (72 hours)
CREATE OR REPLACE FUNCTION calculate_dpa_deadline(discovery_time TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN discovery_time + INTERVAL '72 hours';
END;
$$ LANGUAGE plpgsql;

-- Function to update breach status with history
CREATE OR REPLACE FUNCTION update_breach_status(
    p_breach_id TEXT,
    p_new_status TEXT,
    p_changed_by TEXT,
    p_reason TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Update breach status
    UPDATE breach_records
    SET status = p_new_status,
        updated_at = NOW()
    WHERE breach_id = p_breach_id;
    
    -- Add to history
    INSERT INTO breach_status_history (breach_id, status, changed_by, reason)
    VALUES (p_breach_id, p_new_status, p_changed_by, p_reason);
END;
$$ LANGUAGE plpgsql;

-- Function to get breach compliance status
CREATE OR REPLACE FUNCTION get_breach_compliance(p_breach_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_breach RECORD;
    v_article33_compliant BOOLEAN;
    v_article34_compliant BOOLEAN;
    v_hours_to_dpa NUMERIC;
    v_violations TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Get breach
    SELECT * INTO v_breach FROM breach_records WHERE breach_id = p_breach_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Breach not found');
    END IF;
    
    -- Check Article 33 compliance
    v_article33_compliant := TRUE;
    IF v_breach.requires_dpa_notification THEN
        IF v_breach.dpa_notification_sent_at IS NULL THEN
            v_hours_to_dpa := EXTRACT(EPOCH FROM (v_breach.dpa_notification_deadline - NOW())) / 3600;
            IF v_hours_to_dpa < 0 THEN
                v_article33_compliant := FALSE;
                v_violations := array_append(v_violations, 'DPA notification deadline exceeded (72 hours)');
            END IF;
        ELSE
            v_hours_to_dpa := EXTRACT(EPOCH FROM (v_breach.dpa_notification_sent_at - v_breach.breach_discovered_at)) / 3600;
            IF v_hours_to_dpa > 72 THEN
                v_article33_compliant := FALSE;
                v_violations := array_append(v_violations, 
                    'DPA notification sent ' || ROUND(v_hours_to_dpa::numeric, 1) || ' hours after discovery (exceeds 72-hour limit)');
            END IF;
        END IF;
    END IF;
    
    -- Check Article 34 compliance
    v_article34_compliant := TRUE;
    IF v_breach.requires_subject_notification AND v_breach.subject_notification_sent_at IS NULL THEN
        v_article34_compliant := FALSE;
        v_violations := array_append(v_violations, 'Data subject notification required but not sent (Article 34)');
    END IF;
    
    RETURN jsonb_build_object(
        'breach_id', p_breach_id,
        'article_33_compliant', v_article33_compliant,
        'article_34_compliant', v_article34_compliant,
        'overall_compliant', v_article33_compliant AND v_article34_compliant,
        'violations', v_violations,
        'details', jsonb_build_object(
            'requires_dpa_notification', v_breach.requires_dpa_notification,
            'requires_subject_notification', v_breach.requires_subject_notification,
            'dpa_notification_sent', v_breach.dpa_notification_sent_at IS NOT NULL,
            'subject_notification_sent', v_breach.subject_notification_sent_at IS NOT NULL
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get breach statistics
CREATE OR REPLACE FUNCTION get_breach_statistics(p_project_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_total INTEGER;
    v_by_risk_level JSONB;
    v_by_category JSONB;
    v_by_status JSONB;
    v_article33_compliance_rate NUMERIC;
    v_article34_compliance_rate NUMERIC;
    v_last_30_days INTEGER;
    v_last_90_days INTEGER;
    v_last_year INTEGER;
    v_avg_resolution_days NUMERIC;
BEGIN
    -- Total breaches
    SELECT COUNT(*) INTO v_total FROM breach_records WHERE project_id = p_project_id;
    
    -- By risk level (explicitly typed)
    SELECT jsonb_object_agg(risk_level::TEXT, cnt)
    INTO v_by_risk_level
    FROM (
        SELECT risk_level, COUNT(*) as cnt
        FROM breach_records
        WHERE project_id = p_project_id
        GROUP BY risk_level
    ) sub;
    
    -- By category
    SELECT jsonb_object_agg(category, cnt)
    INTO v_by_category
    FROM (
        SELECT category, COUNT(*) as cnt
        FROM breach_records
        WHERE project_id = p_project_id
        GROUP BY category
    ) sub;
    
    -- By status
    SELECT jsonb_object_agg(status, cnt)
    INTO v_by_status
    FROM (
        SELECT status, COUNT(*) as cnt
        FROM breach_records
        WHERE project_id = p_project_id
        GROUP BY status
    ) sub;
    
    -- Time-based statistics
    SELECT COUNT(*) INTO v_last_30_days
    FROM breach_records
    WHERE project_id = p_project_id
      AND breach_discovered_at >= NOW() - INTERVAL '30 days';
      
    SELECT COUNT(*) INTO v_last_90_days
    FROM breach_records
    WHERE project_id = p_project_id
      AND breach_discovered_at >= NOW() - INTERVAL '90 days';
      
    SELECT COUNT(*) INTO v_last_year
    FROM breach_records
    WHERE project_id = p_project_id
      AND breach_discovered_at >= NOW() - INTERVAL '1 year';
    
    -- Average resolution days
    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (remediation_completed_at - breach_discovered_at))/86400), 0)
    INTO v_avg_resolution_days
    FROM breach_records
    WHERE project_id = p_project_id
      AND remediation_completed_at IS NOT NULL;
    
    -- Compliance rates
    SELECT 
        COALESCE(SUM(CASE WHEN requires_dpa_notification AND dpa_notification_sent_at IS NOT NULL THEN 1.0 ELSE 0.0 END) /
        NULLIF(SUM(CASE WHEN requires_dpa_notification THEN 1 ELSE 0 END), 0), 1.0),
        COALESCE(SUM(CASE WHEN requires_subject_notification AND subject_notification_sent_at IS NOT NULL THEN 1.0 ELSE 0 END) /
        NULLIF(SUM(CASE WHEN requires_subject_notification THEN 1 ELSE 0 END), 0), 1.0)
    INTO v_article33_compliance_rate, v_article34_compliance_rate
    FROM breach_records
    WHERE project_id = p_project_id;
    
    RETURN jsonb_build_object(
        'total', v_total,
        'by_risk_level', COALESCE(v_by_risk_level, '{}'),
        'by_category', COALESCE(v_by_category, '{}'),
        'by_status', COALESCE(v_by_status, '{}'),
        'article_33_compliance_rate', ROUND(v_article33_compliance_rate * 100, 2),
        'article_34_compliance_rate', ROUND(v_article34_compliance_rate * 100, 2),
        'last_30_days', v_last_30_days,
        'last_90_days', v_last_90_days,
        'last_year', v_last_year,
        'average_resolution_days', ROUND(v_avg_resolution_days::numeric, 1)
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DEFAULT TEMPLATES
-- =====================================================

INSERT INTO breach_notification_templates (
    name,
    description,
    dpa_template_subject,
    dpa_template_body,
    dpa_required_fields,
    subject_template_subject,
    subject_template_body,
    subject_required_fields,
    subject_channels,
    applicable_risk_levels,
    applicable_categories
) VALUES (
    'Standard DPA Notification',
    'Standard template for notifying Data Protection Authorities',
    'Personal Data Breach Notification - {{breach_id}}',
    E'NOTIFICATION OF PERSONAL DATA BREACH\n\nTo: {{dpa_name}}\n\nFrom: {{organization_name}}\nDate: {{breach_date}}\n\n1. BREACH IDENTIFICATION\nBreach ID: {{breach_id}}\nDate of Discovery: {{breach_discovered_date}}\nEstimated Date of Occurrence: {{breach_occurred_date}}\n\n2. DESCRIPTION OF BREACH\n{{breach_description}}\n\n3. DATA SUBJECTS AFFECTED\nNumber of individuals: {{affected_count}}\nCategories: {{affected_categories}}\n\n4. LIKELY CONSEQUENCES\n{{likely_consequences}}\n\n5. MEASURES TAKEN\n{{containment_measures}}\n\n6. CONTACT INFORMATION\nEmail: {{contact_email}}\nPhone: {{contact_phone}}\n\nPlease acknowledge receipt of this notification.',
    ARRAY['breach_id', 'organization_name', 'breach_description', 'affected_count'],
    '',
    '',
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY['low', 'medium', 'high', 'critical'],
    ARRAY['confidentiality', 'integrity', 'availability', 'accidental', 'malicious', 'system', 'human_error', 'third_party']
);

INSERT INTO breach_notification_templates (
    name,
    description,
    dpa_template_subject,
    dpa_template_body,
    dpa_required_fields,
    subject_template_subject,
    subject_template_body,
    subject_required_fields,
    subject_channels,
    applicable_risk_levels,
    applicable_categories
) VALUES (
    'Data Subject High Risk Notification',
    'Required notification when breach poses high risk to data subject rights',
    '',
    '',
    ARRAY[]::TEXT[],
    'Important: Security Incident Affecting Your Personal Data',
    E'Dear User,\n\nWe are writing to inform you of a security incident that may have affected your personal data.\n\nINCIDENT DETAILS\nOn {{breach_date}}, we discovered a security incident that {{breach_description}}.\n\nYOUR DATA INVOLVED\nThe following information may have been affected:\n{{data_types}}\n\nWHAT WE ARE DOING\nWe have taken immediate action to:\n{{steps_taken}}\n\nWHAT YOU CAN DO\nWe recommend that you:\n1. Monitor your accounts for unusual activity\n2. Change passwords for any accounts using similar credentials\n3. Be vigilant against phishing attempts\n\nCONTACT INFORMATION\nIf you have questions or concerns, please contact us:\nEmail: {{contact_email}}\nPhone: {{contact_phone}}\n\nWe apologize for any inconvenience and appreciate your understanding as we work to resolve this matter.\n\n{{organization_name}}',
    ARRAY['breach_id', 'breach_date', 'data_types', 'steps_taken'],
    ARRAY['email', 'sms', 'phone', 'postal', 'public_announcement', 'website_banner'],
    ARRAY['high', 'critical'],
    ARRAY['confidentiality', 'integrity', 'availability', 'accidental', 'malicious', 'system', 'human_error', 'third_party']
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE breach_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE breach_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE breach_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE breach_remediation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE breach_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE breach_dpa_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE breach_subject_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE affected_data_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE breach_notification_templates ENABLE ROW LEVEL SECURITY;

-- Policies for breach_records
CREATE POLICY breach_records_select ON breach_records FOR SELECT
    USING (true);  -- Allow all authenticated users to view

CREATE POLICY breach_records_insert ON breach_records FOR INSERT
    WITH CHECK (true);  -- Allow authenticated inserts

CREATE POLICY breach_records_update ON breach_records FOR UPDATE
    USING (true);

-- Policies for related tables
CREATE POLICY breach_status_history_select ON breach_status_history FOR SELECT USING (true);
CREATE POLICY breach_evidence_select ON breach_evidence FOR SELECT USING (true);
CREATE POLICY breach_remediation_select ON breach_remediation_steps FOR SELECT USING (true);
CREATE POLICY breach_audit_log_select ON breach_audit_log FOR SELECT USING (true);
CREATE POLICY breach_dpa_notifications_select ON breach_dpa_notifications FOR SELECT USING (true);
CREATE POLICY breach_subject_notifications_select ON breach_subject_notifications FOR SELECT USING (true);
CREATE POLICY affected_members_select ON affected_data_subjects FOR SELECT USING (true);

-- Templates are public read
CREATE POLICY breach_templates_select ON breach_notification_templates FOR SELECT USING (true);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE breach_records IS 'GDPR Article 33-34 Personal Data Breach Records - All breaches documented per GDPR requirements';
COMMENT ON TABLE breach_dpa_notifications IS 'DPA notification log - Tracks Article 33 72-hour notifications';
COMMENT ON TABLE breach_subject_notifications IS 'Data subject notification log - Tracks Article 34 high risk notifications';
COMMENT ON TABLE affected_data_subjects IS 'Specific data subjects affected by breach';
COMMENT ON TABLE breach_evidence IS 'Chain of custody for breach investigation evidence';
COMMENT ON TABLE breach_remediation_steps IS 'Remediation plan and tracking';
