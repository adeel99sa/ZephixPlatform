-- Create task dependencies table
CREATE TABLE IF NOT EXISTS simple_task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    predecessor_id UUID NOT NULL,
    successor_id UUID NOT NULL,
    type VARCHAR(20) DEFAULT 'finish-to-start',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_predecessor_task 
        FOREIGN KEY (predecessor_id) 
        REFERENCES tasks(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_successor_task 
        FOREIGN KEY (successor_id) 
        REFERENCES tasks(id) 
        ON DELETE CASCADE,
    
    -- Prevent duplicate dependencies
    CONSTRAINT unique_dependency 
        UNIQUE (predecessor_id, successor_id),
    
    -- Prevent self-dependency
    CONSTRAINT no_self_dependency 
        CHECK (predecessor_id != successor_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dependencies_predecessor ON simple_task_dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_successor ON simple_task_dependencies(successor_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_type ON simple_task_dependencies(type);
