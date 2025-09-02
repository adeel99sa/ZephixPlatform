import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

const app = express();
app.use(express.json());

console.log('Connecting to:', process.env.DATABASE_URL);

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: true,
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await AppDataSource.query(
      `INSERT INTO users (email, password, first_name, last_name, created_at, updated_at, is_active)
       VALUES ($1, $2, $3, $4, NOW(), NOW(), true) 
       RETURNING id, email, first_name, last_name`,
      [email, hashedPassword, firstName, lastName],
    );

    res.json({ success: true, user: result[0] });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: AppDataSource.isInitialized });
});

AppDataSource.initialize()
  .then(() => {
    console.log('Database connected');
    app.listen(3000, () =>
      console.log('Server running on http://localhost:3000'),
    );
    console.log('Test with: curl http://localhost:3000/health');
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });
