-- Migration: Data Subject Rights Tables for GDPR Articles 15-22
-- Created: 2026-03-31
-- Ticket: REMY-256

-- ============================================
-- Data Subject Requests (DSR) Table
-- Main table for tracking GDPR data subject request
-- ============================================
CREATE TYPE dsr_type AS ENUM ('access', 'rectify', 'erasure', 'restriction', 'portability', 'object');
CREATE TYPE dsr_status AS ENUM ('pending', 'processing', 'completed', 'rejected', 'cancelled');

CREATE TABLE IF NOT EXISTS data_subject_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    project_id UUID,
    request_type dsr_type NOT NULL,
    status dsr_status NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    data_export_url TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_dsr_user_id ON data_subject_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_dsr_status ON data_subject_requests(status);
CREATE INDEX IF NOT EXISTS idx_dsr_type ON data_subject_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_dsr_project_id ON data_subject_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_dsr_requested_at ON data_subject_requests(requested_at DESC);

-- Enable RLS
ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own requests
CREATE POLICY "Users can view their own DSRs"
ON data_subject_requests FOR SELECT
USING (
    user_id = current_setting('request.jwt.claim.sub', true) OR
    current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- Policy: Users can create their own requests
CREATE POLICY "Users can create their own DSRs"
ON data_subject_requests FOR INSERT
WITH CHECK (
    user_id = current_setting('request.jwt.claim.sub', true)
);

-- Policy: Only service role can update status
CREATE POLICY "Only service role can update DSRs"
ON data_subject_requests FOR UPDATE
USING (
    current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- ============================================
-- DSR Audit Log Table
-- Audit trail for all DSR activities
-- ============================================
CREATE TABLE IF NOT EXISTS dsr_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dsr_id UUID NOT NULL REFERENCES data_subject_requests(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsr_audit_dsr_id ON dsr_audit_log(dsr_id);
CREATE INDEX IF NOT EXISTS idx_dsr_audit_timestamp ON dsr_audit_log(timestamp DESC);

-- Enable RLS
ALTER TABLE dsr_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see audit log for their own DSRs
CREATE POLICY "Users can view audit log for their DSRs"
ON dsr_audit_log FOR SELECT
USING (
    dsr_id IN (
        SELECT id FROM data_subject_requests 
        WHERE user_id = current_setting('request.jwt.claim.sub', true)
    ) OR
    current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- ============================================
-- Data Corrections Table
-- Records of data rectification requests (Art 16)
-- ============================================
CREATE TABLE IF NOT EXISTS data_corrections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dsr_id UUID REFERENCES data_subject_requests(id) ON DELETE SET NULL,
    user_id TEXT NOT NULL,
    project_id UUID,
    field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    correction_timestamp TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID,
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'applied')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_corrections_user_id ON data_corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_data_corrections_dsr_id ON data_corrections(dsr_id);
CREATE INDEX IF NOT EXISTS idx_data_corrections_status ON data_corrections(status);

-- Enable RLS
ALTER TABLE data_corrections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own corrections
CREATE POLICY "Users can view their own corrections"
ON data_corrections FOR SELECT
USING (
    user_id = current_setting('request.jwt.claim.sub', true) OR
    current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- Policy: Users can create correction requests
CREATE POLICY "Users can create their own correction requests"
ON data_corrections FOR INSERT
WITH CHECK (
    user_id = current_setting('request.jwt.claim.sub', true)
);

-- ============================================
-- Processing Restrictions Table
-- Tracking requests to restrict processing (Art 18)
-- ============================================
CREATE TYPE restriction_reason AS ENUM ('contest_data', 'unlawful_processing', 'no_longer_needed', 'pending_verification');

CREATE TABLE IF NOT EXISTS processing_restrictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dsr_id UUID REFERENCES data_subject_requests(id) ON DELETE SET NULL,
    user_id TEXT NOT NULL,
    project_id UUID,
    restriction_reason restriction_reason NOT NULL,
    restricted_types TEXT[] DEFAULT ARRAY['all'],
    restricted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'lifted', 'expired')),
    lifted_at TIMESTAMPTZ,
    lifted_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processing_restrictions_user_id ON processing_restrictions(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_restrictions_project_id ON processing_restrictions(project_id);
CREATE INDEX IF NOT EXISTS idx_processing_restrictions_status ON processing_restrictions(status);

-- Enable RLS
ALTER TABLE processing_restrictions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own restrictions
CREATE POLICY "Users can view their own restrictions"
ON processing_restrictions FOR SELECT
USING (
    user_id = current_setting('request.jwt.claim.sub', true) OR
    current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- ============================================
-- Processing Objections Table
-- Tracking objections to processing (Art 21)
-- ============================================
CREATE TYPE objection_type AS ENUM ('direct_marketing', 'legitimate_interest', 'research', 'profiling');

CREATE TABLE IF NOT EXISTS processing_objections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dsr_id UUID REFERENCES data_subject_requests(id) ON DELETE SET NULL,
    user_id TEXT NOT NULL,
    project_id UUID,
    objection_type objection_type NOT NULL,
    description TEXT,
    objected_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'overridden', 'withdrawn')),
    overriden_at TIMESTAMPTZ,
    overriden_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processing_objections_user_id ON processing_objections(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_objections_type ON processing_objections(objection_type);
CREATE INDEX IF NOT EXISTS idx_processing_objections_status ON processing_objections(status);

-- Enable RLS
ALTER TABLE processing_objections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own objections
CREATE POLICY "Users can view their own objections"
ON processing_objections FOR SELECT
USING (
    user_id = current_setting('request.jwt.claim.sub', true) OR
    current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- ============================================
-- Marketing Exclusions Table
-- Users who have opted out of marketing
-- ============================================
CREATE TABLE IF NOT EXISTS marketing_exclusions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL UNIQUE,
    excluded_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT,
    dsr_id UUID REFERENCES data_subject_requests(id) ON DELETE SET NULL,
    source TEXT DEFAULT 'dsr_request',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_exclusions_user_id ON marketing_exclusions(user_id);

-- Enable RLS
ALTER TABLE marketing_exclusions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can check their own exclusion status
CREATE POLICY "Users can view their own exclusion"
ON marketing_exclusions FOR SELECT
USING (
    user_id = current_setting('request.jwt.claim.sub', true) OR
    current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- ============================================
-- Add columns to existing tables for DSR support
-- ============================================

-- Add processing_restricted flag to events table
ALTER TABLE IF EXISTS events 
ADD COLUMN IF NOT EXISTS processing_restricted BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_events_processing_restricted 
ON events(processing_restricted) 
WHERE processing_restricted = TRUE;

-- Add legitimate_interest_objected flag to events table
ALTER TABLE IF EXISTS events 
ADD COLUMN IF NOT EXISTS legitimate_interest_objected BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_events_legitimate_interest_objected 
ON events(legitimate_interest_objected) 
WHERE legitimate_interest_objected = TRUE;

-- Add processing_restricted flag to sessions table
ALTER TABLE IF EXISTS sessions 
ADD COLUMN IF NOT EXISTS processing_restricted BOOLEAN DEFAULT FALSE;

-- ============================================
-- Helper functions for DSR management
-- ============================================

-- Function to check if user has processing restricted
CREATE OR REPLACE FUNCTION has_processing_restriction(
    p_user_id TEXT,
    p_project_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM processing_restrictions 
        WHERE user_id = p_user_id 
        AND status = 'active'
        AND (p_project_id IS NULL OR project_id = p_project_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has marketing exclusion
CREATE OR REPLACE FUNCTION has_marketing_exclusion(p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM marketing_exclusions 
        WHERE user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count user's DSR requests
CREATE OR REPLACE FUNCTION count_user_dsr_requests(
    p_user_id TEXT,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_requests BIGINT,
    completed_requests BIGINT,
    pending_requests BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) AS total_requests,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_requests,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_requests
    FROM data_subject_requests
    WHERE user_id = p_user_id
    AND requested_at > NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get DSR statistics for admin dashboard
CREATE OR REPLACE FUNCTION get_dsr_statistics(
    p_project_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_requests', COUNT(*),
        'by_type', jsonb_object_agg(
            COALESCE(dsr.request_type::TEXT, 'unknown'),
            COUNT(*)
        ),
        'by_status', jsonb_object_agg(
            COALESCE(dsr.status::TEXT, 'unknown'),
            COUNT(*)
        ),
        'completed_within_sla', COUNT(*) FILTER (WHERE dsr.status = 'completed' AND dsr.completed_at <= dsr.requested_at + INTERVAL '30 days'),
        'average_completion_days', AVG(EXTRACT(EPOCH FROM (dsr.completed_at - dsr.requested_at))/86400) FILTER (WHERE dsr.status = 'completed')
    )
    INTO result
    FROM data_subject_requests dsr
    WHERE (p_project_id IS NULL OR dsr.project_id = p_project_id)
      AND (p_start_date IS NULL OR dsr.requested_at >= p_start_date::TIMESTAMPTZ)
      AND (p_end_date IS NULL OR dsr.requested_at < (p_end_date + INTERVAL '1 day')::TIMESTAMPTZ);

    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for open DSRs with deadline tracking (30 day SLA)
CREATE OR REPLACE VIEW open_dsr_deadline_tracking AS
SELECT 
    dsr.*,
    dsr.requested_at + INTERVAL '30 days' AS deadline,
    CASE 
        WHEN NOW() > dsr.requested_at + INTERVAL '30 days' THEN 'overdue'
        WHEN NOW() > dsr.requested_at + INTERVAL '25 days' THEN 'due_soon'
        ELSE 'on_track'
    END AS deadline_status,
    EXTRACT(DAY FROM (dsr.requested_at + INTERVAL '30 days' - NOW())) AS days_remaining
FROM data_subject_requests dsr
WHERE dsr.status = 'pending' OR dsr.status = 'processing';

-- ============================================
-- Triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_data_subject_requests_updated_at ON data_subject_requests;
CREATE TRIGGER update_data_subject_requests_updated_at
    BEFORE UPDATE ON data_subject_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_data_corrections_updated_at ON data_corrections;
CREATE TRIGGER update_data_corrections_updated_at
    BEFORE UPDATE ON data_corrections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_processing_restrictions_updated_at ON processing_restrictions;
CREATE TRIGGER update_processing_restrictions_updated_at
    BEFORE UPDATE ON processing_restrictions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_processing_objections_updated_at ON processing_objections;
CREATE TRIGGER update_processing_objections_updated_at
    BEFORE UPDATE ON processing_objections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE data_subject_requests IS 'GDPR Articles 15-22: Data Subject Right Requests';
COMMENT ON TABLE dsr_audit_log IS 'Audit trail for all DSR activities';
COMMENT ON TABLE data_corrections IS 'Article 16: Records of data rectification requests';
COMMENT ON TABLE processing_restrictions IS 'Article 18: Processing restriction requests';
COMMENT ON TABLE processing_objections IS 'Article 21: Objections to processing';
COMMENT ON TABLE marketing_exclusions IS 'Article 21(2): Direct marketing exclusions';

COMMENT ON COLUMN events.processing_restricted IS 'Flag indicating processing is restricted per Article 18';
COMMENT ON COLUMN events.legitimate_interest_objected IS 'Flag indicating legitimate interest objection per Article 21';
