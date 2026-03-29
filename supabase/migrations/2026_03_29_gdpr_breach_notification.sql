-- GDPR Breach Notification Schema
-- Ticket: REMY-260
-- 
-- Implements:
-- - Database table security_incidents
-- - Breach response workflow with severity classification
-- - Incident events and notifications tracking
-- - GDPR compliance views and functions

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main security incidents table
CREATE TABLE security_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Detection & Reporting
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reported_at TIMESTAMPTZ,
  
  -- Classification
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  description_internal TEXT,
  
  -- Impact Assessment
  affected_users_count INTEGER NOT NULL DEFAULT 0,
  data_categories TEXT[] DEFAULT '{}',
  data_special_categories TEXT[] DEFAULT '{}', -- GDPR Article 9 special categories
  likelihood_of_harm TEXT CHECK (likelihood_of_harm IN ('remote', 'possible', 'probable', 'certain')),
  severity_of_impact TEXT CHECK (severity_of_impact IN ('minimal', 'limited', 'significant', 'severe')),
  
  -- Breach Details
  breach_type TEXT CHECK (breach_type IN (
    'unauthorized_access',
    'unauthorized_disclosure',
    'data_loss',
    'data_corruption',
    'ransomware',
    'insider_threat',
    'third_party_breach',
    'physical_security',
    'misconfiguration',
    'other'
  )),
  discovery_source TEXT CHECK (discovery_source IN (
    'automated_monitoring',
    'user_report',
    'internal_audit',
    'third_party_notification',
    'penetration_test',
    'vulnerability_scan',
    'customer_complaint',
    'regulatory_notification',
    'other'
  )),
  
  -- GDPR Notification Timeline (Article 33 & 34)
  -- Supervisory Authority notification
  dpia_notified_at TIMESTAMPTZ, -- Data Protection Impact Assessment team notified
  dpa_notified_at TIMESTAMPTZ, -- Data Protection Authority
  dpa_reference_number TEXT,
  
  -- Individual notification (Article 34)
  individuals_notified_at TIMESTAMPTZ,
  notification_method TEXT, -- email, post, website, media, direct_contact
  
  -- Response & Remediation
  status TEXT DEFAULT 'detected' CHECK (status IN (
    'detected',
    'under_investigation',
    'contained',
    'remediated',
    'closed',
    'false_positive'
  )),
  containment_measures TEXT[] DEFAULT '{}',
  remediation_steps TEXT[] DEFAULT '{}',
  preventative_measures TEXT[] DEFAULT '{}',
  root_cause TEXT,
  lessons_learned TEXT,
  
  -- Assignment & Tracking
  detected_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  closed_by UUID REFERENCES auth.users(id),
  project_id UUID, -- Optional: if incident is specific to a project
  related_incident_id UUID REFERENCES security_incidents(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  priority INTEGER DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),
  
  -- Indexes will be added below
  CONSTRAINT affected_users_non_negative CHECK (affected_users_count >= 0)
);

-- Incident events/timeline table
CREATE TABLE security_incident_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES security_incidents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications log table
CREATE TABLE security_incident_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES security_incidents(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'dpa_notification',
    'individual_notification',
    'customer_notification',
    'internal_alert',
    'management_escalation'
  )),
  recipient_count INTEGER DEFAULT 0,
  recipient_type TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_by UUID REFERENCES auth.users(id),
  method TEXT,
  template_used TEXT,
  subject_line TEXT,
  content_hash TEXT,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  gdpr_article_reference TEXT, -- e.g., 'Article 33', 'Article 34'
  timeline_met BOOLEAN DEFAULT TRUE, -- Whether notification was within GDPR timeline
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automated monitoring alerts table
CREATE TABLE security_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN (
    'bulk_export_detected',
    'rate_limit_exceeded',
    'failed_login_spike',
    'geo_anomaly',
    'after_hours_access',
    'privileged_account_anomaly',
    'unusual_data_access',
    'session_duration_anomaly',
    'permission_escalation'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'high', 'critical')),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  project_id UUID,
  description TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'false_positive', 'confirmed_breach')),
  assigned_to UUID REFERENCES auth.users(id),
  incident_id UUID REFERENCES security_incidents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_security_incidents_severity ON security_incidents(severity);
CREATE INDEX idx_security_incidents_status ON security_incidents(status);
CREATE INDEX idx_security_incidents_detected_at ON security_incidents(detected_at DESC);
CREATE INDEX idx_security_incidents_created_at ON security_incidents(created_at DESC);
CREATE INDEX idx_security_incidents_assigned_to ON security_incidents(assigned_to);
CREATE INDEX idx_security_incidents_priority ON security_incidents(priority DESC);

CREATE INDEX idx_security_incident_events_incident_id ON security_incident_events(incident_id);
CREATE INDEX idx_security_incident_events_created_at ON security_incident_events(created_at DESC);

CREATE INDEX idx_security_incident_notifications_incident_id ON security_incident_notifications(incident_id);
CREATE INDEX idx_security_incident_notifications_type ON security_incident_notifications(notification_type);

CREATE INDEX idx_security_alerts_type ON security_alerts(type);
CREATE INDEX INDEX idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX idx_security_alerts_status ON security_alerts(status);
CREATE INDEX idx_security_alerts_detected_at ON security_alerts(detected_at DESC);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_security_incidents_updated_at BEFORE UPDATE ON security_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_alerts_updated_at BEFORE UPDATE ON security_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View: Open incidents with GDPR compliance status
CREATE VIEW security_incidents_open AS
SELECT 
  i.*,
  -- Calculate GDPR deadlines
  EXTRACT(EPOCH FROM (NOW() - i.detected_at)) / 3600 AS hours_since_detection,
  CASE 
    WHEN i.dpa_notified_at IS NOT NULL THEN FALSE
    WHEN i.severity IN ('medium', 'high', 'critical') 
         AND EXTRACT(EPOCH FROM (NOW() - i.detected_at)) / 3600 > 72 THEN TRUE
    ELSE FALSE
  END AS is_dpa_overdue,
  CASE 
    WHEN i.individuals_notified_at IS NOT NULL THEN FALSE
    WHEN i.severity IN ('high', 'critical') 
         AND EXTRACT(EPOCH FROM (NOW() - i.detected_at)) / 3600 > 72 THEN TRUE
    ELSE FALSE
  END AS is_individual_notification_overdue,
  -- Notification requirements
  CASE 
    WHEN i.severity IN ('medium', 'high', 'critical') THEN TRUE
    WHEN i.affected_users_count >= 100 THEN TRUE
    WHEN array_length(i.data_special_categories, 1) > 0 THEN TRUE
    ELSE FALSE
  END AS requires_dpa_notification,
  CASE 
    WHEN i.severity IN ('high', 'critical') THEN TRUE
    WHEN (i.affected_users_count >= 1000 AND i.likelihood_of_harm IN ('possible', 'probable', 'certain')) THEN TRUE
    WHEN i.severity_of_impact IN ('significant', 'severe') THEN TRUE
    ELSE FALSE
  END AS requires_individual_notification
FROM security_incidents i
WHERE i.status NOT IN ('closed', 'false_positive');

-- View: Incident statistics
CREATE VIEW security_incident_statistics AS
SELECT
  COUNT(*) AS total_incidents,
  COUNT(*) FILTER (WHERE status NOT IN ('closed', 'false_positive')) AS open_incidents,
  COUNT(*) FILTER (WHERE severity = 'critical') AS critical_count,
  COUNT(*) FILTER (WHERE severity = 'high') AS high_count,
  COUNT(*) FILTER (WHERE severity = 'medium') AS medium_count,
  COUNT(*) FILTER (WHERE severity = 'low') AS low_count,
  COUNT(*) FILTER (WHERE dpa_notified_at IS NOT NULL) AS dpa_notifications_sent,
  COUNT(*) FILTER (WHERE individuals_notified_at IS NOT NULL) AS individual_notifications_sent,
  AVG(EXTRACT(EPOCH FROM (closed_at - detected_at)) / 3600) 
    FILTER (WHERE closed_at IS NOT NULL) AS avg_resolution_hours
FROM security_incidents;

-- View: GDPR compliance dashboard
CREATE VIEW security_incident_gdpr_compliance AS
SELECT
  COUNT(*) FILTER (WHERE status NOT IN ('closed', 'false_positive') 
                   AND severity IN ('medium', 'high', 'critical')
                   AND dpa_notified_at IS NULL) AS awaiting_dpa_notification,
  COUNT(*) FILTER (WHERE status NOT IN ('closed', 'false_positive')
                   AND severity IN ('high', 'critical')
                   AND individuals_notified_at IS NULL) AS awaiting_individual_notification,
  COUNT(*) FILTER (WHERE is_dpa_overdue = TRUE) AS overdue_dpa_notifications,
  COUNT(*) FILTER (WHERE is_individual_notification_overdue = TRUE) AS overdue_individual_notifications,
  -- Compliance rates
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE dpa_notified_at IS NOT NULL OR severity NOT IN ('medium', 'high', 'critical')) 
    / NULLIF(COUNT(*) FILTER (WHERE severity IN ('medium', 'high', 'critical')), 0),
    2
  ) AS dpa_compliance_rate,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE individuals_notified_at IS NOT NULL OR severity NOT IN ('high', 'critical')) 
    / NULLIF(COUNT(*) FILTER (WHERE severity IN ('high', 'critical')), 0),
    2
  ) AS individual_notification_rate
FROM security_incidents_open;

-- Row Level Security (RLS) policies
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incident_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incident_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Security team can read all incidents
CREATE POLICY security_incidents_security_team_read ON security_incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('security_admin', 'dpo', 'admin')
    )
  );

-- Policy: Users can read incidents assigned to them or they detected
CREATE POLICY security_incidents_user_read ON security_incidents
  FOR SELECT USING (
    detected_by = auth.uid() OR assigned_to = auth.uid()
  );

-- Policy: Security team can insert incidents
CREATE POLICY security_incidents_security_team_insert ON security_incidents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('security_admin', 'dpo', 'admin', 'security_analyst')
    )
  );

-- Policy: Security team can update incidents
CREATE POLICY security_incidents_security_team_update ON security_incidents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('security_admin', 'dpo', 'admin', 'security_analyst')
    )
  );

-- Policy: Security team can read all events
CREATE POLICY security_incident_events_security_team_read ON security_incident_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('security_admin', 'dpo', 'admin')
    )
  );

-- Policy: Security team can insert events
CREATE POLICY security_incident_events_security_team_insert ON security_incident_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('security_admin', 'dpo', 'admin', 'security_analyst')
    )
  );

-- Function: Create incident event on status change
CREATE OR REPLACE FUNCTION log_security_incident_event()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO security_incident_events (incident_id, event_type, event_data, description)
    VALUES (
      NEW.id,
      'status_changed',
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status),
      'Status changed from ' || OLD.status || ' to ' || NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER security_incident_status_change
AFTER UPDATE ON security_incidents
FOR EACH ROW
EXECUTE FUNCTION log_security_incident_event();

-- Function: Get failed login stats for monitoring
CREATE OR REPLACE FUNCTION get_failed_login_stats(time_window_minutes INTEGER)
RETURNS TABLE(user_id UUID, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    la.user_id,
    COUNT(*)::BIGINT
  FROM login_attempts la
  WHERE la.success = FALSE
    AND la.created_at >= NOW() - (time_window_minutes || ' minutes')::INTERVAL
  GROUP BY la.user_id
  HAVING COUNT(*) >= 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE security_incidents IS 'Stores security incidents and personal data breaches for GDPR compliance';
COMMENT ON TABLE security_incident_events IS 'Audit trail of events for each security incident';
COMMENT ON TABLE security_incident_notifications IS 'Log of all notifications sent regarding incidents (DPA, individuals, customers)';
COMMENT ON TABLE security_alerts IS 'Automated security alerts from monitoring systems';
COMMENT ON VIEW security_incidents_open IS 'View of open incidents with GDPR deadline tracking';
COMMENT ON VIEW security_incident_statistics IS 'Summary statistics for security incidents';
COMMENT ON VIEW security_incident_gdpr_compliance IS 'GDPR compliance metrics for breach notifications';
