-- Migration: Add DPA Agreements table for GDPR compliance
-- Created: 2026-03-29
-- Ticket: REMY-257

-- Create enum type for DPA status
CREATE TYPE dpa_status AS ENUM ('pending', 'signed', 'expired');

-- Create dpa_agreements table
CREATE TABLE IF NOT EXISTS dpa_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dpa_version VARCHAR(20) NOT NULL DEFAULT '1.0',
  signed_at TIMESTAMPTZ,
  ip_address_hash VARCHAR(64),  -- Hashed IP address for audit trail
  signature_hash VARCHAR(128) NOT NULL,  -- SHA-512 hash of signature data
  signing_metadata JSONB DEFAULT '{}',  -- Additional signing context
  status dpa_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- Optional expiration for future versions
  pdf_url TEXT  -- S3 or storage path to signed PDF
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_dpa_agreements_customer 
ON dpa_agreements(customer_id);

CREATE INDEX IF NOT EXISTS idx_dpa_agreements_status 
ON dpa_agreements(status);

CREATE INDEX IF NOT EXISTS idx_dpa_agreements_version 
ON dpa_agreements(dpa_version);

CREATE INDEX IF NOT EXISTS idx_dpa_agreements_signed_at 
ON dpa_agreements(signed_at DESC);

-- Create unique index to ensure only one active signed DPA per customer
-- (allows multiple expired/signing history, but only one signed)
CREATE UNIQUE INDEX idx_dpa_agreements_customer_active 
ON dpa_agreements(customer_id) 
WHERE status = 'signed';

-- Enable RLS on dpa_agreements
ALTER TABLE dpa_agreements ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own DPA agreements
CREATE POLICY "Users can view their own DPA agreements"
ON dpa_agreements FOR SELECT
USING (customer_id = auth.uid());

-- Policy: Users can create DPA agreements for themselves (during acceptance)
CREATE POLICY "Users can create their own DPA agreements"
ON dpa_agreements FOR INSERT
WITH CHECK (customer_id = auth.uid());

-- Policy: Users cannot modify DPA agreements after creation (immutable record)
-- Updates only allowed for status changes by system/service role
CREATE POLICY "Users cannot update DPA agreements"
ON dpa_agreements FOR UPDATE
USING (
  -- Allow if service role or specific fields only
  (current_setting('request.jwt.claim.role', true) = 'service_role')
);

-- Policy: Users cannot delete DPA agreements
CREATE POLICY "Users cannot delete DPA agreements"
ON dpa_agreements FOR DELETE
USING (false);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_dpa_agreements_updated_at ON dpa_agreements;
CREATE TRIGGER update_dpa_agreements_updated_at
  BEFORE UPDATE ON dpa_agreements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to check if user has signed DPA
CREATE OR REPLACE FUNCTION has_signed_dpa(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM dpa_agreements 
    WHERE customer_id = user_uuid 
    AND status = 'signed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's current DPA
CREATE OR REPLACE FUNCTION get_current_dpa(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  dpa_version VARCHAR,
  signed_at TIMESTAMPTZ,
  status dpa_status,
  pdf_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    da.id,
    da.dpa_version,
    da.signed_at,
    da.status,
    da.pdf_url
  FROM dpa_agreements da
  WHERE da.customer_id = user_uuid
  AND da.status = 'signed'
  ORDER BY da.signed_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create DPA version history table for audit trail
CREATE TABLE IF NOT EXISTS dpa_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version VARCHAR(20) NOT NULL UNIQUE,
  effective_date TIMESTAMPTZ NOT NULL,
  template_content TEXT NOT NULL,
  changelog TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on dpa_versions (public read for templates)
ALTER TABLE dpa_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active DPA versions (needed for /current endpoint)
CREATE POLICY "Anyone can read DPA versions"
ON dpa_versions FOR SELECT
USING (true);

-- Policy: Only service role can modify DPA versions
CREATE POLICY "Only service role can modify DPA versions"
ON dpa_versions FOR ALL
USING (
  current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- Insert initial DPA version
INSERT INTO dpa_versions (version, effective_date, template_content, changelog, is_active)
VALUES (
  '1.0',
  NOW(),
  '{{TEMPLATE_PLACEHOLDER}}',
  'Initial GDPR Article 28 compliant Data Processing Agreement',
  TRUE
)
ON CONFLICT (version) DO NOTHING;

-- Create index for active version lookup
CREATE INDEX IF NOT EXISTS idx_dpa_versions_active 
ON dpa_versions(is_active) 
WHERE is_active = TRUE;

-- Add comment for documentation
COMMENT ON TABLE dpa_agreements IS 'Customer DPA signatures for GDPR Article 28 compliance';
COMMENT ON TABLE dpa_versions IS 'Version history of DPA templates';
COMMENT ON FUNCTION has_signed_dpa IS 'Checks if a user has an active signed DPA';
COMMENT ON FUNCTION get_current_dpa IS 'Returns the user current active DPA, if any';
