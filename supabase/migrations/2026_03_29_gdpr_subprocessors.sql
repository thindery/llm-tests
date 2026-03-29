-- Migration: Add Subprocessors table for GDPR compliance
-- Created: 2026-03-29
-- Ticket: REMY-259

-- Create enums
CREATE TYPE subprocessor_status AS ENUM ('active', 'pending_review', 'terminating', 'terminated');
CREATE TYPE data_sensitivity_level AS ENUM ('standard', 'high', 'restricted');

-- Main subprocessors table
CREATE TABLE IF NOT EXISTS subprocessors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  legal_name VARCHAR(255),
  service_provided TEXT NOT NULL,
  service_category VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  data_center_locations TEXT[],
  data_types TEXT[] NOT NULL,
  data_sensitivity data_sensitivity_level DEFAULT 'standard',
  security_certifications TEXT[],
  contract_status subprocessor_status NOT NULL DEFAULT 'active',
  dpa_signed BOOLEAN NOT NULL DEFAULT FALSE,
  dpa_signed_at TIMESTAMPTZ,
  dpa_document_url TEXT,
  scc_signed BOOLEAN NOT NULL DEFAULT FALSE,
  scc_type VARCHAR(50),
  scc_signed_at TIMESTAMPTZ,
  transfer_mechanism VARCHAR(100),
  vendor_contact_email VARCHAR(255),
  vendor_privacy_url TEXT,
  vendor_security_url TEXT,
  vendor_dpa_url TEXT,
  risk_assessment TEXT,
  annual_review_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT
);

-- Change history table
CREATE TABLE IF NOT EXISTS subprocessor_change_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subprocessor_id UUID NOT NULL REFERENCES subprocessors(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_type VARCHAR(50) NOT NULL,
  changes JSONB NOT NULL,
  change_reason TEXT,
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS subprocessor_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subprocessor_id UUID REFERENCES subprocessors(id) ON DELETE SET NULL,
  change_history_id UUID REFERENCES subprocessor_change_history(id) ON DELETE SET NULL,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_date DATE,
  requires_acknowledgment BOOLEAN DEFAULT FALSE,
  acknowledgment_deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Customer acknowledgments table
CREATE TABLE IF NOT EXISTS customer_subprocessor_acknowledgments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES subprocessor_notifications(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address_hash VARCHAR(64),
  acknowledged_via VARCHAR(50),
  UNIQUE(customer_id, notification_id)
);

-- Indexes
CREATE INDEX idx_subprocessors_status ON subprocessors(contract_status);
CREATE INDEX idx_subprocessors_category ON subprocessors(service_category);
CREATE INDEX idx_subprocessors_location ON subprocessors(location);
CREATE INDEX idx_subprocessor_changes_subprocessor ON subprocessor_change_history(subprocessor_id);
CREATE INDEX idx_subprocessor_notifications_published ON subprocessor_notifications(published_at DESC);
CREATE INDEX idx_customer_acknowledgments_customer ON customer_subprocessor_acknowledgments(customer_id);

-- RLS
ALTER TABLE subprocessors ENABLE ROW LEVEL SECURITY;
ALTER TABLE subprocessor_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subprocessor_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_subprocessor_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view active subprocessors"
ON subprocessors FOR SELECT USING (contract_status = 'active');

CREATE POLICY "Service role can manage subprocessors"
ON subprocessors FOR ALL USING (current_setting('request.jwt.claim.role', true) = 'service_role');

CREATE POLICY "Anyone can view change history"
ON subprocessor_change_history FOR SELECT USING (true);

CREATE POLICY "Anyone can view notifications"
ON subprocessor_notifications FOR SELECT USING (true);

CREATE POLICY "Users can view their acknowledgments"
ON customer_subprocessor_acknowledgments FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Users can create their acknowledgments"
ON customer_subprocessor_acknowledgments FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_subprocessors_updated_at ON subprocessors;
CREATE TRIGGER update_subprocessors_updated_at
  BEFORE UPDATE ON subprocessors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Change logging trigger
CREATE OR REPLACE FUNCTION log_subprocessor_change() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO subprocessor_change_history (
      subprocessor_id, changed_by, change_type, changes, change_reason
    ) VALUES (
      NEW.id, NEW.added_by, 'added',
      jsonb_build_object('new', row_to_json(NEW)),
      COALESCE(NEW.notes, 'Initial creation')
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO subprocessor_change_history (
      subprocessor_id, changed_by, change_type, changes, change_reason
    ) VALUES (
      NEW.id, NEW.added_by,
      CASE WHEN NEW.contract_status != OLD.contract_status THEN 'status_changed' ELSE 'updated' END,
      jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)),
      COALESCE(NEW.notes, 'Update')
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_subprocessor_changes ON subprocessors;
CREATE TRIGGER trg_log_subprocessor_changes
  AFTER INSERT OR UPDATE ON subprocessors
  FOR EACH ROW EXECUTE FUNCTION log_subprocessor_change();

-- Insert initial subprocessors
INSERT INTO subprocessors (
  name, legal_name, service_provided, service_category, location,
  data_center_locations, data_types, data_sensitivity, security_certifications,
  contract_status, dpa_signed, scc_signed, scc_type, transfer_mechanism,
  vendor_privacy_url, vendor_security_url, vendor_dpa_url, annual_review_date, notes
) VALUES
('Railway', 'Railway Technologies Inc.', 'Cloud hosting and compute infrastructure', 'hosting',
 'United States', ARRAY['US West', 'US East', 'EU West'], ARRAY['Infrastructure metadata', 'Application logs'], 'standard',
 ARRAY['SOC 2 Type II', 'ISO 27001'], 'active', TRUE, TRUE, '2021_EU',
 'Standard Contractual Clauses (2021 version)', 'https://railway.app/legal/privacy',
 'https://railway.app/legal/security', 'https://railway.app/legal/dpa', '2026-12-31', 'Primary hosting platform'),
('Vercel', 'Vercel Inc.', 'Edge network and frontend deployment', 'hosting',
 'United States', ARRAY['Global Edge', 'US (Virginia)', 'EU (Dublin)'], ARRAY['Static assets', 'Edge logs'], 'standard',
 ARRAY['SOC 2 Type II', 'ISO 27001', 'GDPR'], 'active', TRUE, TRUE, '2021_EU',
 'Standard Contractual Clauses + DPA', 'https://vercel.com/legal/privacy-policy',
 'https://vercel.com/security', 'https://vercel.com/legal/data-processing-agreement', '2026-12-31', 'Frontend deployment'),
('Cloudflare R2', 'Cloudflare, Inc.', 'Object storage for session recordings', 'storage',
 'United States', ARRAY['Global (200+ cities)', 'NA', 'EU', 'APAC'], ARRAY['Session recordings', 'Assets'], 'high',
 ARRAY['SOC 2 Type II', 'ISO 27001', 'ISO 27018', 'GDPR'], 'active', TRUE, TRUE, '2021_EU',
 'Standard Contractual Clauses + EU SCCs', 'https://www.cloudflare.com/privacy/',
 'https://www.cloudflare.com/security/', 'https://www.cloudflare.com/cloudflare-customer-dpa/', '2026-12-31', 'Object storage'),
('Supabase', 'Supabase Inc.', 'Managed PostgreSQL and auth services', 'database',
 'United States', ARRAY['AWS US East', 'AWS US West', 'AWS EU', 'AWS APAC'], ARRAY['User data', 'Auth data'], 'high',
 ARRAY['SOC 2 Type II', 'ISO 27001', 'GDPR'], 'active', TRUE, TRUE, '2021_EU',
 'Standard Contractual Clauses', 'https://supabase.com/privacy', 'https://supabase.com/security',
 'https://supabase.com/legal/dpa', '2026-12-31', 'Database infrastructure'),
('Cloudflare CDN', 'Cloudflare, Inc.', 'CDN and DDoS protection', 'cdn',
 'United States', ARRAY['Global (200+ cities)'], ARRAY['Cached content', 'Access logs'], 'standard',
 ARRAY['SOC 2 Type II', 'ISO 27001', 'ISO 27701'], 'active', TRUE, TRUE, '2021_EU',
 'Standard Contractual Clauses + adequacy', 'https://www.cloudflare.com/privacy/',
 'https://www.cloudflare.com/trust-hub/compliance-resources/', 'https://www.cloudflare.com/cloudflare-customer-dpa/', '2026-12-31', 'CDN'),
('Sentry', 'Functional Software, Inc.', 'Error monitoring and APM', 'monitoring',
 'United States', ARRAY['US (Iowa)', 'EU (Belgium)'], ARRAY['Error logs', 'Stack traces'], 'standard',
 ARRAY['SOC 2 Type II', 'ISO 27001'], 'active', TRUE, TRUE, '2021_EU',
 'Standard Contractual Clauses (2021 version)', 'https://sentry.io/privacy/',
 'https://sentry.io/security/', 'https://sentry.io/legal/dpa/', '2026-12-31', 'Error tracking')
ON CONFLICT (name) DO UPDATE SET
  service_provided = EXCLUDED.service_provided,
  updated_at = NOW(),
  notes = EXCLUDED.notes || ' (Updated: ' || NOW()::text || ')';

-- Comments
COMMENT ON TABLE subprocessors IS 'GDPR Article 28 compliant subprocessor registry';
COMMENT ON TABLE subprocessor_change_history IS 'Audit trail for subprocessor changes';
COMMENT ON TABLE subprocessor_notifications IS 'Customer notifications for subprocessor changes';
COMMENT ON TABLE customer_subprocessor_acknowledgments IS 'Customer acknowledgments of subprocessor notifications';
