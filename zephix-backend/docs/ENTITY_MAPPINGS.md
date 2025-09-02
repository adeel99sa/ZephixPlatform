# Entity Mappings Documentation

## Overview
This document describes how TypeScript entities map to database columns in the Zephix backend.

## Mapping Convention
- **Database columns**: snake_case (e.g., `user_id`, `created_at`)
- **TypeScript properties**: camelCase (e.g., `userId`, `createdAt`)
- **Entity decorators**: Use explicit `@Column({ name: 'database_column_name' })`

## Core Entities

### ResourceAllocation Entity
```typescript
@Entity('resource_allocations')
export class ResourceAllocation extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'work_item_id', type: 'uuid', nullable: true })
  workItemId?: string;

  @Column({ name: 'task_id', type: 'uuid', nullable: true })
  taskId?: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({ name: 'allocation_percentage', type: 'numeric', precision: 5, scale: 2 })
  allocationPercentage: number;

  @Column({ name: 'hours_per_day', type: 'int', default: 8 })
  hoursPerDay: number;
}
```

**Database Mapping:**
- `organizationId` → `organization_id` (uuid)
- `resourceId` → `resource_id` (uuid)
- `userId` → `user_id` (uuid)
- `projectId` → `project_id` (uuid)
- `workItemId` → `work_item_id` (uuid, nullable)
- `taskId` → `task_id` (uuid, nullable)
- `startDate` → `start_date` (date)
- `endDate` → `end_date` (date)
- `allocationPercentage` → `allocation_percentage` (numeric(5,2))
- `hoursPerDay` → `hours_per_day` (integer, default: 8)

### User Entity
```typescript
@Entity('users')
export class User extends BaseEntity {
  @Column({ name: 'email', unique: true })
  email: string;

  @Column({ name: 'password' })
  password: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'role', default: 'user' })
  role: string;

  @Column({ name: 'organization_id', nullable: true })
  organizationId?: string;

  @Column({ name: 'profile_picture', nullable: true })
  profilePicture?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'email_verified_at', type: 'timestamp', nullable: true })
  emailVerifiedAt?: Date;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'reset_token', nullable: true })
  resetToken?: string;

  @Column({ name: 'reset_token_expiry', type: 'timestamp', nullable: true })
  resetTokenExpiry?: Date;

  @Column({ name: 'verification_token', nullable: true })
  verificationToken?: string;
}
```

**Database Mapping:**
- `email` → `email` (varchar, unique)
- `password` → `password` (varchar)
- `firstName` → `first_name` (varchar)
- `lastName` → `last_name` (varchar)
- `role` → `role` (varchar, default: 'user')
- `organizationId` → `organization_id` (uuid, nullable)
- `profilePicture` → `profile_picture` (varchar, nullable)
- `isActive` → `is_active` (boolean, default: true)
- `isEmailVerified` → `is_email_verified` (boolean, default: false)
- `emailVerifiedAt` → `email_verified_at` (timestamp, nullable)
- `lastLoginAt` → `last_login_at` (timestamp, nullable)
- `resetToken` → `reset_token` (varchar, nullable)
- `resetTokenExpiry` → `reset_token_expiry` (timestamp, nullable)
- `verificationToken` → `verification_token` (varchar, nullable)

### Project Entity
```typescript
@Entity('projects')
export class Project extends BaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  @Column({
    name: 'status',
    type: 'varchar',
    default: ProjectStatus.PLANNING,
  })
  status: ProjectStatus;

  @Column({ 
    name: 'priority',
    type: 'varchar',
    default: ProjectPriority.MEDIUM
  })
  priority: ProjectPriority;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ name: 'estimated_end_date', type: 'timestamp', nullable: true })
  estimatedEndDate: Date;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'project_manager_id', type: 'uuid', nullable: true })
  projectManagerId: string;

  @Column({ name: 'budget', type: 'decimal', precision: 10, scale: 2, nullable: true })
  budget: number;

  @Column({ name: 'actual_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  actualCost: number;

  @Column({ 
    name: 'risk_level',
    type: 'varchar',
    default: ProjectRiskLevel.MEDIUM
  })
  riskLevel: ProjectRiskLevel;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string;
}
```

**Database Mapping:**
- `name` → `name` (varchar(255))
- `description` → `description` (text, nullable)
- `status` → `status` (varchar, default: 'planning')
- `priority` → `priority` (varchar, default: 'medium')
- `startDate` → `start_date` (timestamp, nullable)
- `endDate` → `end_date` (timestamp, nullable)
- `estimatedEndDate` → `estimated_end_date` (timestamp, nullable)
- `organizationId` → `organization_id` (uuid)
- `projectManagerId` → `project_manager_id` (uuid, nullable)
- `budget` → `budget` (decimal(10,2), nullable)
- `actualCost` → `actual_cost` (decimal(10,2), nullable)
- `riskLevel` → `risk_level` (varchar, default: 'medium')
- `createdById` → `created_by_id` (uuid, nullable)

## Base Entity
All entities extend `BaseEntity` which provides:
```typescript
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

**Database Mapping:**
- `id` → `id` (uuid, auto-generated)
- `createdAt` → `created_at` (timestamp, auto-set)
- `updatedAt` → `updated_at` (timestamp, auto-updated)

## Best Practices
1. **Always use explicit column names** in `@Column` decorators
2. **Extend BaseEntity** for consistent id, createdAt, updatedAt
3. **Use snake_case for database columns** and **camelCase for TypeScript properties**
4. **Include proper types** for all columns (uuid, varchar, timestamp, etc.)
5. **Set nullable: true** for optional fields
6. **Use appropriate defaults** where applicable
