-- Migration: Add site_releases table and repo columns to sites
-- Created: 2026-03-01
-- Task: TASK-076

-- Add repo tracking columns to sites table
ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS repo_name TEXT,
ADD COLUMN IF NOT EXISTS subdirectory TEXT;

-- Create site_releases table for per-site versioning
CREATE TABLE IF NOT EXISTS site_releases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  commit_sha VARCHAR(40) NOT NULL,
  commit_message TEXT,
  version_tag VARCHAR(50),      -- e.g., "portfolio/v1.0.0"
  is_release BOOLEAN DEFAULT FALSE,
  created_by VARCHAR(255),      -- e.g., "kimi", "user", "system"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  file_hash VARCHAR(64),
  changed_files JSONB,          -- e.g., ["sites/portfolio/index.html"]
  deployment_status VARCHAR(50),
  deployed_at TIMESTAMPTZ,
  deployment_url TEXT
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_site_releases_site_time 
ON site_releases(site_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_releases_sha 
ON site_releases(commit_sha);

-- Enable RLS on site_releases
ALTER TABLE site_releases ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only view releases for their own sites
CREATE POLICY "Users can view their own site releases"
ON site_releases FOR SELECT
USING (
  site_id IN (
    SELECT id FROM sites WHERE user_id = auth.uid()
  )
);

-- Create policy: Users can insert releases for their own sites
CREATE POLICY "Users can insert releases for their own sites"
ON site_releases FOR INSERT
WITH CHECK (
  site_id IN (
    SELECT id FROM sites WHERE user_id = auth.uid()
  )
);

-- Create policy: Users can update releases for their own sites
CREATE POLICY "Users can update their own site releases"
ON site_releases FOR UPDATE
USING (
  site_id IN (
    SELECT id FROM sites WHERE user_id = auth.uid()
  )
);

-- Create policy: Users can delete releases for their own sites
CREATE POLICY "Users can delete their own site releases"
ON site_releases FOR DELETE
USING (
  site_id IN (
    SELECT id FROM sites WHERE user_id = auth.uid()
  )
);
