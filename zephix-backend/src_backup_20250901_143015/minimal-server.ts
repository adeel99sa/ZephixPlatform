import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { DataSource } from 'typeorm';

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

console.log('Connecting to:', process.env.DATABASE_URL);

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: true,
});

// ============ AUTH ENDPOINTS ============

// Signup endpoint
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, organizationName } = req.body;

    // Check if user exists
    const existing = await AppDataSource.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()],
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create organization
    const org = await AppDataSource.query(
      `INSERT INTO organizations (name, created_at, updated_at)
       VALUES ($1, NOW(), NOW()) 
       RETURNING id, name`,
      [organizationName || `${firstName}'s Organization`],
    );

    // Create user
    const result = await AppDataSource.query(
      `INSERT INTO users (email, password, first_name, last_name, organization_id, created_at, updated_at, is_active)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), true) 
       RETURNING id, email, first_name, last_name`,
      [email.toLowerCase(), hashedPassword, firstName, lastName, org[0].id],
    );

    const token = jwt.sign(
      { id: result[0].id, email: result[0].email },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    res.json({
      success: true,
      token,
      user: {
        id: result[0].id,
        email: result[0].email,
        firstName: result[0].first_name,
        lastName: result[0].last_name,
        organizationId: org[0].id,
        organizationName: org[0].name,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = await AppDataSource.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()],
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, users[0].password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: users[0].id, email: users[0].email },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    res.json({
      success: true,
      token,
      user: {
        id: users[0].id,
        email: users[0].email,
        firstName: users[0].first_name,
        lastName: users[0].last_name,
        organizationId: users[0].organization_id,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ RESOURCE ENDPOINTS ============

// Resource heat map - YOUR KEY FEATURE
app.get('/api/resources/heat-map', async (req, res) => {
  try {
    // Get date range from query params or default to current quarter
    const startDate = req.query.startDate || '2025-01-01';
    const endDate = req.query.endDate || '2025-03-31';

    const result = await AppDataSource.query(
      `
      SELECT 
        r.id,
        r.name,
        r.email,
        r.default_capacity,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'project_id', ra.project_id,
              'project_name', p.name,
              'allocation', ra.allocation_percentage,
              'start_date', ra.start_date,
              'end_date', ra.end_date
            )
          ) FILTER (WHERE ra.id IS NOT NULL), 
          '[]'::json
        ) as allocations,
        COALESCE(SUM(ra.allocation_percentage), 0) as total_allocation,
        CASE 
          WHEN COALESCE(SUM(ra.allocation_percentage), 0) > 120 THEN 'critical'
          WHEN COALESCE(SUM(ra.allocation_percentage), 0) > 100 THEN 'over'
          WHEN COALESCE(SUM(ra.allocation_percentage), 0) > 80 THEN 'high'
          WHEN COALESCE(SUM(ra.allocation_percentage), 0) > 60 THEN 'medium'
          ELSE 'low'
        END as utilization_level
      FROM resources r
      LEFT JOIN resource_allocations ra ON r.id = ra.resource_id
        AND ra.start_date <= $2::date
        AND ra.end_date >= $1::date
      LEFT JOIN projects p ON ra.project_id = p.id
      GROUP BY r.id, r.name, r.email, r.default_capacity
      ORDER BY total_allocation DESC
    `,
      [startDate, endDate],
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create resource
app.post('/api/resources', async (req, res) => {
  try {
    const { name, email, skills, defaultCapacity } = req.body;
    const result = await AppDataSource.query(
      `INSERT INTO resources (name, email, skills, default_capacity, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [name, email, JSON.stringify(skills || []), defaultCapacity || 40],
    );
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PROJECT ENDPOINTS ============

// Create project
app.post('/api/projects', async (req, res) => {
  try {
    const { name, description, startDate, endDate, organizationId } = req.body;
    const result = await AppDataSource.query(
      `INSERT INTO projects (name, description, start_date, end_date, organization_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [name, description, startDate, endDate, organizationId],
    );
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List projects
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await AppDataSource.query(`
      SELECT p.*, 
             COUNT(DISTINCT ra.resource_id) as resource_count,
             COUNT(DISTINCT t.id) as task_count
      FROM projects p
      LEFT JOIN resource_allocations ra ON p.id = ra.project_id
      LEFT JOIN tasks t ON p.id = t.project_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ RESOURCE ALLOCATION ENDPOINTS ============

// Allocate resource to project
app.post('/api/allocations', async (req, res) => {
  try {
    const { resourceId, projectId, allocationPercentage, startDate, endDate } =
      req.body;

    // Check current allocation
    const current = await AppDataSource.query(
      `
      SELECT SUM(allocation_percentage) as total
      FROM resource_allocations
      WHERE resource_id = $1
        AND start_date <= $3
        AND end_date >= $2
    `,
      [resourceId, startDate, endDate],
    );

    const currentTotal = parseFloat(current[0]?.total || 0);
    const newTotal = currentTotal + allocationPercentage;

    if (newTotal > 150) {
      return res.status(400).json({
        error: 'Allocation exceeds maximum threshold',
        currentAllocation: currentTotal,
        requested: allocationPercentage,
        maximum: 150,
      });
    }

    const result = await AppDataSource.query(
      `INSERT INTO resource_allocations 
       (resource_id, project_id, allocation_percentage, start_date, end_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [resourceId, projectId, allocationPercentage, startDate, endDate],
    );

    res.json({
      allocation: result[0],
      warning:
        newTotal > 100 ? `Resource is now at ${newTotal}% allocation` : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ UTILITY ENDPOINTS ============

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: AppDataSource.isInitialized,
    timestamp: new Date().toISOString(),
  });
});

// Database test
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await AppDataSource.query(
      'SELECT NOW() as time, COUNT(*) as user_count FROM users',
    );
    res.json({
      connected: true,
      serverTime: result[0].time,
      userCount: result[0].user_count,
    });
  } catch (error) {
    res.status(500).json({ connected: false, error: error.message });
  }
});

// ============ START SERVER ============

AppDataSource.initialize()
  .then(() => {
    console.log('✅ Database connected successfully');
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log('');
      console.log('📝 Available endpoints:');
      console.log('  POST /api/auth/signup     - Create new user');
      console.log('  POST /api/auth/login      - Login user');
      console.log(
        '  GET  /api/resources/heat-map - Resource utilization heat map',
      );
      console.log('  POST /api/resources       - Create resource');
      console.log('  POST /api/projects        - Create project');
      console.log('  GET  /api/projects        - List projects');
      console.log('  POST /api/allocations     - Allocate resource to project');
      console.log('  GET  /health              - Health check');
      console.log('  GET  /api/test-db         - Test database connection');
      console.log('');
      console.log('🧪 Test with:');
      console.log('  curl http://localhost:3000/health');
      console.log('');
      console.log('📊 Test heat map with date range:');
      console.log(
        '  curl "http://localhost:3000/api/resources/heat-map?startDate=2025-01-01&endDate=2025-03-31"',
      );
    });
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });
