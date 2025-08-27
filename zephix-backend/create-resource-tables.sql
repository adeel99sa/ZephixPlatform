-- Create resource_allocations table
CREATE TABLE "resource_allocations" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "resourceId" uuid NOT NULL,
  "projectId" uuid NOT NULL,
  "taskId" uuid,
  "startDate" date NOT NULL,
  "endDate" date NOT NULL,
  "allocationPercentage" numeric(5,2) NOT NULL,
  "hoursPerDay" integer NOT NULL DEFAULT 8,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_resource_allocations" PRIMARY KEY ("id")
);

-- Create resource_conflicts table
CREATE TABLE "resource_conflicts" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "resourceId" character varying NOT NULL,
  "conflictDate" date NOT NULL,
  "totalAllocation" numeric(5,2) NOT NULL,
  "affectedProjects" jsonb NOT NULL,
  "severity" character varying NOT NULL,
  "resolved" boolean NOT NULL DEFAULT false,
  "detectedAt" TIMESTAMP NOT NULL DEFAULT now(),
  "resolvedAt" TIMESTAMP,
  CONSTRAINT "PK_resource_conflicts" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "IDX_resource_allocations_resource_date" 
ON "resource_allocations" ("resourceId", "startDate", "endDate");

CREATE INDEX "IDX_resource_allocations_project" 
ON "resource_allocations" ("projectId");

CREATE INDEX "IDX_resource_conflicts_resource_date" 
ON "resource_conflicts" ("resourceId", "conflictDate");

CREATE INDEX "IDX_resource_conflicts_severity" 
ON "resource_conflicts" ("severity");
