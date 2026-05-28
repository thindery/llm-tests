-- Migration: Subprocessor Disclosure Tables for GDPR Article 28 Compliance
-- Created: 2026-04-01
-- Ticket: REMY-259

-- ============================================
-- Subprocessor Status Enum
-- ============================================
CREATE TYPE subprocessor_status AS ENUM ('active', 'pending_review', 'deprecated', 'terminated');

-- ============================================
-- Subprocessors Table
-- Complete inventory of subprocessors per GDPR Article 28
-- ============================================
CREATE TABLE IF NOT EXISTS subprocessors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Subprocessor identification
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),  -- Official registered company name
    website_url TEXT,
    privacy_policy_url TEXT,
    
    -- Processing purpose (GDPR Article 28 requirement)
    purpose TEXT NOT NULL,
    processing_activities TEXT[] NOT NULL DEFAULT '{}',  -- Detailed list of activities
    data_categories TEXT[] NOT NULL DEFAULT '{}',        -- Types of personal data processed
    
    -- Geographic location (GDPR cross-border transfer compliance)
    headquarters_location VARCHAR(255) NOT NULL,          -- City, Country
    data_storage_locations TEXT[] NOT NULL DEFAULT '{}', -- Where data is physically stored
    jurisdiction VARCHAR(100) NOT NULL,                    -- Legal jurisdiction
    
    -- Contract status (GDPR Article 28(2) - written agreement required)
    contract_status VARCHAR(50) NOT NULL DEFAULT 'pending' 
        CHECK (contract_status IN ('pending', 'draft', 'signed', 'under_review', 'expired', 'terminated')),
    contract_signed_date DATE,
    contract_expiry_date DATE,
    contract_renewal_reminder_sent BOOLEAN DEFAULT FALSE,
    dpa_version VARCHAR(20),  -- Data Processing Agreement version
    
    -- Security measures (GDPR Article 32 - technical and organizational measures)
    security_certifications TEXT[] DEFAULT '{}',          -- ISO 27001, SOC 2, etc.
    security_measures JSONB DEFAULT '{}',                  -- Detailed security controls
    encryption_at_rest BOOLEAN DEFAULT FALSE,
    encryption_in_transit BOOLEAN DEFAULT FALSE,
    access_controls TEXT DEFAULT '',                      -- Description of access controls
    audit_trail_available BOOLEAN DEFAULT FALSE,
    
    -- GDPR compliance
    gdpr_compliant BOOLEAN DEFAULT FALSE,
    data_processing_agreement_signed BOOLEAN DEFAULT FALSE,
    standard_contractual_clauses BOOLEAN DEFAULT FALSE,   -- SCCs for international transfers
    binding_corporate_rules BOOLEAN DEFAULT FALSE,      -- BCRs if applicable
    
    -- Status tracking
    status subprocessor_status NOT NULL DEFAULT 'pending_review',
    onboarded_at TIMESTAMPTZ,
    deprecated_at TIMESTAMPTZ,
    deprecated_reason TEXT,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- Indexes for efficient querying
-- ============================================
CREATE INDEX IF NOT EXISTS idx_subprocessors_name ON subprocessors(name);
CREATE INDEX IF NOT EXISTS idx_subprocessors_status ON subprocessors(status);
CREATE INDEX IF NOT EXISTS idx_subprocessors_contract_status ON subprocessors(contract_status);
CREATE INDEX IF NOT EXISTS idx_subprocessors_jurisdiction ON subprocessors(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_subprocessors_gdpr_compliant ON subprocessors(gdpr_compliant) WHERE gdpr_compliant = TRUE;
CREATE INDEX IF NOT EXISTS idx_subprocessors_active ON subprocessors(status) WHERE status = 'active';

-- ============================================
-- Subprocessor Audit Log Table
-- Tracks all changes for compliance audit trail
-- ============================================
CREATE TABLE IF NOT EXISTS subprocessor_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subprocessor_id UUID NOT NULL REFERENCES subprocessors(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,  -- create, update, delete, status_change, contract_update
    changes JSONB NOT NULL DEFAULT '{}',  -- Diff of what changed
    performed_by UUID REFERENCES auth.users(id),
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address_hash VARCHAR(64),  -- Hashed for audit trail
    reason TEXT  -- Optional reason for change
);

CREATE INDEX IF NOT EXISTS idx_subprocessor_audit_subprocessor_id ON subprocessor_audit_log(subprocessor_id);
CREATE INDEX IF NOT EXISTS idx_subprocessor_audit_action ON subprocessor_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_subprocessor_audit_performed_at ON subprocessor_audit_log(performed_at DESC);

-- ============================================
-- Customer Notification Log
-- Tracks when customers are notified of subprocessor changes
-- ============================================
CREATE TABLE IF NOT EXISTS subprocessor_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subprocessor_id UUID NOT NULL REFERENCES subprocessors(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,  -- new, update, removal
    notification_sent_at TIMESTAMPTZ DEFAULT NOW(),
    notification_method VARCHAR(50) NOT NULL,  -- email, in_app, api_webhook
    recipients_count INTEGER DEFAULT 0,
    template_version VARCHAR(20),
    content_hash VARCHAR(64),  -- Hash of notification content
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subprocessor_notifications_subprocessor_id ON subprocessor_notifications(subprocessor_id);
CREATE INDEX IF NOT EXISTS idx_subprocessor_notifications_type ON subprocessor_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_subprocessor_notifications_sent_at ON subprocessor_notifications(notification_sent_at DESC);

-- ============================================
-- Enable Row Level Security
-- ============================================
ALTER TABLE subprocessors ENABLE ROW LEVEL SECURITY;
ALTER TABLE subprocessor_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE subprocessor_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage all subprocessors
CREATE POLICY "Service role can manage subprocessors"
ON subprocessors FOR ALL
USING (
    current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- Policy: Admin users can view subprocessors
CREATE POLICY "Admins can view subprocessors"
ON subprocessors FOR SELECT
USING (
    current_setting('request.jwt.claim.role', true) IN ('service_role', 'admin')
);

-- Policy: Service role can manage audit log
CREATE POLICY "Service role can manage subprocessor audit log"
ON subprocessor_audit_log FOR ALL
USING (
    current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- Policy: Service role can manage notifications
CREATE POLICY "Service role can manage subprocessor notifications"
ON subprocessor_notifications FOR ALL
USING (
    current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- ============================================
-- Triggers for updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_subprocessors_updated_at ON subprocessors;
CREATE TRIGGER update_subprocessors_updated_at
    BEFORE UPDATE ON subprocessors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Helper Functions
-- ============================================

-- Get active subprocessors for public disclosure
CREATE OR REPLACE FUNCTION get_active_subprocessors()
RETURNS TABLE (
    name VARCHAR,
    purpose TEXT,
    headquarters_location VARCHAR,
    data_storage_locations TEXT[],
    jurisdiction VARCHAR,
    security_certifications TEXT[],
    gdpr_compliant BOOLEAN,
    standard_contractual_clauses BOOLEAN,
    data_processing_agreement_signed BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.name,
        s.purpose,
        s.headquarters_location,
        s.data_storage_locations,
        s.jurisdiction,
        s.security_certifications,
        s.gdpr_compliant,
        s.standard_contractual_clauses,
        s.data_processing_agreement_signed
    FROM subprocessors s
    WHERE s.status = 'active'
    ORDER BY s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get subprocessor by name
CREATE OR REPLACE FUNCTION get_subprocessor_by_name(p_name VARCHAR)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    purpose TEXT,
    status subprocessor_status
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.name, s.purpose, s.status
    FROM subprocessors s
    WHERE s.name ILIKE '%' || p_name || '%'
    ORDER BY s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get subprocessor statistics
CREATE OR REPLACE FUNCTION get_subprocessor_statistics()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_subprocessors', COUNT(*),
        'active_subprocessors', COUNT(*) FILTER (WHERE status = 'active'),
        'pending_review', COUNT(*) FILTER (WHERE status = 'pending_review'),
        'gdpr_compliant', COUNT(*) FILTER (WHERE gdpr_compliant = TRUE),
        'with_signed_dpa', COUNT(*) FILTER (WHERE data_processing_agreement_signed = TRUE),
        'by_jurisdiction', (
            SELECT jsonb_object_agg(jurisdiction, cnt)
            FROM (
                SELECT jurisdiction, COUNT(*) as cnt
                FROM subprocessors
                WHERE status = 'active'
                GROUP BY jurisdiction
            ) subq
        ),
        'contracts_expiring_soon', COUNT(*) FILTER (
            WHERE contract_expiry_date IS NOT NULL 
            AND contract_expiry_date <= CURRENT_DATE + INTERVAL '90 days'
            AND contract_expiry_date > CURRENT_DATE
        ),
        'expired_contracts', COUNT(*) FILTER (
            WHERE contract_expiry_date IS NOT NULL 
            AND contract_expiry_date < CURRENT_DATE
        )
    )
    INTO result
    FROM subprocessors;

    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log subprocessor changes
CREATE OR REPLACE FUNCTION log_subprocessor_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO subprocessor_audit_log (
            subprocessor_id,
            action,
            changes,
            performed_at
        ) VALUES (
            NEW.id,
            'update',
            jsonb_build_object(
                'old', to_jsonb(OLD),
                'new', to_jsonb(NEW)
            ),
            NOW()
        );
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO subprocessor_audit_log (
            subprocessor_id,
            action,
            changes,
            performed_at
        ) VALUES (
            NEW.id,
            'create',
            to_jsonb(NEW),
            NOW()
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO subprocessor_audit_log (
            subprocessor_id,
            action,
            changes,
            performed_at
        ) VALUES (
            OLD.id,
            'delete',
            to_jsonb(OLD),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers
DROP TRIGGER IF EXISTS log_subprocessor_changes ON subprocessors;
CREATE TRIGGER log_subprocessor_changes
    AFTER INSERT OR UPDATE OR DELETE ON subprocessors
    FOR EACH ROW
    EXECUTE FUNCTION log_subprocessor_change();

-- Initialize with sample subprocessors (commonly used services)
INSERT INTO subprocessors (
    name,
    legal_name,
    website_url,
    privacy_policy_url,
    purpose,
    processing_activities,
    data_categories,
    headquarters_location,
    data_storage_locations,
    jurisdiction,
    contract_status,
    dpa_version,
    security_certifications,
    security_measures,
    encryption_at_rest,
    encryption_in_transit,
    audit_trail_available,
    gdpr_compliant,
    data_processing_agreement_signed,
    standard_contractual_clauses,
    status,
    onboarded_at,
    notes
) VALUES (
    'Supabase',
    'Supabase Inc.',
    'https://supabase.com',
    'https://supabase.com/privacy',
    'Database and authentication services for user data storage and management',
    ARRAY['data_storage', 'authentication', 'database_hosting'],
    ARRAY['user_data', 'authentication_data', 'session_data'],
    'San Francisco, United States',
    ARRAY['us-east-1', 'us-west-2', 'eu-west-1'],
    'United States',
    'signed',
    '2024-01',
    ARRAY['SOC_2_Type_II', 'ISO_27001'],
    '{"access_controls": "Role-based access control with MFA", "monitoring": "24/7 security monitoring"}'::jsonb,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    'active',
    NOW(),
    'Primary database infrastructure provider'
), (
    'Vercel',
    'Vercel Inc.',
    'https://vercel.com',
    'https://vercel.com/legal/privacy-policy',
    'Web application hosting and serverless functions',
    ARRAY['hosting', 'cdn', 'serverless_computing'],
    ARRAY['user_data', 'ip_addresses', 'usage_data'],
    'San Francisco, United States',
    ARRAY['global_edge_network'],
    'United States',
    'signed',
    '2024-01',
    ARRAY['SOC_2_Type_II', 'ISO_27001'],
    '{"access_controls": "Enterprise SSO", "monitoring": "Automated threat detection"}'::jsonb,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    'active',
    NOW(),
    'Application hosting platform'
), (
    'Stripe',
    'Stripe Inc.',
    'https://stripe.com',
    'https://stripe.com/privacy',
    'Payment processing and subscription management',
    ARRAY['payment_processing', 'subscription_management', 'billing'],
    ARRAY['payment_data', 'billing_address', 'transaction_history'],
    'San Francisco, United States',
    ARRAY['us-east-1', 'eu-west-1'],
    'United States',
    'signed',
    '2024-01',
    ARRAY['PCI_DSS_Level_1', 'SOC_1_Type_II', 'SOC_2_Type_II'],
    '{"access_controls": "Strict need-to-know access", "monitoring": "Real-time fraud detection"}'::jsonb,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    'active',
    NOW(),
    'Payment processor - card data never touches our servers'
), (
    'SendGrid',
    'Twilio Inc.',
    'https://sendgrid.com',
    'https://www.twilio.com/legal/privacy',
    'Email delivery and transactional email services',
    ARRAY['email_delivery', 'transactional_email', 'email_analytics'],
    ARRAY['email_address', 'communication_data'],
    'Denver, United States',
    ARRAY['us-east-1', 'eu-west-1'],
    'United States',
    'signed',
    '2024-01',
    ARRAY['SOC_2_Type_II'],
    '{"access_controls": "API key authentication", "monitoring": "Delivery monitoring"}'::jsonb,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    'active',
    NOW(),
    'Email service provider'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE subprocessors IS 'GDPR Article 28: Register of subprocessors with full compliance details';
COMMENT ON TABLE subprocessor_audit_log IS 'Audit trail for all subprocessor changes (GDPR accountability requirement)';
COMMENT ON TABLE subprocessor_notifications IS 'Customer notification records for subprocessor changes';
COMMENT ON FUNCTION get_active_subprocessors IS 'Returns publicly disclosable subprocessor information';
COMMENT ON FUNCTION get_subprocessor_statistics IS 'Returns subprocessor statistics for admin dashboard';
