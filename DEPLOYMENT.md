# BRD Template Management System - Production Deployment Guide

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/brd-template-system.git
cd brd-template-system

# Set up environment variables
cp deploy/production.env .env
# Edit .env with your production values

# Deploy to production
./deploy/deploy.sh production
```

## 📋 Prerequisites

### Required Services
- **AWS Account** with the following services:
  - ECS (Elastic Container Service)
  - ECR (Elastic Container Registry)
  - RDS (PostgreSQL 14+)
  - ElastiCache (Redis 6+)
  - CloudFront
  - S3
  - SES (Simple Email Service)
  - Route 53 (for DNS)

### Required Tools
- Docker 20+
- AWS CLI v2
- Node.js 18+
- Git

### Required Secrets
Set these in GitHub Secrets or your CI/CD platform:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `DB_PASSWORD`
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `SENTRY_DSN`
- `SEGMENT_WRITE_KEY`
- `SLACK_WEBHOOK_URL`

## 🏗️ Infrastructure Setup

### 1. Database (RDS PostgreSQL)
```sql
-- Create production database
CREATE DATABASE brd_system_prod;
CREATE USER brd_admin WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE brd_system_prod TO brd_admin;
```

### 2. Redis (ElastiCache)
- Create Redis cluster with encryption in transit
- Enable automatic backups
- Set up parameter group with maxmemory-policy: allkeys-lru

### 3. S3 Buckets
```bash
# Create uploads bucket
aws s3 mb s3://brd-system-uploads --region us-east-1

# Set bucket policy for CloudFront access
aws s3api put-bucket-policy --bucket brd-system-uploads --policy file://s3-policy.json
```

### 4. CloudFront Distribution
- Origin: S3 bucket for frontend static files
- Behaviors: 
  - `/api/*` → Backend ALB
  - `/socket.io/*` → Backend ALB (WebSocket)
  - `/*` → S3 Origin

## 🚢 Deployment Process

### Automated Deployment (Recommended)

The system uses GitHub Actions for CI/CD:

1. **Push to main branch** triggers deployment
2. **Tests run** automatically
3. **Docker images built** and pushed to ECR
4. **ECS services updated** with new images
5. **Database migrations** run automatically
6. **Health checks** verify deployment
7. **Slack notification** sent on completion

### Manual Deployment

```bash
# 1. Build and push Docker images
docker build -t brd-backend:latest ./backend
docker build -t brd-frontend:latest ./frontend

# 2. Tag and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REPO
docker tag brd-backend:latest $ECR_REPO/brd-backend:latest
docker push $ECR_REPO/brd-backend:latest

# 3. Update ECS service
aws ecs update-service --cluster production --service brd-backend --force-new-deployment

# 4. Run migrations
aws ecs run-task --cluster production --task-definition brd-migrate

# 5. Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

## 🔒 Security Checklist

- [ ] All secrets in AWS Secrets Manager
- [ ] Database encrypted at rest
- [ ] SSL/TLS certificates configured
- [ ] WAF rules enabled on CloudFront
- [ ] Security groups properly configured
- [ ] IAM roles follow least privilege
- [ ] Backup strategy implemented
- [ ] Monitoring alerts configured

## 📊 Monitoring & Alerts

### CloudWatch Dashboards
- **Application Dashboard**: API latency, error rates, throughput
- **Infrastructure Dashboard**: CPU, memory, disk usage
- **Business Dashboard**: User signups, document creation, feature usage

### Alerts Configuration
```yaml
Critical Alerts (PagerDuty):
- API error rate > 5%
- Database CPU > 80%
- Response time > 3s

Warning Alerts (Slack):
- Disk usage > 70%
- Memory usage > 75%
- Failed login attempts > 100/hour
```

## 🔧 Post-Deployment

### 1. Verify Deployment
```bash
# Check health endpoints
curl https://api.brd.yourdomain.com/health
curl https://brd.yourdomain.com

# Check logs
aws logs tail /aws/ecs/brd-backend --follow

# Verify database migrations
psql -h $DB_HOST -U brd_admin -d brd_system_prod -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"
```

### 2. Smoke Tests
```bash
# Run automated smoke tests
npm run test:e2e:production

# Manual checks:
# - Create a new user account
# - Create a template
# - Create a document
# - Test real-time collaboration
# - Submit feedback
```

### 3. Performance Testing
```bash
# Run load tests
artillery run tests/load/production.yml
```

## 🚨 Rollback Procedure

If issues are detected:

```bash
# 1. Revert ECS service to previous task definition
aws ecs update-service --cluster production --service brd-backend --task-definition brd-backend:PREVIOUS_REVISION

# 2. Restore database if needed
aws rds restore-db-instance-from-db-snapshot --db-instance-identifier brd-system-prod-restore --db-snapshot-identifier SNAPSHOT_ID

# 3. Clear CloudFront cache
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"

# 4. Notify team
./scripts/notify-rollback.sh
```

## 📱 Mobile Considerations

The frontend is fully responsive. For mobile apps:
- API endpoints are CORS-enabled
- WebSocket connections supported
- JWT authentication works across platforms
- File upload limits adjusted for mobile

## 🌍 Scaling

### Horizontal Scaling
- ECS services auto-scale based on CPU/memory
- RDS read replicas for read-heavy workloads
- ElastiCache cluster mode for Redis scaling

### Vertical Scaling
- Upgrade RDS instance class during maintenance window
- Increase ECS task CPU/memory allocations

## 📞 Support

### Issues During Deployment
1. Check CloudWatch logs
2. Review Sentry for errors
3. Contact DevOps team in #devops Slack channel
4. Escalate to on-call engineer if critical

### Useful Commands
```bash
# View running tasks
aws ecs list-tasks --cluster production --service-name brd-backend

# SSH into container (debugging)
aws ecs execute-command --cluster production --task TASK_ID --container backend --interactive --command "/bin/sh"

# Database backup
aws rds create-db-snapshot --db-instance-identifier brd-system-prod --db-snapshot-identifier manual-backup-$(date +%Y%m%d)
```

## 🎉 Success Criteria

Deployment is considered successful when:
- ✅ All health checks pass
- ✅ No error spike in monitoring
- ✅ Smoke tests pass
- ✅ Real-time features working
- ✅ AI features responding
- ✅ No performance degradation

---

**Note**: Always deploy to staging first and run full regression tests before production deployment.