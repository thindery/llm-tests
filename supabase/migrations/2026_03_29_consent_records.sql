-- Migration: GDPR Consent Records for Article 7 Compliance
-- Created: 2026-03-29
-- Ticket: REMY-258

-- Create enum type for consent types
CREATE TYPE consent_type AS ENUM ('analytics', 'marketing', 'functional');

-- Create consent_records table
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  consent_type consent_type NOT NULL,
  consent_granted BOOLEAN NOT NULL,
  consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consent_version VARCHAR(20) NOT NULL DEFAULT '1.0',
  ip_address_hash VARCHAR(64),  -- SHA-256 hashed IP address
  user_agent_hash VARCHAR(64),   -- SHA-256 hashed user agent
  withdrawal_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_consent_user_id 
ON consent_records(user_id);

CREATE INDEX IF NOT EXISTS idx_consent_project_timestamp 
ON consent_records(project_id, consent_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_consent_granted 
ON consent_records(consent_granted);

CREATE INDEX IF NOT EXISTS idx_consent_project_user 
ON consent_records(project_id, user_id);

CREATE INDEX IF NOT EXISTS idx_consent_withdrawal 
ON consent_records(withdrawal_timestamp) 
WHERE withdrawal_timestamp IS NOT NULL;

-- Composite index for consent status lookups
CREATE INDEX IF NOT EXISTS idx_consent_status 
ON consent_records(project_id, user_id, consent_type, consent_timestamp DESC);

-- Enable RLS on consent_records
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can access all consent records
CREATE POLICY "Service role can access all consent records"
ON consent_records FOR ALL
USING (
  current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- Policy: Users can view their own consent records by user_id lookup
CREATE POLICY "Users can view own consent records"
ON consent_records FOR SELECT
USING (
  user_id = current_setting('request.jwt.claim.sub', true)
);

-- Policy: Users can create consent records for themselves
CREATE POLICY "Users can create own consent records"
ON consent_records FOR INSERT
WITH CHECK (
  user_id = current_setting('request.jwt.claim.sub', true)
);

-- Policy: Users can update (withdraw) their own consents
CREATE POLICY "Users can withdraw own consents"
ON consent_records FOR UPDATE
USING (
  user_id = current_setting('request.jwt.claim.sub', true)
);

-- Policy: Users cannot delete consent records (immutable audit trail)
CREATE POLICY "Users cannot delete consent records"
ON consent_records FOR DELETE
USING (false);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_consent_records_updated_at ON consent_records;
CREATE TRIGGER update_consent_records_updated_at
  BEFORE UPDATE ON consent_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to check user's consent status for a specific type
CREATE OR REPLACE FUNCTION get_user_consent(
  p_project_id UUID,
  p_user_id TEXT,
  p_consent_type consent_type
)
RETURNS TABLE (
  consent_granted BOOLEAN,
  consent_timestamp TIMESTAMPTZ,
  consent_version VARCHAR,
  is_withdrawn BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.consent_granted,
    cr.consent_timestamp,
    cr.consent_version,
    CASE WHEN cr.withdrawal_timestamp IS NOT NULL THEN TRUE ELSE FALSE END as is_withdrawn
  FROM consent_records cr
  WHERE cr.project_id = p_project_id
    AND cr.user_id = p_user_id
    AND cr.consent_type = p_consent_type
  ORDER BY cr.consent_timestamp DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's full consent status for all types
CREATE OR REPLACE FUNCTION get_user_consent_status(
  p_project_id UUID,
  p_user_id TEXT
)
RETURNS TABLE (
  consent_type TEXT,
  consent_granted BOOLEAN,
  consent_timestamp TIMESTAMPTZ,
  consent_version VARCHAR,
  is_withdrawn BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (cr.consent_type)
    cr.consent_type::TEXT,
    cr.consent_granted,
    cr.consent_timestamp,
    cr.consent_version,
    CASE WHEN cr.withdrawal_timestamp IS NOT NULL THEN TRUE ELSE FALSE END as is_withdrawn
  FROM consent_records cr
  WHERE cr.project_id = p_project_id
    AND cr.user_id = p_user_id
  ORDER BY cr.consent_type, cr.consent_timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to export user consent data (GDPR data portability)
CREATE OR REPLACE FUNCTION export_user_consent_data(
  p_project_id UUID,
  p_user_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'user_id', p_user_id,
    'project_id', p_project_id,
    'export_timestamp', NOW(),
    'consent_records', jsonb_agg(
      jsonb_build_object(
        'id', cr.id,
        'consent_type', cr.consent_type,
        'consent_granted', cr.consent_granted,
        'consent_timestamp', cr.consent_timestamp,
        'consent_version', cr.consent_version,
        'withdrawal_timestamp', cr.withdrawal_timestamp,
        'ip_address_hash', cr.ip_address_hash,
        'user_agent_hash', cr.user_agent_hash
      ) ORDER BY cr.consent_timestamp DESC
    )
  )
  INTO result
  FROM consent_records cr
  WHERE cr.project_id = p_project_id
    AND cr.user_id = p_user_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get consent statistics for a project
CREATE OR REPLACE FUNCTION get_consent_statistics(
  p_project_id UUID
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_consents', COUNT(*),
    'granted_by_type', jsonb_object_agg(
      COALESCE(cr.consent_type::TEXT, 'unknown'),
      COUNT(*) FILTER (WHERE cr.consent_granted = TRUE AND cr.withdrawal_timestamp IS NULL)
    ),
    'withdrawn_by_type', jsonb_object_agg(
      COALESCE(cr.consent_type::TEXT, 'unknown'),
      COUNT(*) FILTER (WHERE cr.withdrawal_timestamp IS NOT NULL)
    ),
    'unique_users', COUNT(DISTINCT cr.user_id),
    'last_30_days', jsonb_build_object(
      'granted', COUNT(*) FILTER (WHERE cr.consent_granted = TRUE AND cr.withdrawal_timestamp IS NULL AND cr.consent_timestamp > NOW() - INTERVAL '30 days'),
      'withdrawn', COUNT(*) FILTER (WHERE cr.withdrawal_timestamp IS NOT NULL AND cr.withdrawal_timestamp > NOW() - INTERVAL '30 days')
    )
  )
  INTO result
  FROM consent_records cr
  WHERE cr.project_id = p_project_id
    AND cr.consent_timestamp > NOW() - INTERVAL '90 days';

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create consent_banner_settings table for configurable banners
CREATE TABLE IF NOT EXISTS consent_banner_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL UNIQUE,
  banner_title VARCHAR(255) DEFAULT 'Cookie Consent',
  banner_text TEXT DEFAULT 'We use cookies to improve your experience.',
  accept_button_text VARCHAR(50) DEFAULT 'Accept All',
  reject_button_text VARCHAR(50) DEFAULT 'Reject',
  customize_button_text VARCHAR(50) DEFAULT 'Customize',
  background_color VARCHAR(7) DEFAULT '#ffffff',
  text_color VARCHAR(7) DEFAULT '#1f2937',
  button_primary_color VARCHAR(7) DEFAULT '#3b82f6',
  button_secondary_color VARCHAR(7) DEFAULT '#6b7280',
  position VARCHAR(20) DEFAULT 'bottom' CHECK (position IN ('bottom', 'top', 'center')),
  show_banner BOOLEAN DEFAULT TRUE,
  consent_expiration_days INTEGER DEFAULT 365,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on consent_banner_settings
ALTER TABLE consent_banner_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Project owners can manage their banner settings
CREATE POLICY "Project owners can manage banner settings"
ON consent_banner_settings FOR ALL
USING (
  current_setting('request.jwt.claim.role', true) = 'service_role' OR
  project_id = (current_setting('request.jwt.claim.project_id', true))::UUID
);

-- Policy: Anyone can view banner settings (needed for SDK)
CREATE POLICY "Anyone can view banner settings"
ON consent_banner_settings FOR SELECT
USING (true);

-- Add trigger for banner settings
DROP TRIGGER IF EXISTS update_consent_banner_settings_updated_at ON consent_banner_settings;
CREATE TRIGGER update_consent_banner_settings_updated_at
  BEFORE UPDATE ON consent_banner_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default banner settings for existing project_id references if needed
INSERT INTO consent_banner_settings (project_id)
SELECT DISTINCT cr.project_id 
FROM consent_records cr
WHERE NOT EXISTS (
  SELECT 1 FROM consent_banner_settings cbs WHERE cbs.project_id = cr.project_id
)
ON CONFLICT (project_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE consent_records IS 'GDPR Article 7 compliant consent records';
COMMENT ON TABLE consent_banner_settings IS 'Configurable consent banner settings per project';
COMMENT ON COLUMN consent_records.ip_address_hash IS 'SHA-256 hash of IP address for audit trail';
COMMENT ON COLUMN consent_records.user_agent_hash IS 'SHA-256 hash of user agent for device fingerprinting';
COMMENT ON FUNCTION get_user_consent IS 'Returns current consent status for a specific consent type';
COMMENT ON FUNCTION get_user_consent_status IS 'Returns all consent types status for a user';
COMMENT ON FUNCTION export_user_consent_data IS 'GDPR data portability export';
COMMENT ON FUNCTION get_consent_statistics IS 'Aggregate consent statistics for dashboard';