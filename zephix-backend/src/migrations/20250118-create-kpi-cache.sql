-- Create KPI cache table for performance optimization
CREATE TABLE IF NOT EXISTS kpi_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'task', 'project', 'workspace', 'program', 'organization'
    entity_id UUID NOT NULL,
    kpi_data JSONB NOT NULL,
    calculated_at TIMESTAMP DEFAULT NOW(),
    hierarchy_path TEXT,
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '1 hour'),
    
    UNIQUE(entity_type, entity_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_kpi_cache_entity_type ON kpi_cache(entity_type);
CREATE INDEX IF NOT EXISTS idx_kpi_cache_entity_id ON kpi_cache(entity_id);
CREATE INDEX IF NOT EXISTS idx_kpi_cache_calculated_at ON kpi_cache(calculated_at);
CREATE INDEX IF NOT EXISTS idx_kpi_cache_expires_at ON kpi_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_kpi_cache_hierarchy_path ON kpi_cache(hierarchy_path);

-- Create function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_kpi_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM kpi_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create index for efficient cleanup
CREATE INDEX IF NOT EXISTS idx_kpi_cache_expires_at_cleanup ON kpi_cache(expires_at) WHERE expires_at < NOW();













