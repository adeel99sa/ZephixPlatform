import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import { sequelize, defineAssociations } from './models';
import { CollaborationService } from './services/CollaborationService';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Import routes
import authRoutes from './api/auth';
import templateRoutes from './api/templates';
import documentRoutes from './api/documents';
import aiRoutes from './api/ai';
import organizationRoutes from './api/organizations';
import userRoutes from './api/users';

const app = express();
const server = createServer(app);

// Initialize collaboration service
const collaborationService = new CollaborationService(server);

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.frontend.url,
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/users', userRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Database initialization
async function initializeDatabase() {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Define model associations
    defineAssociations();

    // Sync database (in production, use migrations instead)
    if (config.env === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database synchronized successfully.');
    }
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
}

// Start server
async function startServer() {
  try {
    await initializeDatabase();

    server.listen(config.port, () => {
      console.log(`
🚀 BRD Template Management System
📡 Server running on port ${config.port}
🌍 Environment: ${config.env}
🔗 Frontend URL: ${config.frontend.url}
📊 Database: Connected
🔌 WebSocket: Ready for real-time collaboration
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await sequelize.close();
    console.log('Database connection closed');
    process.exit(0);
  });
});

// Start the application
startServer();