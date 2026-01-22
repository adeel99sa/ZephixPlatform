# LOGIN DEBUG INFORMATION
Date: 2026-01-18 (12:00 AM)

## 1. 401 Response Body

**Request:**
```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@zephix.ai","password":"test123456"}'
```

**Response:**
```json
{
  "code": "UNAUTHENTICATED",
  "message": "Invalid credentials"
}
```

**Status Code:** HTTP 401 Unauthorized

## 2. Users Table Password Column

**Entity File:** `zephix-backend/src/modules/users/entities/user.entity.ts`

**Column Definition:**
```typescript
@Column({ name: 'password' })
password: string;
```

**Database Column Name:** `password` (not `password_hash` or `hashed_password`)

**Query to find password columns:**
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
AND column_name ILIKE '%pass%';
```

**Expected Result:** `password`

## 3. AuthService Password Verification Code

**File:** `zephix-backend/src/modules/auth/auth.service.ts`

**Method:** `login()` (lines 144-165)

**Password Verification Snippet:**
```typescript
async login(loginDto: LoginDto, ip?: string, userAgent?: string) {
  const { email, password } = loginDto;

  // Find user with organization
  const user = await this.userRepository.findOne({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // Check password
  console.log(`[DEBUG] Comparing password for ${email}`);
  console.log(
    `[DEBUG] Stored hash: ${user.password ? user.password.substring(0, 20) + '...' : 'null'}`,
  );
  const isPasswordValid = await bcrypt.compare(password, user.password);
  console.log(`[DEBUG] Password valid: ${isPasswordValid}`);
  if (!isPasswordValid) {
    throw new UnauthorizedException('Invalid credentials');
  }
  
  // ... rest of login logic
}
```

**Key Points:**
- Uses `bcrypt.compare(password, user.password)` at line 161
- Imports: `import * as bcrypt from 'bcrypt';` (line 18)
- Password column: `user.password` (not `user.passwordHash` or `user.hashedPassword`)
- Hash algorithm: **bcrypt** (not argon2)

## 4. Backend Instance Confirmation

**Frontend:** `http://localhost:5173`
**Backend:** `http://localhost:3000` (proxied via Vite)
**Email Tested:** `admin@zephix.ai`

## 5. Next Steps

**To fix the login:**

1. **Check if user exists:**
```sql
SELECT id, email, password, organization_id, created_at
FROM users
WHERE lower(email) = lower('admin@zephix.ai');
```

2. **If user exists, update password:**
```sql
UPDATE users
SET password = '$2b$10$BPU1NVv6SRZiVY2itjQxdOOuF7Ls3HuHzZDzmnq4ujYOlNd9GfpU2',
    updated_at = now()
WHERE lower(email) = lower('admin@zephix.ai');
```

**Password for hash:** `NewStrongPass123!`
**Bcrypt Hash:** `$2b$10$BPU1NVv6SRZiVY2itjQxdOOuF7Ls3HuHzZDzmnq4ujYOlNd9GfpU2`

3. **If user doesn't exist, create via signup API or direct DB insert with organization**
