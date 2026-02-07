/**
 * Remy Finance API Server
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/env';
import routes from './routes';
import { errorHandler, logger, authenticate } from './middleware';
import { healthCheck } from './config/database';
import './services/cronJobs'; // Initialize background tasks

const app = express();

// Security & Optimization
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware
app.use(logger);
app.use(authenticate); // Applied globally for this MVP scaffolding

// API Routes
app.use(config.server.apiPrefix, routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use(errorHandler);

/**
 * Start Server
 */
async function start() {
  console.log('🚀 Starting Remy Finance API...');
  
  try {
    // Check DB connection
    const isDbConnected = await healthCheck();
    if (!isDbConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }
    console.log('✅ Database connected');
    
    // Start listening
    app.listen(config.server.port, () => {
      console.log(`✅ Server running in ${config.server.env} mode`);
      console.log(`📡 Listening at http://localhost:${config.server.port}${config.server.apiPrefix}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

export default app;
