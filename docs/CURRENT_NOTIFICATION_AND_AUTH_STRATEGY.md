# Current Notification Service Stubs & Auth Token Strategy

**Date:** 2025-01-27
**Purpose:** Provide current implementation details for notification preferences and session management features

---

## 1. NOTIFICATION SERVICE STUBS

### 1.1 WorkflowNotificationService (Stub)
**Location:** `zephix-backend/src/workflows/services/workflow-notification.service.ts`

**Current Implementation:**
```typescript
@Injectable()
export class WorkflowNotificationService {
  async sendWorkflowNotification(
    type: string,
    data: any,
    recipients: string[],
  ): Promise<void> {
    // PLACEHOLDER - logs only, no actual delivery
    // In production: await this.emailService.send(recipient, type, data);
    // In production: await this.slackService.send(recipient, type, data);
  }

  async notifyStageTransition(...): Promise<void> { /* stub */ }
  async notifyApprovalRequired(...): Promise<void> { /* stub */ }
}
```

**Status:** ✅ Service exists, ❌ No actual delivery implementation

---

### 1.2 EmailService (Partial Implementation)
**Location:** `zephix-backend/src/shared/services/email.service.ts`

**Current Implementation:**
```typescript
@Injectable()
export class EmailService {
  private isConfigured = false; // Based on SENDGRID_API_KEY env var

  async sendEmail(options: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    from?: string;
  }): Promise<void> {
    // Uses SendGrid (sgMail)
    // Falls back gracefully if not configured
  }

  async sendInvitationEmail(data: InvitationEmailData): Promise<void> { /* implemented */ }
  async sendVerificationEmail(email: string, token: string): Promise<void> { /* implemented */ }
}
```

**Status:** ✅ Basic email sending works, ⚠️ No notification-specific templates

**Configuration:**
- `SENDGRID_API_KEY` (optional)
- `SENDGRID_FROM_EMAIL` (optional, defaults to `noreply@zephix.dev`)
- `FRONTEND_URL` (for links in emails)

---

### 1.3 IntegrationService (Slack/Teams Webhooks)
**Location:** `zephix-backend/src/pm/services/integration.service.ts`

**Current Implementation:**
```typescript
@Injectable()
export class IntegrationService {
  async sendSlackNotification(webhookUrl: string, payload: any): Promise<void> { /* implemented */ }
  async sendTeamsNotification(webhookUrl: string, payload: any): Promise<void> { /* implemented */ }
  private async sendEmailNotification(recipients: string[], subject: string, context: any): Promise<void> { /* stub */ }
}
```

**Status:** ✅ Slack/Teams webhooks work, ⚠️ Email notifications are stubs

---

### 1.4 UserSettings Entity (Notification Preferences Storage)
**Location:** `zephix-backend/src/modules/users/entities/user-settings.entity.ts`

**Current Schema:**
```typescript
@Entity('user_settings')
export class UserSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column('jsonb', { default: {} })
  preferences: Record<string, any>; // Unstructured JSONB

  @Column('jsonb', { default: {} })
  notifications: Record<string, any>; // Unstructured JSONB - THIS IS WHERE NOTIFICATION PREFS GO

  @Column({ length: 20, default: 'light' })
  theme: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

**Status:** ✅ Storage exists, ❌ No structured schema, ❌ No API endpoints

**Index:** `idx_user_settings_unique` on `(userId, organizationId)` - ensures one settings record per user per org

---

### 1.5 AlertConfiguration Entity (Project-Level Alerts)
**Location:** `zephix-backend/src/pm/entities/alert-configuration.entity.ts`

**Current Schema:**
```typescript
@Entity('alert_configurations')
export class AlertConfiguration {
  @Column('jsonb')
  notificationChannels: {
    email: boolean;
    slack: boolean;
    teams: boolean;
    dashboard: boolean;
    sms: boolean;
  };

  @Column('jsonb')
  recipients: {
    users: string[];
    roles: string[];
    stakeholderTypes: string[];
  };
}
```

**Status:** ✅ Project-level alert config exists, ❌ Not connected to user preferences

---

### 1.6 Missing Notification Infrastructure

**Not Implemented:**
- ❌ User notification preferences API endpoints
- ❌ Notification delivery queue/worker
- ❌ Inbox/notification storage table
- ❌ Desktop push notification service
- ❌ Mobile push notification service
- ❌ Notification subscription management
- ❌ Email digest scheduling
- ❌ Notification read/unread tracking

---

## 2. AUTH TOKEN STRATEGY

### 2.1 JWT Token Generation
**Location:** `zephix-backend/src/modules/auth/auth.service.ts`

**Current Implementation:**
```typescript
private async generateToken(user: User): Promise<string> {
  const payload = {
    sub: user.id,
    email: user.email,
    organizationId: user.organizationId,
    role: user.role, // Legacy
    platformRole: platformRole, // Normalized: ADMIN, MEMBER, VIEWER
  };

  return this.jwtService.sign(payload, {
    secret: process.env.JWT_SECRET || 'fallback-secret-key',
    expiresIn: '15m', // 15 minutes
  });
}

private async generateRefreshToken(user: User): Promise<string> {
  // Same payload structure
  return this.jwtService.sign(payload, {
    secret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    expiresIn: '7d', // 7 days
  });
}
```

**JWT Payload Structure:**
```typescript
interface JwtPayload {
  sub: string;              // User ID
  email: string;            // User email
  organizationId: string;   // Current organization ID
  role: string;             // Legacy role (backward compatibility)
  platformRole: PlatformRole; // Normalized: ADMIN | MEMBER | VIEWER
  roles?: string[];         // Additional roles (optional)
}
```

**Configuration:**
- `JWT_SECRET` - Access token secret
- `JWT_EXPIRES_IN` - Access token expiry (default: `15m`)
- `JWT_REFRESH_SECRET` - Refresh token secret
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiry (default: `7d`)
- `JWT_ALGORITHM` - HS256 or RS256 (default: `HS256`)

**Status:** ✅ Fully implemented

---

### 2.2 JWT Strategy (Passport)
**Location:** `zephix-backend/src/modules/auth/strategies/jwt.strategy.ts`

**Current Implementation:**
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      platformRole: payload.platformRole || payload.role,
      organizationId: payload.organizationId,
      workspaceId: payload.workspaceId,
      roles: payload.roles ?? [],
    };
  }
}
```

**Status:** ✅ Fully implemented

---

### 2.3 Refresh Token Flow
**Location:** `zephix-backend/src/modules/auth/auth.service.ts`

**Current Implementation:**
```typescript
async refreshToken(refreshToken: string, ip: string, userAgent: string) {
  // Decodes refresh token (no DB lookup currently)
  const decoded = this.jwtService.verify(refreshToken, {
    secret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
  });

  const user = await this.getUserById(decoded.sub);

  // Issues new access + refresh token pair
  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: 900, // 15 minutes
  };
}
```

**Status:** ✅ Works, ⚠️ No refresh token storage/revocation tracking

**Endpoint:** `POST /api/auth/refresh`
- Body: `{ refreshToken: string }`
- Response: `{ accessToken, refreshToken, expiresIn }`

---

### 2.4 RefreshToken Entity (Exists but Not Used)
**Location:** `zephix-backend/src/modules/auth/entities/refresh-token.entity.ts`

**Current Schema:**
```typescript
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User)
  user: User;

  @Column({ unique: true })
  token: string; // ⚠️ Stores plain token (should be hashed)

  @Column()
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @Column({ default: false })
  revoked: boolean;
}
```

**Status:** ✅ Entity exists, ❌ Not used in refresh flow, ⚠️ Security issue (stores plain tokens)

---

### 2.5 Session Tracking (Missing)
**Current State:**
- ❌ No session storage table
- ❌ No device tracking
- ❌ No IP address logging for sessions
- ❌ No user agent tracking for sessions
- ❌ No "last seen" tracking
- ❌ No session revocation endpoint

**What Exists:**
- ✅ `user.lastLoginAt` - Last login timestamp (updated on login)
- ✅ `EmailVerificationToken` has `ip` and `userAgent` fields (for verification only)
- ✅ `AuditLog` entity has `ipAddress` and `userAgent` (for audit trail, not sessions)

---

### 2.6 Login Flow
**Location:** `zephix-backend/src/modules/auth/auth.service.ts`

**Current Implementation:**
```typescript
async login(loginDto: LoginDto) {
  // 1. Find user by email
  // 2. Verify password (bcrypt)
  // 3. Update lastLoginAt
  // 4. Generate access + refresh tokens
  // 5. Build user response with permissions
  // 6. Return { user, accessToken, refreshToken, expiresIn }
}
```

**Endpoint:** `POST /api/auth/login`
- Body: `{ email: string, password: string }`
- Response: `{ user: {...}, accessToken: string, refreshToken: string, expiresIn: number }`

**Status:** ✅ Fully implemented

**Missing:**
- ❌ No session record creation
- ❌ No device/IP tracking on login
- ❌ No login history table

---

### 2.7 Logout Flow
**Location:** `zephix-backend/src/modules/auth/auth.service.ts`

**Current Implementation:**
```typescript
async logout(userId: string): Promise<void> {
  // For MVP, logout is handled client-side by removing the token
  // In production, you might want to blacklist the token or track logout events
  console.log(`User ${userId} logged out`);
}
```

**Status:** ⚠️ Client-side only, ❌ No server-side token invalidation

**Endpoint:** `POST /api/auth/logout`
- Auth: Required (JWT)
- Response: `{ message: "Logged out successfully" }`

---

## 3. SUMMARY

### Notification Service Status
| Component | Status | Notes |
|-----------|--------|-------|
| WorkflowNotificationService | ❌ Stub | Logs only, no delivery |
| EmailService | ✅ Partial | SendGrid integration works |
| IntegrationService | ✅ Partial | Slack/Teams webhooks work |
| UserSettings.notifications | ✅ Storage | JSONB field exists, no structure |
| Notification preferences API | ❌ Missing | No endpoints |
| Inbox/notification storage | ❌ Missing | No table |
| Desktop push | ❌ Missing | No service |
| Mobile push | ❌ Missing | No service |
| Email digest | ❌ Missing | No scheduling |

### Auth Token Strategy Status
| Component | Status | Notes |
|-----------|--------|-------|
| JWT access tokens | ✅ Complete | 15m expiry, includes platformRole |
| JWT refresh tokens | ✅ Complete | 7d expiry, no DB tracking |
| RefreshToken entity | ⚠️ Unused | Exists but not used in flow |
| Token refresh endpoint | ✅ Complete | POST /api/auth/refresh |
| Session storage | ❌ Missing | No table, no tracking |
| Device tracking | ❌ Missing | No device/IP/userAgent on login |
| Session revocation | ❌ Missing | No endpoint to revoke sessions |
| Logout token invalidation | ❌ Missing | Client-side only |

---

## 4. WHAT'S NEEDED FOR NOTIFICATION PREFERENCES & SESSION MANAGEMENT

### For Notification Preferences:
1. **Structured notification preferences schema** in `UserSettings.notifications` JSONB
2. **API endpoints** to get/update preferences
3. **Notification delivery service** that respects user preferences
4. **Inbox table** for storing notifications
5. **Subscription management** for projects/workspaces

### For Session Management:
1. **Sessions table** with device info, IP, userAgent, lastSeen
2. **Session creation** on login
3. **Session tracking** on each request (update lastSeen)
4. **Session revocation** endpoints (revoke one, revoke all)
5. **Session listing** endpoint (GET /api/auth/sessions)
6. **Refresh token storage** (use RefreshToken entity or create new)

---

## 5. FILES REFERENCED

**Notification Services:**
- `zephix-backend/src/workflows/services/workflow-notification.service.ts`
- `zephix-backend/src/shared/services/email.service.ts`
- `zephix-backend/src/pm/services/integration.service.ts`
- `zephix-backend/src/modules/users/entities/user-settings.entity.ts`
- `zephix-backend/src/pm/entities/alert-configuration.entity.ts`

**Auth Services:**
- `zephix-backend/src/modules/auth/auth.service.ts`
- `zephix-backend/src/modules/auth/strategies/jwt.strategy.ts`
- `zephix-backend/src/modules/auth/entities/refresh-token.entity.ts`
- `zephix-backend/src/modules/auth/auth.controller.ts`
- `zephix-backend/src/config/jwt.config.ts`
