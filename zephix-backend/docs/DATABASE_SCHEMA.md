# Database Schema Documentation

## Overview
This document describes the current database schema for the Zephix backend application.

## Naming Convention
- **Database columns**: snake_case (e.g., `user_id`, `created_at`)
- **TypeScript properties**: camelCase (e.g., `userId`, `createdAt`)

## Core Tables

### resource_allocations
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | uuid_generate_v4() | Primary key |
| resource_id | uuid | NOT NULL | | Resource user ID |
| project_id | uuid | NOT NULL | | Project ID |
| task_id | uuid | | | Task ID (optional) |
| start_date | date | NOT NULL | | Allocation start date |
| end_date | date | NOT NULL | | Allocation end date |
| allocation_percentage | numeric(5,2) | NOT NULL | | Allocation percentage (0-100) |
| hours_per_day | integer | NOT NULL | 8 | Hours per day |
| created_at | timestamp | NOT NULL | now() | Creation timestamp |
| work_item_id | uuid | | | Work item ID (optional) |
| organization_id | uuid | | | Organization ID |
| user_id | uuid | | | User ID |
| updated_at | timestamp | | now() | Last update timestamp |

### users
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | uuid_generate_v4() | Primary key |
| email | varchar | NOT NULL | | User email (unique) |
| password | varchar | NOT NULL | | Hashed password |
| first_name | varchar | NOT NULL | | User first name |
| last_name | varchar | NOT NULL | | User last name |
| role | varchar | NOT NULL | 'user' | User role |
| organization_id | uuid | | | Organization ID |
| profile_picture | varchar | | | Profile picture URL |
| is_active | boolean | NOT NULL | true | Account active status |
| is_email_verified | boolean | NOT NULL | false | Email verification status |
| email_verified_at | timestamp | | | Email verification timestamp |
| last_login_at | timestamp | | | Last login timestamp |
| reset_token | varchar | | | Password reset token |
| reset_token_expiry | timestamp | | | Reset token expiry |
| verification_token | varchar | | | Email verification token |
| created_at | timestamp | NOT NULL | now() | Creation timestamp |
| updated_at | timestamp | NOT NULL | now() | Last update timestamp |

### projects
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | uuid_generate_v4() | Primary key |
| name | varchar(255) | NOT NULL | | Project name |
| description | text | | | Project description |
| status | varchar | NOT NULL | 'planning' | Project status |
| priority | varchar | NOT NULL | 'medium' | Project priority |
| start_date | timestamp | | | Project start date |
| end_date | timestamp | | | Project end date |
| estimated_end_date | timestamp | | | Estimated end date |
| organization_id | uuid | NOT NULL | | Organization ID |
| project_manager_id | uuid | | | Project manager ID |
| budget | decimal(10,2) | | | Project budget |
| actual_cost | decimal(10,2) | | | Actual cost |
| risk_level | varchar | NOT NULL | 'medium' | Risk level |
| created_by_id | uuid | | | Creator user ID |
| created_at | timestamp | NOT NULL | now() | Creation timestamp |
| updated_at | timestamp | NOT NULL | now() | Last update timestamp |

## Indexes

### resource_allocations
- `PK_resource_allocations` (id) - Primary key
- `idx_allocations_org_user_dates` (organization_id, user_id, start_date, end_date)
- `idx_allocations_project` (project_id)
- `idx_resource_allocations_dates` (resource_id, start_date, end_date)

## Constraints

### resource_allocations
- `check_allocation_percentage`: allocation_percentage > 0 AND allocation_percentage <= 100
- `check_date_range`: start_date <= end_date
- `check_reasonable_date`: end_date <= CURRENT_DATE + 2 years

## Foreign Keys

### resource_allocations
- `fk_allocation_project`: project_id → projects(id) ON DELETE CASCADE
- `fk_resource_allocations_organization`: organization_id → organizations(id) ON DELETE CASCADE
- `fk_resource_allocations_user`: user_id → users(id) ON DELETE CASCADE
- `fk_resource_user`: resource_id → users(id) ON DELETE CASCADE
- `resource_allocations_work_item_id_fkey`: work_item_id → work_items(id) ON DELETE SET NULL

## Notes
- All timestamps are stored in UTC
- UUIDs are generated using PostgreSQL's uuid-ossp extension
- Percentage values are stored as numeric with 2 decimal places
- Date fields use the 'date' type for allocation periods
