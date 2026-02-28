-- Migration: Add Rate Limiting Schema
-- Creates tables for tenant settings and usage tracking

-- ============================================
-- tenant_settings table
-- Stores per-tenant configuration and tier information
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL UNIQUE,
    tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
    custom_limits JSONB DEFAULT NULL,
    webhook_url TEXT,
    alert_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_id ON tenant_settings(tenant_id);

-- ============================================
-- llm_usage table
-- Tracks daily usage per tenant (cost tracking + rate limiting)
-- ============================================
CREATE TABLE IF NOT EXISTS llm_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    requests_used INTEGER NOT NULL DEFAULT 0,
    requests_limit INTEGER NOT NULL DEFAULT 50,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    tokens_limit INTEGER NOT NULL DEFAULT 100000,
    cost_usd DECIMAL(10, 6) DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one record per tenant per day
    UNIQUE(tenant_id, date)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_llm_usage_tenant_id ON llm_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_date ON llm_usage(date);
CREATE INDEX IF NOT EXISTS idx_llm_usage_tenant_date ON llm_usage(tenant_id, date);

-- ============================================
-- rate_limit_alerts table
-- Stores webhook alerts sent when tenants hit thresholds
-- ============================================
CREATE TABLE IF NOT EXISTS rate_limit_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('warning', 'critical')),
    tier TEXT NOT NULL,
    percentage_used DECIMAL(5, 2) NOT NULL,
    requests_used INTEGER,
    requests_limit INTEGER,
    tokens_used INTEGER,
    tokens_limit INTEGER,
    webhook_sent BOOLEAN DEFAULT FALSE,
    webhook_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_alerts_tenant_id ON rate_limit_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_alerts_created_at ON rate_limit_alerts(created_at);

-- ============================================
-- rate_limit_audit_log table
-- Audit trail for debugging and analytics
-- ============================================
CREATE TABLE IF NOT EXISTS rate_limit_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    user_session_id TEXT,
    action TEXT NOT NULL CHECK (action IN ('allowed', 'denied', 'alert_sent')),
    limit_type TEXT NOT NULL CHECK (limit_type IN ('global', 'tenant-daily', 'tenant-tokens', 'user-burst')),
    current_value INTEGER,
    limit_value INTEGER,
    percentage_used DECIMAL(5, 2),
    reason TEXT,
    metadata JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_audit_tenant_id ON rate_limit_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_audit_created_at ON rate_limit_audit_log(created_at);

-- ============================================
-- Functions
-- ============================================

-- Function to upsert usage (handles concurrent updates safely)
CREATE OR REPLACE FUNCTION upsert_llm_usage(
    p_tenant_id TEXT,
    p_date DATE,
    p_requests_delta INTEGER DEFAULT 1,
    p_tokens_delta INTEGER DEFAULT 0,
    p_cost_delta DECIMAL(10, 6) DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO llm_usage (
        tenant_id,
        date,
        requests_used,
        tokens_used,
        cost_usd,
        last_updated
    ) VALUES (
        p_tenant_id,
        p_date,
        p_requests_delta,
        p_tokens_delta,
        p_cost_delta,
        NOW()
    )
    ON CONFLICT (tenant_id, date)
    DO UPDATE SET
        requests_used = llm_usage.requests_used + p_requests_delta,
        tokens_used = llm_usage.tokens_used + p_tokens_delta,
        cost_usd = llm_usage.cost_usd + p_cost_delta,
        last_updated = NOW();
END;
$$;

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

-- Trigger for tenant_settings
CREATE TRIGGER update_tenant_settings_updated_at
    BEFORE UPDATE ON tenant_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can read their own settings
CREATE POLICY tenant_settings_select_policy ON tenant_settings
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Policy: Only admins can modify tenant settings
CREATE POLICY tenant_settings_modify_policy ON tenant_settings
    FOR ALL
    USING (current_setting('app.is_admin', true) = 'true');

-- Policy: Tenants can read their own usage
CREATE POLICY llm_usage_select_policy ON llm_usage
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Policy: Service role can insert/update usage
CREATE POLICY llm_usage_service_policy ON llm_usage
    FOR ALL
    USING (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- Views
-- ============================================

-- View for admin dashboard: usage summary
CREATE OR REPLACE VIEW tenant_usage_summary AS
SELECT 
    ts.tenant_id,
    ts.tier,
    lu.date,
    lu.requests_used,
    lu.requests_limit,
    lu.tokens_used,
    lu.tokens_limit,
    ROUND((lu.requests_used::numeric / NULLIF(lu.requests_limit, 0)) * 100, 2) as requests_percentage,
    ROUND((lu.tokens_used::numeric / NULLIF(lu.tokens_limit, 0)) * 100, 2) as tokens_percentage,
    lu.cost_usd,
    lu.last_updated,
    CASE 
        WHEN (lu.requests_used::numeric / NULLIF(lu.requests_limit, 0)) >= 0.95 THEN 'critical'
        WHEN (lu.requests_used::numeric / NULLIF(lu.requests_limit, 0)) >= 0.8 THEN 'warning'
        ELSE 'ok'
    END as request_status,
    CASE 
        WHEN (lu.tokens_used::numeric / NULLIF(lu.tokens_limit, 0)) >= 0.95 THEN 'critical'
        WHEN (lu.tokens_used::numeric / NULLIF(lu.tokens_limit, 0)) >= 0.8 THEN 'warning'
        ELSE 'ok'
    END as token_status
FROM tenant_settings ts
LEFT JOIN llm_usage lu ON ts.tenant_id = lu.tenant_id AND lu.date = CURRENT_DATE;

-- ============================================
-- Seed Data (Default tier settings)
-- ============================================

-- Insert or update default tier settings for reference
-- These values serve as documentation and can be used by the application

-- Function to get tier limits as JSON
CREATE OR REPLACE FUNCTION get_tier_limits(p_tier TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN CASE p_tier
        WHEN 'free' THEN '{"daily_requests": 50, "daily_tokens": 100000, "burst_per_minute": 10, "concurrent": 2}'::JSONB
        WHEN 'pro' THEN '{"daily_requests": 500, "daily_tokens": 1000000, "burst_per_minute": 30, "concurrent": 5}'::JSONB
        WHEN 'enterprise' THEN '{"daily_requests": 5000, "daily_tokens": 10000000, "burst_per_minute": 100, "concurrent": 20}'::JSONB
        ELSE '{"daily_requests": 50, "daily_tokens": 100000, "burst_per_minute": 10, "concurrent": 2}'::JSONB
    END;
END;
$$;

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON TABLE tenant_settings IS 'Stores subscription tier and custom limits for each tenant';
COMMENT ON TABLE llm_usage IS 'Daily usage tracking for cost monitoring and rate limiting';
COMMENT ON TABLE rate_limit_alerts IS 'Record of quota threshold alerts sent to webhooks';
COMMENT ON TABLE rate_limit_audit_log IS 'Audit trail for rate limiting decisions';

COMMENT ON COLUMN tenant_settings.tier IS 'Subscription tier: free, pro, or enterprise';
COMMENT ON COLUMN tenant_settings.custom_limits IS 'JSON object with custom limit overrides';
COMMENT ON COLUMN llm_usage.requests_used IS 'Number of requests made today';
COMMENT ON COLUMN llm_usage.tokens_used IS 'Total tokens consumed today';
