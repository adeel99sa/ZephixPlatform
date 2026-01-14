# Implementation Plan: Notifications & Sessions

**Date:** 2025-01-27
**Features:** Notification Preferences + In-App Inbox MVP, Session Management

## Checklist

### Phase 0: Planning ✅
- [x] Inspect auth service and controller
- [x] Inspect JWT strategy and payload
- [x] Inspect RefreshToken entity
- [x] Inspect UserSettings entity
- [x] Inspect notification service stubs
- [x] Inspect frontend settings pages

### Feature 1: Notification Preferences & In-App Inbox

#### A. Backend Data Model
- [ ] Create `notifications` table migration
- [ ] Create `notification_reads` table migration
- [ ] Create `Notification` entity
- [ ] Create `NotificationRead` entity
- [ ] Add indexes for performance

#### B. Preferences Schema
- [ ] Define notification preferences JSON schema
- [ ] Create `NotificationPreferencesService`
- [ ] Add `GET /api/users/me/notification-preferences` endpoint
- [ ] Add `PUT /api/users/me/notification-preferences` endpoint

#### C. Inbox Endpoints
- [ ] Add `GET /api/notifications` (cursor pagination)
- [ ] Add `GET /api/notifications/unread-count`
- [ ] Add `POST /api/notifications/:id/read`
- [ ] Add `POST /api/notifications/read-all`
- [ ] Implement organization_id guard

#### D. Dispatch and Wiring
- [ ] Create `NotificationDispatchService`
- [ ] Replace `WorkflowNotificationService` stub
- [ ] Wire org invite created event
- [ ] Wire workspace member role changed event
- [ ] Wire workspace member suspended/reinstated event
- [ ] Add email templates for wired events

### Feature 2: Session Management

#### A. Backend Sessions Table
- [ ] Create `auth_sessions` table migration
- [ ] Create `AuthSession` entity
- [ ] Add refresh token hashing with pepper support

#### B. Token Flow Changes
- [ ] Update login to create session
- [ ] Update login to return sessionId
- [ ] Update refresh to use session
- [ ] Update refresh to rotate token
- [ ] Update logout to revoke session

#### C. New Endpoints
- [ ] Add `GET /api/auth/sessions`
- [ ] Add `POST /api/auth/sessions/:id/revoke`
- [ ] Add `POST /api/auth/sessions/revoke-others`

#### D. Security Rules
- [ ] Enforce user-only session access
- [ ] Implement revoked session blocking
- [ ] Add throttled last_seen updates

### Frontend Implementation

#### A. Settings Pages
- [ ] Add `/settings/notifications` route
- [ ] Create notification preferences UI
- [ ] Wire to preferences endpoints

#### B. Inbox
- [ ] Add `/inbox` route
- [ ] Create inbox list UI
- [ ] Add unread badge to header
- [ ] Wire to inbox endpoints

#### C. Security Page
- [ ] Add sessions section to `/settings/security`
- [ ] Create sessions table UI
- [ ] Wire to session endpoints

#### D. Client Auth Storage
- [ ] Store sessionId with tokens
- [ ] Update logout to call backend
- [ ] Handle revoked session in refresh

### Testing & Verification
- [ ] Run lint
- [ ] Run tests
- [ ] Fix failures
- [ ] Manual verification script
