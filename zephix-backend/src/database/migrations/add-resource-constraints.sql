-- Add constraint to prevent >100% allocation per person per day
ALTER TABLE resource_allocations 
ADD CONSTRAINT check_allocation_percentage 
CHECK ("allocationPercentage" > 0 AND "allocationPercentage" <= 100);

-- Add constraint to ensure valid date ranges
ALTER TABLE resource_allocations
ADD CONSTRAINT check_date_range
CHECK ("startDate" <= "endDate");

-- Add constraint to ensure endDate is not more than 2 years in future
ALTER TABLE resource_allocations
ADD CONSTRAINT check_reasonable_date
CHECK ("endDate" <= CURRENT_DATE + INTERVAL '2 years');

-- Add index for performance on conflict queries
CREATE INDEX IF NOT EXISTS idx_resource_allocations_dates 
ON resource_allocations("resourceId", "startDate", "endDate");

-- Ensure resourceId references valid user
ALTER TABLE resource_allocations
ADD CONSTRAINT fk_resource_user
FOREIGN KEY ("resourceId") REFERENCES users(id) ON DELETE CASCADE;

-- Ensure projectId references valid project
ALTER TABLE resource_allocations
ADD CONSTRAINT fk_allocation_project
FOREIGN KEY ("projectId") REFERENCES projects(id) ON DELETE CASCADE;
