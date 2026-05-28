-- Migration: Add GDPR Legal Basis and Processing Activities tables
-- Created: 2026-03-29
-- Task: REMY-261

-- ============================================
-- Legal Basis Table
-- Stores GDPR Article 6 legal bases for data processing
-- ============================================
CREATE TABLE IF NOT EXISTS legal_basis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    basis_type VARCHAR(50) NOT NULL CHECK (basis_type IN 
        ('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interest')),
    description TEXT,
    legitimate_interest_reason TEXT,  -- Required when basis_type = 'legitimate_interest'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ  -- Soft delete
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_legal_basis_project 
ON legal_basis(project_id, deleted_at) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_legal_basis_type 
ON legal_basis(basis_type);

CREATE INDEX IF NOT EXISTS idx_legal_basis_active 
ON legal_basis(project_id, is_active) 
WHERE deleted_at IS NULL AND is_active = TRUE;

-- Add comments for documentation
COMMENT ON TABLE legal_basis IS 'GDPR Article 6 legal bases for data processing activities';
COMMENT ON COLUMN legal_basis.basis_type IS 'One of: consent, contract, legal_obligation, vital_interests, public_task, legitimate_interest';
COMMENT ON COLUMN legal_basis.legitimate_interest_reason IS 'Required documentation for legitimate interest (Art. 6.1f) basis';

-- Enable RLS on legal_basis
ALTER TABLE legal_basis ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only view legal basis for their own projects
CREATE POLICY "Users can view their own legal basis"
ON legal_basis FOR SELECT
USING (
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
);

-- Create policy: Users can insert legal basis for their own projects
CREATE POLICY "Users can insert their own legal basis"
ON legal_basis FOR INSERT
WITH CHECK (
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
);

-- Create policy: Users can update legal basis for their own projects
CREATE POLICY "Users can update their own legal basis"
ON legal_basis FOR UPDATE
USING (
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
);

-- ============================================
-- Processing Activities Table
-- Stores GDPR Article 30 processing activity records
-- ============================================
CREATE TABLE IF NOT EXISTS processing_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,
    legal_basis_id UUID NOT NULL REFERENCES legal_basis(id) ON DELETE RESTRICT,
    data_categories TEXT[] DEFAULT '{}',  -- Array of data category names
    data_retention_days INTEGER,
    recipients TEXT,
    safeguards TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ  -- Soft delete
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_processing_activities_project 
ON processing_activities(project_id, deleted_at) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_processing_activities_legal_basis 
ON processing_activities(legal_basis_id) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_processing_activities_active 
ON processing_activities(project_id, is_active) 
WHERE deleted_at IS NULL AND is_active = TRUE;

-- Add comments for documentation
COMMENT ON TABLE processing_activities IS 'GDPR Article 30 records of processing activities (ROPA)';
COMMENT ON COLUMN processing_activities.data_categories IS 'Array of data category names processed';
COMMENT ON COLUMN processing_activities.data_retention_days IS 'Data retention period in days';

-- Enable RLS on processing_activities
ALTER TABLE processing_activities ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only view processing activities for their own projects
CREATE POLICY "Users can view their own processing activities"
ON processing_activities FOR SELECT
USING (
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
);

-- Create policy: Users can insert processing activities for their own projects
CREATE POLICY "Users can insert their own processing activities"
ON processing_activities FOR INSERT
WITH CHECK (
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
);

-- Create policy: Users can update processing activities for their own projects
CREATE POLICY "Users can update their own processing activities"
ON processing_activities FOR UPDATE
USING (
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
);

-- ============================================
-- Events Table Enhancement
-- Add legal_basis_id to track events with legal basis
-- ============================================
-- Check if we need to add legal_basis_id column to events table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'events' 
                  AND column_name = 'legal_basis_id') THEN
        ALTER TABLE events ADD COLUMN legal_basis_id UUID REFERENCES legal_basis(id);
    END IF;
END $$;

-- Create index on legal_basis_id for events
CREATE INDEX IF NOT EXISTS idx_events_legal_basis 
ON events(legal_basis_id) 
WHERE legal_basis_id IS NOT NULL;

-- ============================================
-- Sessions Table Enhancement
-- Add legal_basis_id to track sessions with legal basis
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'sessions' 
                  AND column_name = 'legal_basis_id') THEN
        ALTER TABLE sessions ADD COLUMN legal_basis_id UUID REFERENCES legal_basis(id);
    END IF;
END $$;

-- Create index on legal_basis_id for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_legal_basis 
ON sessions(legal_basis_id) 
WHERE legal_basis_id IS NOT NULL;

-- ============================================
-- Default Legal Basis for Projects
-- Insert default legitimate interest for analytics
-- ============================================
CREATE OR REPLACE FUNCTION create_default_legal_basis()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default legitimate interest legal basis for new projects
    INSERT INTO legal_basis (
        project_id,
        name,
        basis_type,
        description,
        legitimate_interest_reason,
        is_active
    ) VALUES (
        NEW.id,
        'Analytics Legitimate Interest',
        'legitimate_interest',
        'Processing user interaction data for analytics, debugging, and UX improvement',
        'Purpose Test: We have a legitimate interest in understanding how users interact with our services to improve functionality and user experience.

Necessity Test: Session replay is necessary because:
- Error reports alone do not provide context about what led to an error
- Traditional analytics (heatmaps, clickmaps) do not show complete user flows
- Without session data, user-reported issues cannot be reproduced and fixed

Balancing Test:
- Impact: Low - session data is pseudonymous
- User Expectations: Users expect services to work properly
- Rights: Users can object to processing, request access, or request deletion
- Mitigation: Data is encrypted, access restricted, retention limited to 90 days',
        TRUE
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to add default legal basis when project is created
-- Note: Only create if projects table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        DROP TRIGGER IF EXISTS trigger_create_default_legal_basis ON projects;
        CREATE TRIGGER trigger_create_default_legal_basis
            AFTER INSERT ON projects
            FOR EACH ROW
            EXECUTE FUNCTION create_default_legal_basis();
    END IF;
END $$;
