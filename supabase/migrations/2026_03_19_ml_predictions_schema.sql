-- Migration: ML Predictions Pipeline - Phase 1 Foundation
-- Created: 2026-03-19
-- Task: REMY-189

-- ============================================
-- Predictions Table
-- Stores ML model predictions for ticket categorization
-- ============================================
CREATE TABLE IF NOT EXISTS predictions (
    prediction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    model_version VARCHAR(50) NOT NULL,
    predicted_category VARCHAR(100) NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    features_used JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    was_correct BOOLEAN,
    
    -- Ensure confidence is stored with proper precision
    CONSTRAINT chk_confidence_range CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0)
);

-- Add comments for documentation
COMMENT ON TABLE predictions IS 'ML model predictions for ticket categorization';
COMMENT ON COLUMN predictions.prediction_id IS 'Unique identifier for the prediction';
COMMENT ON COLUMN predictions.ticket_id IS 'Foreign key to the tickets table';
COMMENT ON COLUMN predictions.model_version IS 'Version of the ML model that made the prediction (e.g., "v1.2.3")';
COMMENT ON COLUMN predictions.predicted_category IS 'The category predicted by the model';
COMMENT ON COLUMN predictions.confidence_score IS 'Confidence score between 0.0 and 1.0';
COMMENT ON COLUMN predictions.features_used IS 'JSONB containing the features used for this prediction';
COMMENT ON COLUMN predictions.created_at IS 'Timestamp when the prediction was made';
COMMENT ON COLUMN predictions.resolved_at IS 'Timestamp when the actual outcome was known';
COMMENT ON COLUMN predictions.was_correct IS 'Whether the prediction matched the actual outcome (NULL until resolved)';

-- ============================================
-- Shadow Mode Table
-- Tracks predictions in shadow mode for comparison with actual outcomes
-- ============================================
CREATE TABLE IF NOT EXISTS shadow_predictions (
    shadow_prediction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID NOT NULL REFERENCES predictions(prediction_id) ON DELETE CASCADE,
    actual_outcome VARCHAR(100),
    comparison_metrics JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure each prediction only has one shadow entry
    CONSTRAINT uq_shadow_prediction UNIQUE (prediction_id)
);

-- Add comments for documentation
COMMENT ON TABLE shadow_predictions IS 'Shadow mode tracking for ML predictions - compares predictions against actual outcomes';
COMMENT ON COLUMN shadow_predictions.shadow_prediction_id IS 'Unique identifier for the shadow prediction record';
COMMENT ON COLUMN shadow_predictions.prediction_id IS 'Foreign key to predictions table';
COMMENT ON COLUMN shadow_predictions.actual_outcome IS 'The actual category that was assigned to the ticket';
COMMENT ON COLUMN shadow_predictions.comparison_metrics IS 'JSONB containing detailed comparison metrics (accuracy, latency, etc.)';
COMMENT ON COLUMN shadow_predictions.created_at IS 'Timestamp when the shadow record was created';
COMMENT ON COLUMN shadow_predictions.updated_at IS 'Timestamp when the shadow record was last updated';

-- ============================================
-- Indexes for Efficient Querying
-- ============================================

-- Index for ticket_id lookups (common query pattern)
CREATE INDEX IF NOT EXISTS idx_predictions_ticket_id 
ON predictions(ticket_id);

-- Index for confidence score range queries
CREATE INDEX IF NOT EXISTS idx_predictions_confidence_score 
ON predictions(confidence_score);

-- Composite index for confidence-based filtering with time sorting
CREATE INDEX IF NOT EXISTS idx_predictions_confidence_created 
ON predictions(confidence_score, created_at DESC);

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_predictions_created_at 
ON predictions(created_at DESC);

-- Index for model version queries (useful for A/B testing)
CREATE INDEX IF NOT EXISTS idx_predictions_model_version 
ON predictions(model_version);

-- Index for unresolved predictions (active shadow mode)
CREATE INDEX IF NOT EXISTS idx_predictions_unresolved 
ON predictions(prediction_id) 
WHERE was_correct IS NULL;

-- Index for outcome analysis queries
CREATE INDEX IF NOT EXISTS idx_predictions_was_correct 
ON predictions(was_correct) 
WHERE was_correct IS NOT NULL;

-- Shadow predictions indexes
CREATE INDEX IF NOT EXISTS idx_shadow_predictions_prediction_id 
ON shadow_predictions(prediction_id);

CREATE INDEX IF NOT EXISTS idx_shadow_predictions_actual_outcome 
ON shadow_predictions(actual_outcome);

CREATE INDEX IF NOT EXISTS idx_shadow_predictions_created_at 
ON shadow_predictions(created_at DESC);

-- ============================================
-- Triggers for Automatic Timestamp Updates
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Trigger for shadow_predictions updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger 
                   WHERE tgname = 'update_shadow_predictions_updated_at') THEN
        CREATE TRIGGER update_shadow_predictions_updated_at
            BEFORE UPDATE ON shadow_predictions
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on predictions
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on shadow_predictions
ALTER TABLE shadow_predictions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view predictions for their tickets
CREATE POLICY "Users can view predictions for their tickets"
ON predictions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM tickets 
        WHERE tickets.id = predictions.ticket_id 
        AND tickets.user_id = auth.uid()
    )
);

-- Policy: Service role can manage all predictions
CREATE POLICY "Service role can manage predictions"
ON predictions FOR ALL
USING (current_setting('app.is_service_role', true) = 'true');

-- Policy: Users can view shadow predictions for their tickets
CREATE POLICY "Users can view shadow predictions for their tickets"
ON shadow_predictions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM predictions 
        JOIN tickets ON predictions.ticket_id = tickets.id 
        WHERE predictions.prediction_id = shadow_predictions.prediction_id 
        AND tickets.user_id = auth.uid()
    )
);

-- Policy: Service role can manage all shadow predictions
CREATE POLICY "Service role can manage shadow predictions"
ON shadow_predictions FOR ALL
USING (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- Views for Common Queries
-- ============================================

-- View: Prediction accuracy by model version
CREATE OR REPLACE VIEW prediction_accuracy_by_model AS
SELECT 
    model_version,
    COUNT(*) as total_predictions,
    COUNT(was_correct) as resolved_predictions,
    SUM(CASE WHEN was_correct = true THEN 1 ELSE 0 END) as correct_predictions,
    ROUND(
        100.0 * SUM(CASE WHEN was_correct = true THEN 1 ELSE 0 END) / NULLIF(COUNT(was_correct), 0), 
        2
    ) as accuracy_percentage,
    AVG(confidence_score) as avg_confidence,
    MIN(created_at) as first_prediction,
    MAX(created_at) as last_prediction
FROM predictions
GROUP BY model_version;

-- View: Shadow mode predictions awaiting resolution
CREATE OR REPLACE VIEW shadow_predictions_pending AS
SELECT 
    p.prediction_id,
    p.ticket_id,
    p.model_version,
    p.predicted_category,
    p.confidence_score,
    p.features_used,
    p.created_at,
    s.shadow_prediction_id,
    s.comparison_metrics
FROM predictions p
LEFT JOIN shadow_predictions s ON p.prediction_id = s.prediction_id
WHERE p.was_correct IS NULL;

-- ============================================
-- Helper Functions
-- ============================================

-- Function to resolve a prediction with actual outcome
CREATE OR REPLACE FUNCTION resolve_prediction(
    p_prediction_id UUID,
    p_actual_outcome VARCHAR(100)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_predicted_category VARCHAR(100);
    v_was_correct BOOLEAN;
BEGIN
    -- Get the predicted category
    SELECT predicted_category INTO v_predicted_category
    FROM predictions
    WHERE prediction_id = p_prediction_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Prediction not found: %', p_prediction_id;
    END IF;
    
    -- Determine if prediction was correct
    v_was_correct := (v_predicted_category = p_actual_outcome);
    
    -- Update prediction
    UPDATE predictions
    SET 
        was_correct = v_was_correct,
        resolved_at = NOW()
    WHERE prediction_id = p_prediction_id;
    
    -- Update or create shadow prediction record
    INSERT INTO shadow_predictions (prediction_id, actual_outcome, comparison_metrics)
    VALUES (
        p_prediction_id, 
        p_actual_outcome,
        jsonb_build_object(
            'predicted', v_predicted_category,
            'actual', p_actual_outcome,
            'match', v_was_correct,
            'resolved_at', NOW()
        )
    )
    ON CONFLICT (prediction_id) 
    DO UPDATE SET
        actual_outcome = EXCLUDED.actual_outcome,
        comparison_metrics = EXCLUDED.comparison_metrics,
        updated_at = NOW();
    
    RETURN v_was_correct;
END;
$$;