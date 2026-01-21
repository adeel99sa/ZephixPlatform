# How to Get Railway Values for .env.test

## Step 1: Get DATABASE_URL from zephix-postgres-test

1. In Railway dashboard, click on **"Variables"** tab (in the navigation bar)
2. Look for `DATABASE_URL` or `DATABASE_PUBLIC_URL` variable
3. Click the eye icon or copy button to reveal the value
4. Copy the entire connection string

**Expected format:**
```
postgresql://postgres:password@yamabiko.proxy.rlwy.net:5432/railway
```

## Step 2: Get JWT_SECRET from zephix-backend (test environment)

1. Go back to your Railway project
2. Click on `zephix-backend` service
3. **Important:** Make sure you're in the **"test"** environment (check dropdown at top)
4. Click **"Variables"** tab
5. Find `JWT_SECRET` variable
6. Copy the value

## Step 3: Fill .env.test File

Open `zephix-backend/.env.test` and paste the values:

```bash
DATABASE_URL=postgresql://postgres:password@yamabiko.proxy.rlwy.net:5432/railway
JWT_SECRET=your-jwt-secret-value-here
NODE_ENV=test
```

**Save the file.**

## Step 4: Verify and Run

```bash
cd zephix-backend

# Verify connection
./scripts/verify-test-db.sh

# Run migrations
npm run migration:run:test

# Run tests
npm run test:integration:bulk
```

## Important Notes

- ✅ The hostname `yamabiko.proxy.rlwy.net` confirms this is Railway
- ✅ Make sure you're copying from `zephix-postgres-test`, not production Postgres
- ✅ Make sure JWT_SECRET is from `test` environment, not `production`
- ✅ Never commit `.env.test` to git (it's already gitignored)
