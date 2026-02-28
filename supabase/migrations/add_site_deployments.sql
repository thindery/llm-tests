-- Migration: Add Vercel Deployment Support
-- Extends existing schema with Vercel-specific columns and tables
-- Created: 2026-03-01
-- Task: TASK-075

-- ============================================
-- Update existing sites table with Vercel columns
-- ============================================

-- Add Vercel-specific columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sites' AND column_name = 'project_id') THEN
        ALTER TABLE sites ADD COLUMN project_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sites' AND column_name = 'custom_domain') THEN
        ALTER TABLE sites ADD COLUMN custom_domain TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sites' AND column_name = 'status') THEN
        ALTER TABLE sites ADD COLUMN status TEXT DEFAULT 'inactive' CHECK (status IN ('inactive', 'building', 'ready', 'error'));
    END IF;
END
$$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_sites_project_id ON sites(project_id);
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);

-- ============================================
-- Update site_releases table with Vercel columns
-- ============================================

DO $$
BEGIN
    -- Add Vercel-specific columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'site_releases' AND column_name = 'deployment_id') THEN
        ALTER TABLE site_releases ADD COLUMN deployment_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'site_releases' AND column_name = 'git_branch') THEN
        ALTER TABLE site_releases ADD COLUMN git_branch TEXT DEFAULT 'main';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'site_releases' AND column_name = 'git_repo') THEN
        ALTER TABLE site_releases ADD COLUMN git_repo TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'site_releases' AND column_name = 'root_directory') THEN
        ALTER TABLE site_releases ADD COLUMN root_directory TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'site_releases' AND column_name = 'custom_domain_url') THEN
        ALTER TABLE site_releases ADD COLUMN custom_domain_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'site_releases' AND column_name = 'error_message') THEN
        ALTER TABLE site_releases ADD COLUMN error_message TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'site_releases' AND column_name = 'deployed_at') THEN
        ALTER TABLE site_releases ADD COLUMN deployed_at TIMESTAMPTZ;
    END IF;

    -- Rename existing columns for consistency
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'site_releases' AND column_name = 'commit_sha') THEN
        ALTER TABLE site_releases RENAME COLUMN commit_sha TO git_commit_sha;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'site_releases' AND column_name = 'deployment_status') THEN
        ALTER TABLE site_releases RENAME COLUMN deployment_status TO status;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'site_releases' AND column_name = 'deployment_url') THEN
        ALTER TABLE site_releases RENAME COLUMN deployment_url TO url;
    END IF;

    -- Add updated_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'site_releases' AND column_name = 'updated_at') THEN
        ALTER TABLE site_releases ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END
$$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_site_releases_deployment_id ON site_releases(deployment_id);
CREATE INDEX IF NOT EXISTS idx_site_releases_status ON site_releases(status);
CREATE INDEX IF NOT EXISTS idx_site_releases_branch ON site_releases(git_branch);

-- ============================================
-- site_deployment_logs table
-- Stores Vercel webhook events and deployment logs
-- ============================================
CREATE TABLE IF NOT EXISTS site_deployment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    release_id UUID REFERENCES site_releases(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('deployment.created', 'deployment.succeeded', 'deployment.failed', 'deployment.canceled', 'deployment.ready', 'deployment.error')),
    vercel_payload JSONB,
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deployment_logs_site_id ON site_deployment_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_deployment_logs_release_id ON site_deployment_logs(release_id);
CREATE INDEX IF NOT EXISTS idx_deployment_logs_event_type ON site_deployment_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_deployment_logs_created_at ON site_deployment_logs(created_at DESC);

-- ============================================
-- Functions
-- ============================================

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Add trigger for site_releases updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger 
                   WHERE tgname = 'update_site_releases_updated_at') THEN
        CREATE TRIGGER update_site_releases_updated_at
            BEFORE UPDATE ON site_releases
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Function to update site status based on latest release
CREATE OR REPLACE FUNCTION update_site_status_on_release()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE sites
    SET status = CASE NEW.status
        WHEN 'ready' THEN 'ready'
        WHEN 'error' THEN 'error'
        WHEN 'succeeded' THEN 'ready'
        WHEN 'failed' THEN 'error'
        WHEN 'building' THEN 'building'
        WHEN 'pending' THEN 'building'
        ELSE status
    END,
    updated_at = NOW()
    WHERE id = NEW.site_id;
    
    RETURN NEW;
END;
$$;

-- Trigger to update site status when release status changes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger 
                   WHERE tgname = 'update_site_status_trigger') THEN
        CREATE TRIGGER update_site_status_trigger
            AFTER INSERT OR UPDATE OF status ON site_releases
            FOR EACH ROW
            EXECUTE FUNCTION update_site_status_on_release();
    END IF;
END
$$;

-- ============================================
-- Row Level Security (RLS) for new table
-- ============================================

-- Enable RLS
ALTER TABLE site_deployment_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own deployment logs
CREATE POLICY "Users can view their own deployment logs"
ON site_deployment_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM sites 
        WHERE sites.id = site_deployment_logs.site_id 
        AND sites.user_id = auth.uid()
    )
);

-- Policy: Service role can manage deployment logs
CREATE POLICY "Service role can manage deployment logs"
ON site_deployment_logs FOR ALL
USING (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- Views
-- ============================================

-- Drop and recreate view for user dashboard: latest deployments
DROP VIEW IF EXISTS user_site_deployments;

CREATE OR REPLACE VIEW user_site_deployments AS
SELECT 
    s.id AS site_id,
    s.user_id,
    s.site_name,
    s.status AS site_status,
    s.custom_domain,
    sr.id AS release_id,
    sr.status AS deployment_status,
    sr.git_commit_sha,
    sr.git_branch,
    sr.url AS deployment_url,
    sr.custom_domain_url,
    sr.deployed_at,
    sr.created_at AS deployment_created_at,
    sr.version_tag,
    sr.is_release,
    CASE 
        WHEN sr.status IN ('ready', 'succeeded') THEN 'success'
        WHEN sr.status IN ('error', 'failed') THEN 'failed'
        WHEN sr.status IN ('building', 'pending') THEN 'in_progress'
        WHEN sr.status = 'canceled' THEN 'canceled'
        ELSE 'unknown'
    END AS deployment_state
FROM sites s
LEFT JOIN site_releases sr ON s.id = sr.site_id
LEFT JOIN (
    SELECT site_id, MAX(created_at) AS max_created
    FROM site_releases
    GROUP BY site_id
) latest ON s.id = latest.site_id AND sr.created_at = latest.max_created;

-- ============================================
-- Utility Functions
-- ============================================

-- Function to generate custom domain
CREATE OR REPLACE FUNCTION generate_site_domain(p_site_name TEXT, p_user_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN LOWER(p_site_name) || '-' || p_user_id || '.agentpaige.com';
END;
$$;

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON COLUMN sites.project_id IS 'Vercel project ID for the site';
COMMENT ON COLUMN sites.custom_domain IS 'Custom domain for the site (e.g., portfolio-user123.agentpaige.com)';
COMMENT ON COLUMN sites.status IS 'Current deployment status: inactive, building, ready, error';
COMMENT ON COLUMN site_releases.deployment_id IS 'Vercel deployment ID';
COMMENT ON COLUMN site_releases.git_commit_sha IS 'Git commit SHA that was deployed';
COMMENT ON COLUMN site_releases.git_branch IS 'Git branch that was deployed';
COMMENT ON COLUMN site_releases.root_directory IS 'Subdirectory within repo containing site files';
COMMENT ON COLUMN site_deployment_logs.vercel_payload IS 'Full Vercel webhook event payload';
