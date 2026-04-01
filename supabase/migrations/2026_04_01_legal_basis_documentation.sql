-- Migration: GDPR Legal Basis Documentation and Consent Flow for Article 6 Compliance
-- Created: 2026-04-01
-- Ticket: REMY-261

-- ============================================
-- PART 1: Legal Basis Enum and Supporting Types
-- ============================================

CREATE TYPE legal_basis_type AS ENUM (
  'consent',           -- Article 6(1)(a): Data subject has given consent
  'contract',          -- Article 6(1)(b): Contractual necessity
  'legal_obligation',  -- Article 6(1)(c): Legal obligation compliance
  'vital_interests',   -- Article 6(1)(d): Protect vital interests
  'public_task',       -- Article 6(1)(e): Public interest or official authority
  'legitimate_interest' -- Article 6(1)(f): Legitimate interests (with balancing test)
);

CREATE TYPE processing_purpose AS ENUM (
  'authentication',
  'analytics', 
  'marketing',
  'personalization',
  'service_delivery',
  'customer_support',
  'legal_compliance',
  'fraud_prevention',
  'research',
  'data_portability'
);

CREATE TYPE legal_basis_status AS ENUM ('active', 'suspended', 'deprecated');
CREATE TYPE consent_mechanism AS ENUM ('explicit', 'implied', 'opt_out', 'not_required');

-- ============================================
-- PART 2: Processing Activities Table
-- Art 6: Legal basis must be documented BEFORE processing
-- ============================================

CREATE TABLE IF NOT EXISTS processing_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Activity identification
  activity_id VARCHAR(100) NOT NULL UNIQUE,
  activity_name VARCHAR(255) NOT NULL,
  activity_description TEXT NOT NULL,
  
  -- GDPR Art 6: Legal basis documentation
  legal_basis legal_basis_type NOT NULL,
  legal_basis_justification TEXT NOT NULL, -- Why this basis applies
  
  -- Processing details
  processing_purpose processing_purpose NOT NULL,
  data_categories TEXT[] NOT NULL DEFAULT ARRAY['personal'], -- What data is processed
  data_subjects TEXT[] NOT NULL DEFAULT ARRAY['users'], -- Whose data
  
  -- Recipients
  internal_recipients TEXT[] DEFAULT '{}', -- Internal departments
  external_recipients TEXT[] DEFAULT '{}', -- Third parties (subprocessors)
  
  -- Retention & Location
  retention_period_days INTEGER NOT NULL, -- How long data is kept
  storage_locations TEXT[] DEFAULT '{}', -- Where data is stored
  
  -- For legitimate interest only (Art 6(1)(f) balancing test)
  legitimate_interest_description TEXT,
  legitimate_interest_impact_assessment TEXT,
  legitimate_interest_balancing_completed BOOLEAN DEFAULT FALSE,
  
  -- For consent only (Art 7 requirements)
  consent_mechanism consent_mechanism,
  consent_collection_ui_component VARCHAR(100), -- Reference to UI component
  consent_withdrawal_mechanism VARCHAR(255),
  
  -- Documentation & Versioning
  document_reference VARCHAR(255), -- Link to policy document
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  version VARCHAR(20) NOT NULL DEFAULT '1.0',
  status legal_basis_status NOT NULL DEFAULT 'active',
  
  -- Audit trail (immutable after creation)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Soft delete for audit trail
  deprecated_at TIMESTAMPTZ,
  deprecated_reason TEXT,
  superseded_by UUID REFERENCES processing_activities(id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_processing_activities_legal_basis 
ON processing_activities(legal_basis);

CREATE INDEX IF NOT EXISTS idx_processing_activities_purpose 
ON processing_activities(processing_purpose);

CREATE INDEX IF NOT EXISTS idx_processing_activities_status 
ON processing_activities(status);

CREATE INDEX IF NOT EXISTS idx_processing_activities_active 
ON processing_activities(activity_id, status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_processing_activities_consent 
ON processing_activities(legal_basis) 
WHERE legal_basis = 'consent';

-- ============================================
-- PART 3: Legal Basis Audit Trail Table
-- Complete audit trail for all legal basis declarations
-- ============================================

CREATE TABLE IF NOT EXISTS legal_basis_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- What changed
  activity_id UUID REFERENCES processing_activities(id) ON DELETE CASCADE,
  change_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deprecated', 'approved'
  
  -- Snapshot of critical fields at time of change
  legal_basis legal_basis_type,
  legal_basis_justification TEXT,
  status legal_basis_status,
  version VARCHAR(20),
  
  -- Detailed change tracking
  previous_values JSONB, -- State before change
  new_values JSONB,      -- State after change
  
  -- Who and when
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- IP and user agent for accountability
  ip_address_hash VARCHAR(64),
  user_agent_hash VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_legal_basis_audit_activity 
ON legal_basis_audit_log(activity_id);

CREATE INDEX IF NOT EXISTS idx_legal_basis_audit_changed_at 
ON legal_basis_audit_log(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_legal_basis_audit_change_type 
ON legal_basis_audit_log(change_type);

-- ============================================
-- PART 4: Enhanced Consent Records Table Extension
-- Adding Article 7 compliance fields
-- ============================================

-- Alter existing consent_records table if it exists, or ensure fields are present
DO $$
BEGIN
  -- Add legal basis reference if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consent_records' 
    AND column_name = 'legal_basis_id'
  ) THEN
    ALTER TABLE consent_records 
    ADD COLUMN legal_basis_id UUID REFERENCES processing_activities(id);
  END IF;

  -- Add consent granularity fields if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consent_records' 
    AND column_name = 'purpose_descriptions'
  ) THEN
    ALTER TABLE consent_records 
    ADD COLUMN purpose_descriptions JSONB DEFAULT '{}'; -- {purpose: description}
  END IF;

  -- Add withdrawal mechanism tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consent_records' 
    AND column_name = 'withdrawal_method'
  ) THEN
    ALTER TABLE consent_records 
    ADD COLUMN withdrawal_method VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consent_records' 
    AND column_name = 'withdrawal_ease_score'
  ) THEN
    ALTER TABLE consent_records 
    ADD COLUMN withdrawal_ease_score INTEGER CHECK (withdrawal_ease_score BETWEEN 1 AND 10);
  END IF;
END $$;

-- ============================================
-- PART 5: Consent Collection Events Table
-- Track when/how consent was presented and collected
-- ============================================

CREATE TABLE IF NOT EXISTS consent_collection_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Reference to the consent record
  consent_record_id UUID REFERENCES consent_records(id) ON DELETE CASCADE,
  
  -- Collection event details
  event_type VARCHAR(50) NOT NULL, -- 'presented', 'accepted', 'rejected', 'customized'
  
  -- User context
  user_id TEXT NOT NULL,
  project_id UUID NOT NULL,
  session_id VARCHAR(255),
  
  -- Presentation details
  ui_component VARCHAR(100) NOT NULL,
  ui_variant VARCHAR(50), -- A/B test variant
  
  -- Art 7: Consent must be informed
  information_shown JSONB NOT NULL DEFAULT '{}', -- What was disclosed
  -- e.g., {legal_basis: "consent", purposes: ["analytics"], data_retention: "365 days"}
  
  -- User interaction details
  time_to_decision_ms INTEGER, -- How long to decide
  decision_method VARCHAR(50), -- 'click', 'toggle', 'form_submit'
  
  -- Device context
  device_type VARCHAR(50),
  screen_size VARCHAR(50),
  accessibility_features_enabled BOOLEAN DEFAULT FALSE,
  
  -- Technical context
  ip_address_hash VARCHAR(64),
  user_agent_hash VARCHAR(64),
  language VARCHAR(10),
  timezone VARCHAR(50),
  
  -- Timestamps
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_events_user 
ON consent_collection_events(user_id);

CREATE INDEX IF NOT EXISTS idx_consent_events_project 
ON consent_collection_events(project_id);

CREATE INDEX IF NOT EXISTS idx_consent_events_consent_record 
ON consent_collection_events(consent_record_id);

CREATE INDEX IF NOT EXISTS idx_consent_events_occurred_at 
ON consent_collection_events(occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_consent_events_ui_component 
ON consent_collection_events(ui_component);

-- ============================================
-- PART 6: Consent Withdrawal Log Table
-- Art 7: Withdrawal as easy as giving consent
-- ============================================

CREATE TABLE IF NOT EXISTS consent_withdrawal_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Reference
  consent_record_id UUID REFERENCES consent_records(id),
  user_id TEXT NOT NULL,
  project_id UUID NOT NULL,
  
  -- Withdrawal details
  withdrawal_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawal_channel VARCHAR(100) NOT NULL, -- 'settings_page', 'email', 'api_call', 'contact_form'
  withdrawal_method VARCHAR(50) NOT NULL, -- 'button_click', 'email_request', 'api_call'
  
  -- Art 7: Tracking ease of withdrawal
  steps_required INTEGER NOT NULL DEFAULT 1,
  time_to_withdraw_seconds INTEGER, -- Time from starting to completion
  
  -- Whether withdrawal was successful
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  confirmation_sent BOOLEAN DEFAULT FALSE,
  confirmation_sent_at TIMESTAMPTZ,
  
  -- User feedback (optional)
  withdrawal_reason TEXT,
  user_feedback TEXT,
  
  -- Technical context
  ip_address_hash VARCHAR(64),
  user_agent_hash VARCHAR(64),
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Composite index for user withdrawal lookups
  CONSTRAINT idx_withdrawal_user_project_type 
  UNIQUE (user_id, project_id, withdrawal_timestamp)
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_log_user 
ON consent_withdrawal_log(user_id);

CREATE INDEX IF NOT EXISTS idx_withdrawal_log_project 
ON consent_withdrawal_log(project_id);

CREATE INDEX IF NOT EXISTS idx_withdrawal_log_timestamp 
ON consent_withdrawal_log(withdrawal_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_withdrawal_log_unprocessed 
ON consent_withdrawal_log(processed_at) 
WHERE processed_at IS NULL;

-- ============================================
-- PART 7: Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on new tables
ALTER TABLE processing_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_basis_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_collection_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_withdrawal_log ENABLE ROW LEVEL SECURITY;

-- Processing Activities policies
CREATE POLICY "Service role can manage processing activities"
ON processing_activities FOR ALL
USING (
  current_setting('request.jwt.claim.role', true) = 'service_role'
);

CREATE POLICY "Users can view active processing activities"
ON processing_activities FOR SELECT
USING (status = 'active');

-- Legal Basis Audit Log policies
CREATE POLICY "Service role can view audit log"
ON legal_basis_audit_log FOR SELECT
USING (
  current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- Consent Collection Events policies
CREATE POLICY "Service role can manage consent events"
ON consent_collection_events FOR ALL
USING (
  current_setting('request.jwt.claim.role', true) = 'service_role'
);

CREATE POLICY "Users can view their own consent events"
ON consent_collection_events FOR SELECT
USING (
  user_id = current_setting('request.jwt.claim.sub', true)
);

-- Consent Withdrawal Log policies
CREATE POLICY "Service role can manage withdrawal log"
ON consent_withdrawal_log FOR ALL
USING (
  current_setting('request.jwt.claim.role', true) = 'service_role'
);

CREATE POLICY "Users can view their own withdrawal log"
ON consent_withdrawal_log FOR SELECT
USING (
  user_id = current_setting('request.jwt.claim.sub', true)
);

-- ============================================
-- PART 8: Helper Functions
-- ============================================

-- Function: Get legal basis for a processing activity
CREATE OR REPLACE FUNCTION get_processing_activity_legal_basis(
  p_activity_id VARCHAR
)
RETURNS TABLE (
  legal_basis legal_basis_type,
  legal_basis_justification TEXT,
  status legal_basis_status,
  version VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pa.legal_basis,
    pa.legal_basis_justification,
    pa.status,
    pa.version
  FROM processing_activities pa
  WHERE pa.activity_id = p_activity_id
  AND pa.status = 'active'
  ORDER BY pa.approved_at DESC NULLS LAST
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if processing is authorized (Art 6 compliance)
CREATE OR REPLACE FUNCTION is_processing_authorized(
  p_activity_id VARCHAR,
  p_user_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_legal_basis legal_basis_type;
  v_consent_required BOOLEAN;
  v_has_consent BOOLEAN;
BEGIN
  -- Get the legal basis for this activity
  SELECT legal_basis INTO v_legal_basis
  FROM processing_activities
  WHERE activity_id = p_activity_id
  AND status = 'active'
  LIMIT 1;
  
  -- If no active activity found, deny
  IF v_legal_basis IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- If consent required, check user consent
  IF v_legal_basis = 'consent' AND p_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM consent_records cr
      WHERE cr.user_id = p_user_id
      AND cr.consent_granted = TRUE
      AND (cr.withdrawal_timestamp IS NULL OR cr.withdrawal_timestamp > NOW())
      AND cr.legal_basis_id IN (
        SELECT id FROM processing_activities WHERE activity_id = p_activity_id
      )
    ) INTO v_has_consent;
    
    RETURN v_has_consent;
  END IF;
  
  -- For non-consent bases, processing is authorized if documented
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Log legal basis audit entry
CREATE OR REPLACE FUNCTION log_legal_basis_audit(
  p_activity_id UUID,
  p_change_type VARCHAR,
  p_changed_by UUID,
  p_previous_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address_hash VARCHAR DEFAULT NULL,
  p_user_agent_hash VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_legal_basis legal_basis_type;
  v_justification TEXT;
  v_status legal_basis_status;
  v_version VARCHAR;
BEGIN
  -- Get current activity details
  SELECT legal_basis, legal_basis_justification, status, version
  INTO v_legal_basis, v_justification, v_status, v_version
  FROM processing_activities
  WHERE id = p_activity_id;
  
  -- Insert audit log
  INSERT INTO legal_basis_audit_log (
    activity_id,
    change_type,
    legal_basis,
    legal_basis_justification,
    status,
    version,
    previous_values,
    new_values,
    changed_by,
    ip_address_hash,
    user_agent_hash
  ) VALUES (
    p_activity_id,
    p_change_type,
    v_legal_basis,
    v_justification,
    v_status,
    v_version,
    p_previous_values,
    p_new_values,
    p_changed_by,
    p_ip_address_hash,
    p_user_agent_hash
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Automatically log legal basis changes
CREATE OR REPLACE FUNCTION trigger_legal_basis_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_legal_basis_audit(
      NEW.id,
      'created',
      NEW.created_by,
      NULL,
      to_jsonb(NEW),
      NULL,
      NULL
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_legal_basis_audit(
      NEW.id,
      'updated',
      NEW.updated_by,
      to_jsonb(OLD),
      to_jsonb(NEW),
      NULL,
      NULL
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_processing_activities_audit ON processing_activities;
CREATE TRIGGER trigger_processing_activities_audit
  AFTER INSERT OR UPDATE ON processing_activities
  FOR EACH ROW
  EXECUTE FUNCTION trigger_legal_basis_audit();

-- Function: Get user's complete consent history
CREATE OR REPLACE FUNCTION get_user_consent_history(
  p_user_id TEXT,
  p_project_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'user_id', p_user_id,
      'project_id', p_project_id,
      'consent_records', COALESCE(jsonb_agg(
        jsonb_build_object(
          'consent_type', cr.consent_type,
          'consent_granted', cr.consent_granted,
          'consent_timestamp', cr.consent_timestamp,
          'withdrawal_timestamp', cr.withdrawal_timestamp,
          'legal_basis', pa.legal_basis,
          'purpose', pa.processing_purpose,
          'activity_name', pa.activity_name
        ) ORDER BY cr.consent_timestamp DESC
      ), '[]'::jsonb),
      'collection_events', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'event_type', cce.event_type,
            'occurred_at', cce.occurred_at,
            'ui_component', cce.ui_component
          ) ORDER BY cce.occurred_at DESC
        )
        FROM consent_collection_events cce
        WHERE cce.user_id = p_user_id
        AND (p_project_id IS NULL OR cce.project_id = p_project_id)
      ), '[]'::jsonb),
      'withdrawal_events', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'withdrawal_timestamp', cwl.withdrawal_timestamp,
            'withdrawal_method', cwl.withdrawal_method,
            'steps_required', cwl.steps_required
          ) ORDER BY cwl.withdrawal_timestamp DESC
        )
        FROM consent_withdrawal_log cwl
        WHERE cwl.user_id = p_user_id
        AND (p_project_id IS NULL OR cwl.project_id = p_project_id)
      ), '[]'::jsonb)
    )
    FROM consent_records cr
    LEFT JOIN processing_activities pa ON cr.legal_basis_id = pa.id
    WHERE cr.user_id = p_user_id
    AND (p_project_id IS NULL OR cr.project_id = p_project_id)
    GROUP BY p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check consent withdrawal ease (Art 7 requirement)
CREATE OR REPLACE FUNCTION get_consent_withdrawal_ease(
  p_user_id TEXT,
  p_project_id UUID
)
RETURNS TABLE (
  consent_type TEXT,
  can_withdraw BOOLEAN,
  withdrawal_steps INTEGER,
  withdrawal_methods TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.consent_type::TEXT,
    TRUE as can_withdraw, -- Consent can always be withdrawn
    COALESCE(
      (SELECT MIN(steps_required) 
       FROM consent_withdrawal_log cwl2 
       WHERE cwl2.user_id = p_user_id 
       AND cwl2.project_id = p_project_id),
      1
    ) as withdrawal_steps,
    ARRAY['settings_page', 'email', 'api_call']::TEXT[] as withdrawal_methods
  FROM consent_records cr
  WHERE cr.user_id = p_user_id
  AND cr.project_id = p_project_id
  AND cr.consent_granted = TRUE
  AND cr.withdrawal_timestamp IS NULL
  GROUP BY cr.consent_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get legal basis compliance report
CREATE OR REPLACE FUNCTION get_legal_basis_compliance_report(
  p_project_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'generated_at', NOW(),
    'project_id', p_project_id,
    'processing_activities_summary', (
      SELECT jsonb_build_object(
        'total_activities', COUNT(*),
        'by_legal_basis', jsonb_object_agg(
          COALESCE(legal_basis::TEXT, 'unknown'),
          COUNT(*)
        ),
        'active_count', COUNT(*) FILTER (WHERE status = 'active'),
        'deprecated_count', COUNT(*) FILTER (WHERE status = 'deprecated'),
        'without_approval', COUNT(*) FILTER (WHERE approved_at IS NULL)
      )
      FROM processing_activities
      WHERE (p_project_id IS NULL OR EXISTS (
        SELECT 1 FROM consent_records cr 
        WHERE cr.project_id = p_project_id 
        AND cr.legal_basis_id = processing_activities.id
      ))
    ),
    'consent_compliance', (
      SELECT jsonb_build_object(
        'total_consents', COUNT(*),
        'with_documented_legal_basis', COUNT(*) FILTER (WHERE legal_basis_id IS NOT NULL),
        'without_legal_basis', COUNT(*) FILTER (WHERE legal_basis_id IS NULL),
        'withdrawal_availability', jsonb_build_object(
          'has_withdrawal_mechanism', TRUE,
          'withdrawal_methods_available', ARRAY['settings_page', 'api_endpoint', 'email']
        )
      )
      FROM consent_records
      WHERE (p_project_id IS NULL OR project_id = p_project_id)
    ),
    'audit_trail_completeness', (
      SELECT jsonb_build_object(
        'total_audit_entries', COUNT(*),
        'activities_with_audit_history', COUNT(DISTINCT activity_id)
      )
      FROM legal_basis_audit_log
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 9: Seed Initial Processing Activities
-- Document the legal basis for core platform activities
-- ============================================

INSERT INTO processing_activities (
  activity_id,
  activity_name,
  activity_description,
  legal_basis,
  legal_basis_justification,
  processing_purpose,
  data_categories,
  data_subjects,
  retention_period_days,
  storage_locations,
  consent_mechanism,
  consent_withdrawal_mechanism,
  document_reference,
  version,
  status,
  created_at
)
VALUES 
-- Authentication activities (contractual necessity)
(
  'AUTH-001',
  'User Authentication',
  'Processing user credentials to provide access to the platform',
  'contract',
  'Processing is necessary for the performance of the contract to provide platform services (GDPR Art 6(1)(b))',
  'service_delivery',
  ARRAY['email', 'password_hash', 'session_tokens'],
  ARRAY['registered_users'],
  90,
  ARRAY['us-east-1', 'eu-west-1'],
  NULL,
  NULL,
  '/legal/privacy-policy#authentication',
  '1.0',
  'active',
  NOW()
),
-- Analytics (consent required)
(
  'ANALYTICS-001',
  'Usage Analytics',
  'Collecting anonymized usage data to improve platform performance and features',
  'consent',
  'User has provided explicit consent through banner (GDPR Art 6(1)(a). Consent can be withdrawn at any time.',
  'analytics',
  ARRAY['usage_patterns', 'device_info', 'interaction_data'],
  ARRAY['users', 'visitors'],
  365,
  ARRAY['us-east-1'],
  'explicit',
  '/settings/privacy#withdraw-consent',
  '/legal/privacy-policy#analytics',
  '1.0',
  'active',
  NOW()
),
-- Marketing (consent required)
(
  'MARKETING-001',
  'Marketing Communications',
  'Sending promotional emails and product updates to users who have opted in',
  'consent',
  'User has provided explicit consent for marketing communications (GDPR Art 6(1)(a)). Consent can be withdrawn at any time via unsubscribe link or settings.',
  'marketing',
  ARRAY['email_address', 'preferences'],
  ARRAY['subscribers'],
  730,
  ARRAY['us-east-1', 'eu-west-1'],
  'explicit',
  '/settings/notifications#unsubscribe OR email unsubscribe link',
  '/legal/privacy-policy#marketing',
  '1.0',
  'active',
  NOW()
),
-- Legal compliance
(
  'LEGAL-001',
  'Regulatory Compliance',
  'Processing required to comply with legal obligations such as tax reporting and fraud prevention',
  'legal_obligation',
  'Processing is necessary for compliance with legal obligations under applicable law (GDPR Art 6(1)(c))',
  'legal_compliance',
  ARRAY['transaction_data', 'identity_verification'],
  ARRAY['customers'],
  2555, -- 7 years for tax purposes
  ARRAY['us-east-1'],
  'not_required',
  NULL,
  '/legal/privacy-policy#legal-compliance',
  '1.0',
  'active',
  NOW()
),
-- Legitimate interest: Customer support
(
  'SUPPORT-001',
  'Customer Support',
  'Processing user data to provide customer support and resolve issues',
  'legitimate_interest',
  'Processing is based on legitimate interest to provide quality support (GDPR Art 6(1)(f). Impact assessed: minimal privacy impact, users expect this processing.',
  'customer_support',
  ARRAY['contact_history', 'account_data'],
  ARRAY['customers', 'users'],
  365,
  ARRAY['us-east-1'],
  NULL,
  NULL,
  '/legal/privacy-policy#support',
  '1.0',
  'active',
  NOW()
)
ON CONFLICT (activity_id) DO NOTHING;

-- ============================================
-- PART 10: Comments for Documentation
-- ============================================

COMMENT ON TABLE processing_activities IS 'GDPR Article 6: Legal basis must be documented BEFORE any processing occurs';
COMMENT ON TABLE legal_basis_audit_log IS 'Immutable audit trail of all legal basis declarations and changes';
COMMENT ON TABLE consent_collection_events IS 'GDPR Article 7: Records of when/how consent was presented and collected';
COMMENT ON TABLE consent_withdrawal_log IS 'GDPR Article 7: Withdrawal must be as easy as giving consent - tracked here';

COMMENT ON COLUMN processing_activities.legal_basis IS 'GDPR Article 6(1) legal basis: consent, contract, legal_obligation, vital_interests, public_task, legitimate_interest';
COMMENT ON COLUMN processing_activities.legal_basis_justification IS 'Why this legal basis applies - mandatory documentation';
COMMENT ON COLUMN processing_activities.legitimate_interest_balancing_completed IS 'For Art 6(1)(f): Was Legitimate Interest Assessment (LIA) completed?';
COMMENT ON COLUMN processing_activities.consent_mechanism IS 'How consent is collected: explicit, implied, opt_out, or not_required';
COMMENT ON COLUMN processing_activities.approved_at IS 'When the legal basis was approved - processing cannot occur before this date';

COMMENT ON COLUMN consent_records.legal_basis_id IS 'Reference to the processing activity that defines the legal basis';
COMMENT ON COLUMN consent_records.purpose_descriptions IS 'Art 7: Granular description of what user consented to';
COMMENT ON COLUMN consent_withdrawal_log.steps_required IS 'Art 7 compliance: How many steps to withdraw consent';
COMMENT ON COLUMN consent_withdrawal_log.time_to_withdraw_seconds IS 'Art 7 compliance: How long withdrawal process takes';

-- Create updated_at function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_processing_activities_updated_at ON processing_activities;
CREATE TRIGGER update_processing_activities_updated_at
  BEFORE UPDATE ON processing_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
