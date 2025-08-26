# Backend API Setup for Zephix Landing Page

## Overview
This document outlines the backend requirements to make the landing page fully production-ready.

## Required API Endpoints

### 1. Waitlist Submission Endpoint

```typescript
// POST /api/waitlist
interface WaitlistRequest {
  email: string;
  company: string;
  teamSize: string;
  currentTool: string;
  submittedAt: string;
  userAgent: string;
  source: string;
}

interface WaitlistResponse {
  success: boolean;
  message: string;
  submissionId?: string;
}
```

**Implementation Requirements:**
- Email validation (work email only, no aliases)
- Company name validation (2-100 characters)
- Rate limiting: 3 submissions per IP per hour
- CSRF protection
- Database storage with timestamp and IP tracking
- Email notification to admin team

### 2. Waitlist Status Check

```typescript
// GET /api/waitlist/check?email={email}
interface StatusCheckResponse {
  exists: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  submittedAt?: string;
}
```

### 3. Waitlist Statistics (Admin)

```typescript
// GET /api/waitlist/stats
interface WaitlistStats {
  totalSubmissions: number;
  recentSubmissions: number;
  topCompanies: Array<{ company: string; count: number }>;
  topTools: Array<{ tool: string; count: number }>;
  conversionRate: number;
}
```

### 4. Data Export (Admin)

```typescript
// GET /api/waitlist/export?format=csv|json|xlsx
// Returns file blob for download
```

## Security Implementation

### Rate Limiting
```typescript
// Using Redis or similar for distributed rate limiting
const rateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // max 3 requests per window
  message: 'Too many submission attempts. Please try again in an hour.',
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore
};
```

### CSRF Protection
```typescript
// Generate CSRF token on page load
app.get('/api/csrf-token', (req, res) => {
  const token = generateCSRFToken();
  res.cookie('csrf-token', token, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.json({ token });
});

// Validate CSRF token on form submission
const validateCSRF = (req, res, next) => {
  const token = req.headers['x-csrf-token'];
  const cookieToken = req.cookies['csrf-token'];
  
  if (!token || !cookieToken || token !== cookieToken) {
    return res.status(403).json({ error: 'CSRF token validation failed' });
  }
  next();
};
```

### Input Validation
```typescript
// Server-side validation using Zod
const waitlistSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .refine(email => !email.includes('+'), 'No aliased emails allowed')
    .refine(email => {
      const freeEmails = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
      return !freeEmails.some(domain => email.endsWith(domain));
    }, 'Please use a work email address'),
  company: z.string().min(2).max(100),
  teamSize: z.enum(['1-10', '11-50', '51-200', '200+']),
  currentTool: z.enum(['Monday', 'Asana', 'ClickUp', 'Jira', 'Other', 'None'])
});
```

## Database Schema

### Waitlist Submissions Table
```sql
CREATE TABLE waitlist_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  company VARCHAR(100) NOT NULL,
  team_size VARCHAR(20) NOT NULL,
  current_tool VARCHAR(50) NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  source VARCHAR(50) DEFAULT 'landing_page',
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_waitlist_email ON waitlist_submissions(email);
CREATE INDEX idx_waitlist_submitted_at ON waitlist_submissions(submitted_at);
CREATE INDEX idx_waitlist_status ON waitlist_submissions(status);
CREATE INDEX idx_waitlist_ip_submitted ON waitlist_submissions(ip_address, submitted_at);
```

### Rate Limiting Table
```sql
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash VARCHAR(64) NOT NULL, -- Hash of IP + endpoint
  requests_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_key_window ON rate_limits(key_hash, window_start);
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/zephix
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-super-secret-jwt-key
CSRF_SECRET=your-csrf-secret-key
SESSION_SECRET=your-session-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=3

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Admin
ADMIN_EMAIL=admin@zephix.ai
NOTIFICATION_WEBHOOK=https://hooks.slack.com/your-webhook
```

## Implementation Steps

### 1. Set Up Database
```bash
# Install PostgreSQL and Redis
sudo apt-get install postgresql redis-server

# Create database
createdb zephix

# Run migrations
psql -d zephix -f migrations/001_create_waitlist_tables.sql
```

### 2. Install Dependencies
```bash
npm install express-rate-limit redis express-session helmet cors
npm install -D @types/express @types/redis @types/express-session
```

### 3. Basic Express Server Setup
```typescript
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { Pool } from 'pg';
import Redis from 'ioredis';

const app = express();
const port = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/waitlist', limiter);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Redis connection
const redis = new Redis(process.env.REDIS_URL);

// Routes
app.post('/api/waitlist', async (req, res) => {
  try {
    // Validate input
    const validatedData = waitlistSchema.parse(req.body);
    
    // Check rate limiting
    const rateLimited = await checkRateLimit(req.ip);
    if (rateLimited) {
      return res.status(429).json({
        success: false,
        message: 'Too many submission attempts. Please try again in an hour.'
      });
    }
    
    // Store in database
    const result = await pool.query(
      'INSERT INTO waitlist_submissions (email, company, team_size, current_tool, ip_address, user_agent, source) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [validatedData.email, validatedData.company, validatedData.teamSize, validatedData.currentTool, req.ip, validatedData.userAgent, validatedData.source]
    );
    
    // Send notification
    await sendNotification(validatedData);
    
    res.json({
      success: true,
      message: 'Thank you! We\'ll be in touch soon.',
      submissionId: result.rows[0].id
    });
    
  } catch (error) {
    console.error('Waitlist submission error:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid submission data. Please check your information.'
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

## Testing the API

### 1. Test Form Submission
```bash
curl -X POST http://localhost:3001/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@company.com",
    "company": "Test Company",
    "teamSize": "11-50",
    "currentTool": "Jira",
    "userAgent": "curl/7.68.0",
    "source": "landing_page"
  }'
```

### 2. Test Rate Limiting
```bash
# Submit multiple times quickly to test rate limiting
for i in {1..5}; do
  curl -X POST http://localhost:3001/api/waitlist \
    -H "Content-Type: application/json" \
    -d '{"email": "test'$i'@company.com", "company": "Test", "teamSize": "1-10", "currentTool": "None", "userAgent": "test", "source": "test"}'
  echo "Request $i"
done
```

## Monitoring & Analytics

### 1. Logging
```typescript
// Add structured logging
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log all submissions
logger.info('Waitlist submission', {
  email: validatedData.email,
  company: validatedData.company,
  ip: req.ip,
  timestamp: new Date().toISOString()
});
```

### 2. Metrics
```typescript
// Track submission metrics
const metrics = {
  totalSubmissions: 0,
  dailySubmissions: 0,
  conversionRate: 0
};

// Update metrics on successful submission
metrics.totalSubmissions++;
metrics.dailySubmissions++;
```

## Deployment Checklist

- [ ] Database migrations run successfully
- [ ] Environment variables configured
- [ ] Rate limiting tested
- [ ] CSRF protection working
- [ ] Input validation tested
- [ ] Error handling verified
- [ ] Logging configured
- [ ] Monitoring set up
- [ ] SSL certificate installed
- [ ] Load balancer configured (if needed)

## Support & Maintenance

### Regular Tasks
- Monitor rate limiting effectiveness
- Review and clean old rate limit records
- Analyze submission patterns
- Update email validation rules as needed
- Backup database regularly

### Troubleshooting
- Check Redis connection for rate limiting
- Verify database connections
- Monitor error logs
- Test API endpoints regularly
- Validate CSRF token generation


