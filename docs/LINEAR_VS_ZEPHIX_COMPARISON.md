# Linear vs Zephix: Account & Settings Feature Comparison

**Date:** 2025-01-27
**Reference:** [Linear Documentation](https://linear.app/docs)

---

## Executive Summary

Zephix has foundational infrastructure for account management, but lacks the comprehensive, user-friendly features that Linear provides. Linear's approach is more polished, with better UX, comprehensive notification management, and modern security features like passkeys.

---

## 1. PROFILE

### Linear Features
- ✅ **Profile Picture**: Upload/change avatar with hover edit icon
- ✅ **Name & Username**: Full name and username management
- ✅ **Email Address**:
  - Unique ID across all workspaces
  - Change email with confirmation to both old/new addresses
  - Email change affects all workspaces
- ✅ **Personal Integrations**: View and manage connected third-party accounts
- ✅ **Leave Workspace**: Self-service workspace removal

### Zephix Current State
**Location:** `zephix-frontend/src/pages/profile/ProfilePage.tsx`

**Implemented:**
- ✅ Basic profile form (firstName, lastName, email)
- ✅ Edit mode toggle
- ✅ Avatar placeholder (initials only)
- ⚠️ **TODO**: Profile update API call (line 24 - simulated with setTimeout)
- ⚠️ **Missing**: Profile picture upload
- ⚠️ **Missing**: Username field
- ⚠️ **Missing**: Email change confirmation flow
- ⚠️ **Missing**: Personal integrations view
- ⚠️ **Missing**: Leave workspace functionality

**Backend Support:**
- ✅ `UserSettings` entity exists (`zephix-backend/src/modules/users/entities/user-settings.entity.ts`)
- ✅ JSONB `preferences` field available
- ⚠️ No profile picture storage entity
- ⚠️ No email change confirmation flow

**Gap Analysis:**
| Feature | Linear | Zephix | Priority |
|---------|--------|--------|----------|
| Profile picture upload | ✅ | ❌ | High |
| Username management | ✅ | ❌ | Medium |
| Email change with confirmation | ✅ | ❌ | High |
| Personal integrations | ✅ | ❌ | Low |
| Leave workspace | ✅ | ❌ | Medium |

---

## 2. PREFERENCES

### Linear Features
**General:**
- ✅ **Default home view**: Set default view on login (All issues, Active issues, Current cycle, Inbox, My Issues, Favorited Views, Favorited Projects)
- ✅ **Display full names**: Toggle between full names vs usernames
- ✅ **First day of week**: Calendar personalization
- ✅ **Convert text emoticons to emojis**: Auto-conversion toggle

**Interface & Theme:**
- ✅ **Font size**: Adjustable
- ✅ **Pointer cursor**: Toggle for interactive elements
- ✅ **Theme presets**: Light, Dark, System
- ✅ **Custom themes**: 70+ themes from linear.style
- ✅ **Theme builder**: Create custom themes

**Desktop Application:**
- ✅ **Open URLs in desktop app**: Toggle
- ✅ **Notification badges**: Toggle on desktop icon
- ✅ **Spell check**: Enable/disable

**Automations & Workflows:**
- ✅ **Auto-assign to self**: When creating issues
- ✅ **Auto-assign on move to started**: When moving issues to started status
- ✅ **Git attachment format**: Title only vs title + repository
- ✅ **Git branch copy actions**:
  - Move issue to started on branch copy
  - Auto-assign to self on branch copy

### Zephix Current State
**Location:**
- `zephix-frontend/src/pages/settings/SettingsPage.tsx` (main settings page)
- `zephix-frontend/src/pages/settings/components/AccountSettings.tsx` (basic account form)
- `zephix-frontend/src/stores/uiStore.ts` (theme management)

**Implemented:**
- ✅ Basic settings page with tabs (Account, Workspace, Organization, Billing)
- ✅ Theme management in `uiStore` (light, dark, system)
- ✅ Theme persistence
- ⚠️ **Missing**: Default home view preference
- ⚠️ **Missing**: Display name preference (full names vs usernames)
- ⚠️ **Missing**: First day of week
- ⚠️ **Missing**: Emoticon to emoji conversion
- ⚠️ **Missing**: Font size adjustment
- ⚠️ **Missing**: Pointer cursor toggle
- ⚠️ **Missing**: Custom theme builder
- ⚠️ **Missing**: Desktop app preferences
- ⚠️ **Missing**: Automation preferences (auto-assign, git actions)

**Backend Support:**
- ✅ `UserSettings` entity with `preferences` JSONB field
- ✅ `theme` column (light, dark, system)
- ⚠️ No structured preference schema
- ⚠️ No preference validation

**Gap Analysis:**
| Feature | Linear | Zephix | Priority |
|---------|--------|--------|----------|
| Default home view | ✅ | ❌ | High |
| Display name preference | ✅ | ❌ | Medium |
| Theme customization | ✅ | ⚠️ Basic | High |
| Custom themes | ✅ | ❌ | Low |
| Automation preferences | ✅ | ❌ | Medium |
| Desktop app settings | ✅ | ❌ | Low (if no desktop app) |

---

## 3. NOTIFICATIONS

### Linear Features
**Channels:**
- ✅ **Desktop**: Real-time notifications
- ✅ **Mobile**: Real-time notifications
- ✅ **Email**: Digest-based with timing controls
- ✅ **Slack**: Real-time notifications

**Configuration:**
- ✅ **Grouped notifications**: Status changes include priority, blocking relationships
- ✅ **Channel toggles**: Enable/disable per channel (green/gray dot indicators)
- ✅ **Notification types**: Granular control per channel

**Email Digests:**
- ✅ **Timing controls**:
  - Immediate for urgent/SLA breaches
  - Delay low priority outside work hours (8am-6pm)
  - Next day delivery for low priority
- ✅ **Read status**: Only send if inbox notification unread

**Subscriptions:**
- ✅ **Auto-subscribe**: On create, assign, @mention, manual subscribe
- ✅ **Thread subscriptions**: Auto-subscribe to thread on @mention in comment
- ✅ **Manage subscriptions**: Shift+S to subscribe/unsubscribe
- ✅ **Subscribed view**: My Issues > Subscribed

**Limits:**
- ✅ **Inbox limit**: 500 notifications retained

### Zephix Current State
**Location:**
- `zephix-frontend/src/features/admin/organization/NotificationsPage.tsx` (admin-only, placeholder)
- `zephix-backend/src/modules/users/entities/user-settings.entity.ts` (notifications JSONB field)
- `zephix-backend/src/workflows/services/workflow-notification.service.ts` (placeholder service)

**Implemented:**
- ✅ `UserSettings.notifications` JSONB field exists
- ✅ Basic notification service structure
- ⚠️ **Missing**: User-facing notification preferences UI
- ⚠️ **Missing**: Channel configuration (Desktop, Mobile, Email, Slack)
- ⚠️ **Missing**: Notification type granularity
- ⚠️ **Missing**: Email digest timing controls
- ⚠️ **Missing**: Subscription management
- ⚠️ **Missing**: Inbox notification system
- ⚠️ **Missing**: Real-time notification delivery

**Backend Support:**
- ✅ `WorkflowNotificationService` exists (placeholder)
- ✅ `AlertConfiguration` entity for project-level alerts
- ⚠️ No user notification preferences API
- ⚠️ No notification delivery system
- ⚠️ No inbox/notification storage

**Gap Analysis:**
| Feature | Linear | Zephix | Priority |
|---------|--------|--------|----------|
| Notification channels | ✅ 4 channels | ❌ | High |
| User preferences UI | ✅ | ❌ | High |
| Email digest timing | ✅ | ❌ | Medium |
| Subscription management | ✅ | ❌ | Medium |
| Inbox system | ✅ | ❌ | High |
| Real-time delivery | ✅ | ❌ | High |

---

## 4. SECURITY & ACCESS

### Linear Features
**Sessions:**
- ✅ **Session list**: Current and previously connected devices
- ✅ **Session details**: Location, source type, date last seen, IP address, original sign-in date
- ✅ **Revoke individual sessions**: Hover and revoke access
- ✅ **Revoke all sessions**: Remove all except current
- ✅ **Auto-expire**: Inactive sessions expire after 30 days

**Passkeys:**
- ✅ **Passkey registration**: Multiple devices supported
- ✅ **Browser support**: All major browsers
- ✅ **Mobile support**: iOS, Android
- ✅ **Password manager support**: 1Password, etc.
- ✅ **Fast login**: No password required

**Personal API Keys:**
- ✅ **Create API keys**: Generate new keys
- ✅ **Revoke API keys**: Remove access
- ✅ **Key management**: View all keys

**Authorized Applications:**
- ✅ **OAuth apps list**: View authorized applications
- ✅ **Permissions view**: See granted permissions
- ✅ **Revoke access**: Remove OAuth app access

### Zephix Current State
**Location:**
- `zephix-frontend/src/pages/admin/SecurityPage.tsx` (admin-only, org-level)
- `zephix-backend/src/organizations/entities/security-settings.entity.ts` (org-level security)
- `zephix-frontend/src/pages/admin/ApiKeysPage.tsx` (admin API keys)

**Implemented:**
- ✅ Admin security page (password policy, MFA, IP whitelist)
- ✅ Admin API keys page
- ✅ `SecuritySettings` entity (org-level)
- ⚠️ **Missing**: User-facing security & access page
- ⚠️ **Missing**: Session management (view, revoke)
- ⚠️ **Missing**: Passkey support
- ⚠️ **Missing**: Personal API keys (only admin-level exists)
- ⚠️ **Missing**: OAuth authorized apps view
- ⚠️ **Missing**: Device tracking

**Backend Support:**
- ✅ `SecuritySettings` entity (org-level only)
- ✅ Session timeout configuration (480 minutes default)
- ⚠️ No session tracking/storage
- ⚠️ No passkey storage
- ⚠️ No device tracking
- ⚠️ No OAuth app tracking

**Gap Analysis:**
| Feature | Linear | Zephix | Priority |
|---------|--------|--------|----------|
| Session management | ✅ | ❌ | High |
| Passkey support | ✅ | ❌ | Medium |
| Personal API keys | ✅ | ⚠️ Admin only | Medium |
| OAuth apps view | ✅ | ❌ | Low |
| Device tracking | ✅ | ❌ | High |

---

## 5. PULSE

### Linear Features
**Overview:**
- ✅ **Pulse feed**: Project and initiative updates feed
- ✅ **Sidebar item**: Accessible from sidebar
- ✅ **Inbox summaries**: Daily/weekly summaries in inbox
- ✅ **Workspace-level**: Available on all plans, not for Guests

**Basics:**
- ✅ **Admin enable**: Turn on/off in Settings > Pulse
- ✅ **Default cadence**: Weekly (Mondays), every weekday, or never
- ✅ **User override**: Users can customize their own schedule
- ✅ **Full text view**: Read full updates in Pulse sidebar page
- ✅ **Tabs**: For me, Popular, Recent
- ✅ **Badge control**: Right-click to show always, only when badged, or never

**Inbox Notifications:**
- ✅ **Daily/weekly summaries**: Delivered to inbox
- ✅ **Customize cadence**: Right-click notification or Preferences
- ✅ **Delivery time**: 7:00 AM local time
- ✅ **Auto-subscribe rules**:
  - Project member
  - Initiative owner
  - Explicit subscription
  - Subscribed to all sub-projects
  - Subscribed to all team project updates

**Custom Feeds:**
- ✅ **Personal feeds**: Create custom filtered feeds
- ✅ **Filter-based**: Narrow focus to specific updates
- ✅ **Private**: Only visible to creator

**Pulse Audio:**
- ✅ **Audio playback**: Play button to hear updates read aloud
- ✅ **Summarized audio**: Not full text
- ✅ **Platforms**: Desktop, web, mobile (not sidebar page)

### Zephix Current State
**Location:** No equivalent feature exists

**Implemented:**
- ❌ **Missing**: Pulse/feed system entirely
- ❌ **Missing**: Project update feed
- ❌ **Missing**: Initiative updates
- ❌ **Missing**: Inbox system
- ❌ **Missing**: Update subscriptions
- ❌ **Missing**: Audio playback

**Backend Support:**
- ❌ No feed/update system
- ❌ No subscription model
- ❌ No inbox storage

**Gap Analysis:**
| Feature | Linear | Zephix | Priority |
|---------|--------|--------|----------|
| Project update feed | ✅ | ❌ | Medium |
| Inbox system | ✅ | ❌ | High |
| Update subscriptions | ✅ | ❌ | Medium |
| Custom feeds | ✅ | ❌ | Low |
| Audio playback | ✅ | ❌ | Low |

---

## Recommendations

### High Priority (MVP Completion)
1. **Profile Picture Upload**: Essential for user identity
2. **Email Change Flow**: With confirmation to both addresses
3. **Default Home View**: Critical for UX personalization
4. **Notification Preferences UI**: User-facing settings page
5. **Session Management**: Security essential
6. **Inbox System**: Foundation for notifications

### Medium Priority (Feature Parity)
1. **Username Management**: Better than full names only
2. **Theme Customization**: Enhanced user experience
3. **Notification Channels**: Desktop, Mobile, Email, Slack
4. **Passkey Support**: Modern authentication
5. **Personal API Keys**: Developer-friendly
6. **Pulse/Feed System**: Project update visibility

### Low Priority (Nice to Have)
1. **Custom Themes**: Advanced customization
2. **Personal Integrations**: Third-party account management
3. **OAuth Apps View**: Security transparency
4. **Audio Playback**: Accessibility feature

---

## Implementation Notes

### Backend Requirements
1. **Profile Picture Storage**: Add `avatarUrl` to User entity or separate storage
2. **Email Change Confirmation**: Add `emailChangeToken` and `pendingEmail` fields
3. **Session Tracking**: Create `user_sessions` table with device info
4. **Notification Preferences**: Structure the JSONB `notifications` field
5. **Inbox System**: Create `notifications` table with read status
6. **Passkey Support**: Add `passkeys` table (WebAuthn)

### Frontend Requirements
1. **Settings Navigation**: Reorganize to match Linear's structure (Account > Profile, Preferences, Notifications, Security & Access)
2. **Notification Preferences Page**: Full UI for channel and type configuration
3. **Security & Access Page**: Sessions, passkeys, API keys, OAuth apps
4. **Inbox Component**: Notification center with read/unread status
5. **Pulse Feed**: Project update feed component

---

## References

- [Linear Profile Documentation](https://linear.app/docs/profile)
- [Linear Preferences Documentation](https://linear.app/docs/account-preferences)
- [Linear Notifications Documentation](https://linear.app/docs/notifications)
- [Linear Security & Access Documentation](https://linear.app/docs/security-and-access)
- [Linear Pulse Documentation](https://linear.app/docs/pulse)
