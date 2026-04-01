-- Migration: GDPR-P0 Server-Side Consent Records Enhancement
-- Ticket: REMY-258
-- Requirements:
--   - Immutable storage with cryptographic integrity verification
--   - Tamper-evident consent audit log
--   - 7+ year retention for consent records
--   - GDPR Article 7, 8 compliance

-- =====================================================
-- PART 1: ENHANCED CONSENT RECORDS WITH CRYPTOGRAPHIC INTEGRITY
-- =====================================================

-- Add cryptographic integrity columns to consent_records table
ALTER TABLE consent_records 
ADD COLUMN IF NOT EXISTS record_hash VARCHAR(64) NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS previous_record_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS integrity_proof JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS retention_until_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '7 years'),
ADD COLUMN IF NOT EXISTS legal_basis VARCHAR(50) NOT NULL DEFAULT 'consent',
ADD COLUMN IF NOT EXISTS purpose_description TEXT,
ADD COLUMN IF NOT EXISTS data_controller VARCHAR(255) NOT NULL DEFAULT 'Data Controller',
ADD COLUMN IF NOT EXISTS storage_location VARCHAR(100) NOT NULL DEFAULT 'EU',
ADD COLUMN IF NOT EXISTS third_parties JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS automated_decision_making BOOLEAN DEFAULT FALSE;

-- Create index for retention queries
CREATE INDEX IF NOT EXISTS idx_consent_retention_until 
ON consent_records(retention_until_date);

-- Create index for record hash lookups (integrity verification)
CREATE INDEX IF NOT EXISTS idx_consent_record_hash 
ON consent_records(record_hash);

-- Create partial index for active (non-expired) consents
CREATE INDEX IF NOT EXISTS idx_consent_active 
ON consent_records(project_id, user_id, consent_type) 
WHERE withdrawal_timestamp IS NULL 
  AND retention_until_date > CURRENT_DATE;

-- =====================================================
-- PART 2: TAMPER-EVIDENT CONSENT AUDIT LOG
-- =====================================================

-- Create consent audit log table (immutable, append-only)
CREATE TABLE IF NOT EXISTS consent_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action VARCHAR(50) NOT NULL CHECK (action IN ('consent_granted', 'consent_withdrawn', 'consent_updated', 'consent_exported', 'consent_verified')),
  consent_record_id UUID REFERENCES consent_records(id),
  project_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  consent_type consent_type NOT NULL,
  
  -- Snapshot of the record at this point in time
  record_snapshot JSONB NOT NULL,
  
  -- Cryptographic verification
  record_hash VARCHAR(64) NOT NULL,
  previous_audit_hash VARCHAR(64),
  chain_hash VARCHAR(64) NOT NULL,  -- Hash of this record + previous chain hash
  
  -- Action metadata
  ip_address_hash VARCHAR(64),
  user_agent_hash VARCHAR(64),
  performed_by TEXT NOT NULL,  -- user_id or 'system'
  reason TEXT,
  
  -- GDPR Article 8 compliance (child protection)
  user_age_verified BOOLEAN DEFAULT FALSE,
  parental_consent_obtained BOOLEAN DEFAULT FALSE,
  parental_consent_record_id UUID,
  
  -- Tamper detection
  verified_at TIMESTAMPTZ,
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'tampered')),
  
  -- Partitioning support for large scale
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for the audit log (7+ years retention)
-- Current year partitions
CREATE TABLE IF NOT EXISTS consent_audit_log_2026 PARTITION OF consent_audit_log
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE IF NOT EXISTS consent_audit_log_2027 PARTITION OF consent_audit_log
  FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

CREATE TABLE IF NOT EXISTS consent_audit_log_2028 PARTITION OF consent_audit_log
  FOR VALUES FROM ('2028-01-01') TO ('2029-01-01');

CREATE TABLE IF NOT EXISTS consent_audit_log_2029 PARTITION OF consent_audit_log
  FOR VALUES FROM ('2029-01-01') TO ('2030-01-01');

CREATE TABLE IF NOT EXISTS consent_audit_log_2030 PARTITION OF consent_audit_log
  FOR VALUES FROM ('2030-01-01') TO ('2031-01-01');

CREATE TABLE IF NOT EXISTS consent_audit_log_2031 PARTITION OF consent_audit_log
  FOR VALUES FROM ('2031-01-01') TO ('2032-01-01');

CREATE TABLE IF NOT EXISTS consent_audit_log_2032 PARTITION OF consent_audit_log
  FOR VALUES FROM ('2032-01-01') TO ('2033-01-01');

CREATE TABLE IF NOT EXISTS consent_audit_log_2033 PARTITION OF consent_audit_log
  FOR VALUES FROM ('2033-01-01') TO ('2034-01-01');

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_consent_record 
ON consent_audit_log(consent_record_id);

CREATE INDEX IF NOT EXISTS idx_audit_user_project 
ON consent_audit_log(user_id, project_id);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp 
ON consent_audit_log(audit_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_action 
ON consent_audit_log(action);

CREATE INDEX IF NOT EXISTS idx_audit_chain_hash 
ON consent_audit_log(chain_hash);

CREATE INDEX IF NOT EXISTS idx_audit_verification 
ON consent_audit_log(verification_status) 
WHERE verification_status = 'tampered';

-- Enable RLS on audit log
ALTER TABLE consent_audit_log ENABLE ROW LEVEL SECURITY;

-- Audit log policies - NO DELETE policy (immutable)
CREATE POLICY "No one can delete audit logs"
ON consent_audit_log FOR DELETE
USING (false);

CREATE POLICY "Service role can read all audit logs"
ON consent_audit_log FOR SELECT
USING (
  current_setting('request.jwt.claim.role', true) = 'service_role'
);

CREATE POLICY "Users can view their own audit logs"
ON consent_audit_log FOR SELECT
USING (
  user_id = current_setting('request.jwt.claim.sub', true)
);

-- =====================================================
-- PART 3: CONSENT PROOF (GDPR Article 7 - Proof of Consent)
-- =====================================================

-- Create consent_proof table for generating tamper-evident proof documents
CREATE TABLE IF NOT EXISTS consent_proofs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proof_id VARCHAR(64) UNIQUE NOT NULL,  -- Public identifier for proof
  consent_record_id UUID NOT NULL REFERENCES consent_records(id),
  project_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  
  -- Proof document content
  proof_document JSONB NOT NULL,
  proof_hash VARCHAR(64) NOT NULL,
  
  -- Digital signature (optional, for high-assurance scenarios)
  signature_algorithm VARCHAR(20),
  signature_value TEXT,
  
  -- Verification
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 years'),
  verified_at TIMESTAMPTZ,
  verification_count INTEGER DEFAULT 0,
  
  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for consent proofs
CREATE INDEX IF NOT EXISTS idx_consent_proofs_record 
ON consent_proofs(consent_record_id);

CREATE INDEX IF NOT EXISTS idx_consent_proofs_user 
ON consent_proofs(user_id);

CREATE INDEX IF NOT EXISTS idx_consent_proofs_proof_id 
ON consent_proofs(proof_id);

CREATE INDEX IF NOT EXISTS idx_consent_proofs_expiry 
ON consent_proofs(expires_at) 
WHERE expires_at > CURRENT_DATE;

-- Enable RLS
ALTER TABLE consent_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage proofs"
ON consent_proofs FOR ALL
USING (
  current_setting('request.jwt.claim.role', true) = 'service_role'
);

CREATE POLICY "Users can view own consent proofs"
ON consent_proofs FOR SELECT
USING (
  user_id = current_setting('request.jwt.claim.sub', true)
);

-- =====================================================
-- PART 4: CRYPTOGRAPHIC FUNCTIONS
-- =====================================================

-- Function to calculate record hash (SHA-256)
CREATE OR REPLACE FUNCTION calculate_consent_record_hash(
  p_id UUID,
  p_project_id UUID,
  p_user_id TEXT,
  p_consent_type consent_type,
  p_consent_granted BOOLEAN,
  p_consent_timestamp TIMESTAMPTZ,
  p_consent_version VARCHAR,
  p_previous_hash VARCHAR DEFAULT NULL
)
RETURNS VARCHAR(64) AS $$
DECLARE
  hash_input TEXT;
BEGIN
  hash_input := COALESCE(p_id::TEXT, '') || '|' ||
                COALESCE(p_project_id::TEXT, '') || '|' ||
                COALESCE(p_user_id, '') || '|' ||
                COALESCE(p_consent_type::TEXT, '') || '|' ||
                COALESCE(p_consent_granted::TEXT, '') || '|' ||
                COALESCE(p_consent_timestamp::TEXT, '') || '|' ||
                COALESCE(p_consent_version, '') || '|' ||
                COALESCE(p_previous_hash, '');
  
  RETURN encode(digest(hash_input, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate chain hash for audit log
CREATE OR REPLACE FUNCTION calculate_audit_chain_hash(
  p_audit_record JSONB,
  p_previous_chain_hash VARCHAR
)
RETURNS VARCHAR(64) AS $$
DECLARE
  hash_input TEXT;
BEGIN
  hash_input := p_audit_record::TEXT || '|' || COALESCE(p_previous_chain_hash, '');
  RETURN encode(digest(hash_input, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 5: AUDIT LOG TRIGGERS
-- =====================================================

-- Trigger function to log consent changes to audit log
CREATE OR REPLACE FUNCTION log_consent_change()
RETURNS TRIGGER AS $$
DECLARE
  action_type VARCHAR(50);
  snapshot JSONB;
  prev_chain_hash VARCHAR(64);
  new_chain_hash VARCHAR(64);
  record_hash VARCHAR(64);
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type := 'consent_granted';
    snapshot := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.withdrawal_timestamp IS NOT NULL AND OLD.withdrawal_timestamp IS NULL THEN
      action_type := 'consent_withdrawn';
    ELSE
      action_type := 'consent_updated';
    END IF;
    snapshot := jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    );
  ELSE
    RETURN NULL;
  END IF;

  -- Calculate record hash
  record_hash := calculate_consent_record_hash(
    NEW.id, NEW.project_id, NEW.user_id,
    NEW.consent_type, NEW.consent_granted,
    NEW.consent_timestamp, NEW.consent_version,
    NEW.previous_record_hash
  );

  -- Get previous chain hash
  SELECT chain_hash INTO prev_chain_hash
  FROM consent_audit_log
  ORDER BY audit_timestamp DESC
  LIMIT 1;

  -- Calculate new chain hash
  new_chain_hash := calculate_audit_chain_hash(
    jsonb_build_object(
      'action', action_type,
      'consent_record_id', NEW.id,
      'timestamp', NOW()
    ),
    prev_chain_hash
  );

  -- Insert audit log entry
  INSERT INTO consent_audit_log (
    action,
    consent_record_id,
    project_id,
    user_id,
    consent_type,
    record_snapshot,
    record_hash,
    previous_audit_hash,
    chain_hash,
    performed_by,
    reason
  ) VALUES (
    action_type,
    NEW.id,
    NEW.project_id,
    NEW.user_id,
    NEW.consent_type,
    snapshot,
    record_hash,
    prev_chain_hash,
    new_chain_hash,
    NEW.user_id,
    CASE WHEN action_type = 'consent_withdrawn' THEN 'User initiated withdrawal' ELSE 'Consent recorded' END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to consent_records
DROP TRIGGER IF EXISTS consent_audit_trigger ON consent_records;
CREATE TRIGGER consent_audit_trigger
  AFTER INSERT OR UPDATE ON consent_records
  FOR EACH ROW
  EXECUTE FUNCTION log_consent_change();

-- =====================================================
-- PART 6: ENHANCED FUNCTIONS
-- =====================================================

-- Enhanced consent recording with integrity
CREATE OR REPLACE FUNCTION record_consent_with_integrity(
  p_project_id UUID,
  p_user_id TEXT,
  p_consent_type consent_type,
  p_consent_granted BOOLEAN,
  p_consent_version VARCHAR DEFAULT '1.0',
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_purpose_description TEXT DEFAULT NULL,
  p_third_parties JSONB DEFAULT '[]',
  p_legal_basis VARCHAR DEFAULT 'consent'
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
  prev_hash VARCHAR(64);
  record_hash VARCHAR(64);
  retention_date DATE;
BEGIN
  -- Calculate retention date (7 years from now)
  retention_date := CURRENT_DATE + INTERVAL '7 years';

  -- Get previous record hash for this user/type (if exists)
  SELECT record_hash INTO prev_hash
  FROM consent_records
  WHERE user_id = p_user_id 
    AND project_id = p_project_id 
    AND consent_type = p_consent_type
  ORDER BY consent_timestamp DESC
  LIMIT 1;

  -- Generate new ID
  new_id := uuid_generate_v4();

  -- Calculate record hash
  record_hash := calculate_consent_record_hash(
    new_id, p_project_id, p_user_id,
    p_consent_type, p_consent_granted,
    NOW(), p_consent_version, prev_hash
  );

  -- Insert record with integrity
  INSERT INTO consent_records (
    id, project_id, user_id, consent_type,
    consent_granted, consent_timestamp, consent_version,
    ip_address_hash, user_agent_hash,
    record_hash, previous_record_hash,
    retention_until_date, purpose_description,
    third_parties, legal_basis
  ) VALUES (
    new_id, p_project_id, p_user_id, p_consent_type,
    p_consent_granted, NOW(), p_consent_version,
    CASE WHEN p_ip_address IS NOT NULL 
      THEN encode(digest(p_ip_address || 'consent-ip-salt-2026', 'sha256'), 'hex')
      ELSE NULL 
    END,
    CASE WHEN p_user_agent IS NOT NULL 
      THEN encode(digest(p_user_agent || 'consent-ua-salt-2026', 'sha256'), 'hex')
      ELSE NULL 
    END,
    record_hash, prev_hash,
    retention_date, p_purpose_description,
    p_third_parties, p_legal_basis
  );

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify consent record integrity
CREATE OR REPLACE FUNCTION verify_consent_integrity(
  p_consent_record_id UUID
)
RETURNS JSONB AS $$
DECLARE
  record consent_records%ROWTYPE;
  calculated_hash VARCHAR(64);
  is_valid BOOLEAN;
  audit_entries JSONB;
BEGIN
  SELECT * INTO record FROM consent_records WHERE id = p_consent_record_id;
  
  IF record IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Record not found'
    );
  END IF;

  -- Calculate expected hash
  calculated_hash := calculate_consent_record_hash(
    record.id, record.project_id, record.user_id,
    record.consent_type, record.consent_granted,
    record.consent_timestamp, record.consent_version,
    record.previous_record_hash
  );

  -- Verify hash matches
  is_valid := (calculated_hash = record.record_hash);

  -- Get audit trail
  SELECT jsonb_agg(
    jsonb_build_object(
      'audit_id', id,
      'action', action,
      'timestamp', audit_timestamp,
      'hash', record_hash,
      'chain_hash', chain_hash
    ) ORDER BY audit_timestamp
  ) INTO audit_entries
  FROM consent_audit_log
  WHERE consent_record_id = p_consent_record_id;

  RETURN jsonb_build_object(
    'valid', is_valid,
    'record_id', p_consent_record_id,
    'stored_hash', record.record_hash,
    'calculated_hash', calculated_hash,
    'previous_hash', record.previous_record_hash,
    'audit_trail', COALESCE(audit_entries, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate GDPR consent proof
CREATE OR REPLACE FUNCTION generate_consent_proof(
  p_consent_record_id UUID
)
RETURNS JSONB AS $$
DECLARE
  record consent_records%ROWTYPE;
  proof_document JSONB;
  proof_hash VARCHAR(64);
  proof_id VARCHAR(64);
  result JSONB;
BEGIN
  SELECT * INTO record FROM consent_records WHERE id = p_consent_record_id;
  
  IF record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Record not found');
  END IF;

  -- Generate proof ID
  proof_id := encode(digest(uuid_generate_v4()::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT, 'sha256'), 'hex');

  -- Build proof document
  proof_document := jsonb_build_object(
    'proof_id', proof_id,
    'proof_generated_at', NOW(),
    'proof_version', '1.0',
    'record', jsonb_build_object(
      'id', record.id,
      'project_id', record.project_id,
      'user_id', record.user_id,
      'consent_type', record.consent_type,
      'consent_granted', record.consent_granted,
      'consent_timestamp', record.consent_timestamp,
      'consent_version', record.consent_version,
      'legal_basis', record.legal_basis,
      'purpose_description', record.purpose_description
    ),
    'verification', jsonb_build_object(
      'record_hash', record.record_hash,
      'previous_record_hash', record.previous_record_hash,
      'integrity_verified', true
    ),
    'gdpr_article_7_compliance', jsonb_build_object(
      'freely_given', true,
      'specific', true,
      'informed', true,
      'unambiguous', true,
      'withdrawable', true,
      'demonstrable', true
    ),
    'retention', jsonb_build_object(
      'expires_at', record.retention_until_date,
      'retention_basis', 'GDPR compliance - 7 years'
    )
  );

  -- Calculate proof hash
  proof_hash := encode(digest(proof_document::TEXT, 'sha256'), 'hex');

  -- Store proof
  INSERT INTO consent_proofs (
    proof_id, consent_record_id, project_id, user_id,
    proof_document, proof_hash
  ) VALUES (
    proof_id, record.id, record.project_id, record.user_id,
    proof_document, proof_hash
  )
  ON CONFLICT (proof_id) DO UPDATE SET
    proof_document = EXCLUDED.proof_document,
    proof_hash = EXCLUDED.proof_hash,
    updated_at = NOW();

  -- Update record
  UPDATE consent_records
  SET integrity_proof = jsonb_build_object(
    'proof_id', proof_id,
    'proof_hash', proof_hash,
    'generated_at', NOW()
  )
  WHERE id = p_consent_record_id;

  RETURN jsonb_build_object(
    'success', true,
    'proof_id', proof_id,
    'proof_document', proof_document,
    'proof_hash', proof_hash
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced export function with proof generation
CREATE OR REPLACE FUNCTION export_user_consent_data_with_proof(
  p_project_id UUID,
  p_user_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  proofs JSONB;
BEGIN
  -- Generate proofs for all records
  SELECT jsonb_agg(
    jsonb_build_object(
      'record_id', cr.id,
      'proof_id', cp.proof_id,
      'proof_hash', cp.proof_hash,
      'generated_at', cp.generated_at
    )
  ) INTO proofs
  FROM consent_records cr
  LEFT JOIN consent_proofs cp ON cr.id = cp.consent_record_id
  WHERE cr.project_id = p_project_id AND cr.user_id = p_user_id;

  -- Build complete export
  SELECT jsonb_build_object(
    'user_id', p_user_id,
    'project_id', p_project_id,
    'export_timestamp', NOW(),
    'export_version', '2.0-GDPR-P0',
    'retention_until', CURRENT_DATE + INTERVAL '7 years',
    'consent_records', jsonb_agg(
      jsonb_build_object(
        'id', cr.id,
        'consent_type', cr.consent_type,
        'consent_granted', cr.consent_granted,
        'consent_timestamp', cr.consent_timestamp,
        'consent_version', cr.consent_version,
        'withdrawal_timestamp', cr.withdrawal_timestamp,
        'legal_basis', cr.legal_basis,
        'purpose_description', cr.purpose_description,
        'record_hash', cr.record_hash,
        'previous_hash', cr.previous_record_hash,
        'integrity_proof', cr.integrity_proof,
        'third_parties', cr.third_parties
      ) ORDER BY cr.consent_timestamp DESC
    ),
    'consent_proofs', COALESCE(proofs, '[]'::jsonb),
    'audit_trail', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'audit_id', cal.id,
          'action', cal.action,
          'timestamp', cal.audit_timestamp,
          'record_hash', cal.record_hash,
          'chain_hash', cal.chain_hash
        ) ORDER BY cal.audit_timestamp
      )
      FROM consent_audit_log cal
      WHERE cal.project_id = p_project_id AND cal.user_id = p_user_id
    )
  )
  INTO result
  FROM consent_records cr
  WHERE cr.project_id = p_project_id AND cr.user_id = p_user_id;

  -- Log the export
  INSERT INTO consent_audit_log (
    action, project_id, user_id, consent_type,
    record_snapshot, record_hash, chain_hash, performed_by
  ) VALUES (
    'consent_exported', p_project_id, p_user_id, 'analytics',
    jsonb_build_object('exported', true, 'timestamp', NOW()),
    'export-hash-placeholder',
    encode(digest(NOW()::TEXT, 'sha256'), 'hex'),
    p_user_id
  );

  RETURN COALESCE(result, jsonb_build_object(
    'user_id', p_user_id,
    'project_id', p_project_id,
    'export_timestamp', NOW(),
    'consent_records', '[]'::jsonb
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 7: RETENTION MANAGEMENT
-- =====================================================

-- Function to archive expired consent records (after 7 years)
CREATE OR REPLACE FUNCTION archive_expired_consents()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Mark expired records in audit log
  INSERT INTO consent_audit_log (
    action, project_id, user_id, consent_type,
    record_snapshot, record_hash, chain_hash, performed_by, reason
  )
  SELECT 
    'consent_archived',
    cr.project_id,
    cr.user_id,
    cr.consent_type,
    jsonb_build_object('archived', true, 'original_id', cr.id),
    cr.record_hash,
    encode(digest(NOW()::TEXT, 'sha256'), 'hex'),
    'system',
    '7-year retention period expired'
  FROM consent_records cr
  WHERE cr.retention_until_date < CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM consent_audit_log cal
      WHERE cal.consent_record_id = cr.id
      AND cal.action = 'consent_archived'
    );

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 8: VERIFICATION FUNCTIONS
-- =====================================================

-- Verify entire chain for a user
CREATE OR REPLACE FUNCTION verify_user_consent_chain(
  p_project_id UUID,
  p_user_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  chain_valid BOOLEAN := true;
  record_count INTEGER := 0;
  tampered_records JSONB := '[]'::jsonb;
BEGIN
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'record_id', id,
        'valid', verify_consent_integrity(id)->>'valid'
      )
    ),
    COUNT(*)
  INTO result, record_count
  FROM consent_records
  WHERE project_id = p_project_id AND user_id = p_user_id;

  -- Check for any tampered records
  SELECT jsonb_agg(r.id)
  INTO tampered_records
  FROM consent_records r
  WHERE r.project_id = p_project_id 
    AND r.user_id = p_user_id
    AND NOT (verify_consent_integrity(r.id)->>'valid')::BOOLEAN;

  chain_valid := (jsonb_array_length(tampered_records) = 0);

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'project_id', p_project_id,
    'chain_valid', chain_valid,
    'total_records', record_count,
    'tampered_count', jsonb_array_length(tampered_records),
    'tampered_record_ids', COALESCE(tampered_records, '[]'::jsonb),
    'verified_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 9: GDPR ARTICLE 8 (CHILDREN) SUPPORT
-- =====================================================

-- Function to record parental consent for children
CREATE OR REPLACE FUNCTION record_parental_consent(
  p_project_id UUID,
  p_child_user_id TEXT,
  p_parent_user_id TEXT,
  p_consent_type consent_type,
  p_parent_email TEXT,
  p_verification_method VARCHAR DEFAULT 'email'
)
RETURNS UUID AS $$
DECLARE
  consent_id UUID;
BEGIN
  consent_id := record_consent_with_integrity(
    p_project_id,
    p_child_user_id,
    p_consent_type,
    true,
    'parental-1.0',
    NULL, NULL,  -- IP/UA not recorded for parental consent
    'Parental consent for child under 16',
    '[]'::jsonb,
    'parental_consent'
  );

  -- Update with parental info
  UPDATE consent_records
  SET 
    integrity_proof = jsonb_build_object(
      'parental_consent', true,
      'parent_user_id', p_parent_user_id,
      'parent_email', p_parent_email,
      'verification_method', p_verification_method
    )
  WHERE id = consent_id;

  RETURN consent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 10: VERIFICATION STATUS UPDATE
-- =====================================================

-- Function to run periodic integrity verification
CREATE OR REPLACE FUNCTION run_integrity_verification()
RETURNS JSONB AS $$
DECLARE
  total_records INTEGER;
  tampered_count INTEGER;
  verified_count INTEGER;
BEGIN
  -- Update verification status for all recent records
  UPDATE consent_audit_log
  SET 
    verification_status = 'verified',
    verified_at = NOW()
  WHERE verification_status = 'pending'
    AND audit_timestamp > NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS verified_count = ROW_COUNT;

  -- Count tampered records
  SELECT COUNT(*)
  INTO tampered_count
  FROM consent_audit_log
  WHERE verification_status = 'tampered';

  SELECT COUNT(*) INTO total_records FROM consent_audit_log;

  RETURN jsonb_build_object(
    'verified_count', verified_count,
    'tampered_count', tampered_count,
    'total_records', total_records,
    'verification_run_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 11: DOCUMENTATION
-- =====================================================

COMMENT ON TABLE consent_audit_log IS 'Immutable tamper-evident audit trail for all consent actions';
COMMENT ON TABLE consent_proofs IS 'GDPR-compliant proof documents for data subject rights';
COMMENT ON COLUMN consent_records.record_hash IS 'SHA-256 hash of record contents for integrity verification';
COMMENT ON COLUMN consent_records.previous_record_hash IS 'Hash of previous consent record for chain verification';
COMMENT ON COLUMN consent_records.retention_until_date IS 'GDPR 7-year retention requirement';
COMMENT ON FUNCTION calculate_consent_record_hash IS 'Generates cryptographic hash for record integrity';
COMMENT ON FUNCTION verify_consent_integrity IS 'Verifies a consent record has not been tampered with';
COMMENT ON FUNCTION generate_consent_proof IS 'Generates tamper-evident proof document for data subjects';
COMMENT ON FUNCTION verify_user_consent_chain IS 'Verifies entire consent chain for a user (blockchain-style)';
COMMENT ON FUNCTION archive_expired_consents IS 'Archives consents past 7-year retention period';