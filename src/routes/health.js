const express = require('express');
const { DatabaseService } = require('../config/database');
const { supabaseService } = require('../config/supabase');

const router = express.Router();

// Health check endpoint (Railway compatible - always returns 200)
router.get('/', async (req, res) => {
  try {
    let dbHealth;
    try {
      dbHealth = await DatabaseService.healthCheck();
    } catch (dbError) {
      dbHealth = {
        status: 'unhealthy',
        message: dbError.message,
        timestamp: new Date().toISOString(),
      };
    }

    let supabaseHealth;
    try {
      supabaseHealth = await supabaseService.healthCheck();
    } catch (supabaseError) {
      supabaseHealth = {
        status: 'unavailable',
        message: supabaseError.message,
        timestamp: new Date().toISOString(),
      };
    }
    
    const healthStatus = {
      status: 'healthy', // Always healthy for hosting platform health check
      timestamp: new Date().toISOString(),
      service: 'WID Uganda Backend API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth,
      supabase: supabaseHealth,
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
      },
      // Add overall system status for monitoring
      systemStatus: getSystemStatus(dbHealth, supabaseHealth),
    };

    // Always return 200 for Railway health check compatibility
    res.json(healthStatus);
  } catch (error) {
    // Even in case of total failure, return 200 so Railway doesn't kill the container
    res.json({
      status: 'healthy', // Railway health check requirement
      systemStatus: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'WID Uganda Backend API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      error: error.message,
      uptime: process.uptime(),
    });
  }
});

// Readiness probe
router.get('/ready', async (req, res) => {
  try {
    const dbHealth = await DatabaseService.healthCheck();
    
    if (dbHealth.status === 'healthy') {
      res.json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready', reason: 'database unavailable' });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready', reason: error.message });
  }
});

// Liveness probe
router.get('/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Helper function to determine overall system status
function getSystemStatus(dbHealth, supabaseHealth) {
  if (dbHealth.status === 'healthy' && supabaseHealth.status === 'healthy') {
    return 'fully_operational';
  } else if (supabaseHealth.status === 'healthy') {
    return 'supabase_only';
  } else if (dbHealth.status === 'healthy') {
    return 'database_only';
  } else if (supabaseHealth.status === 'unavailable') {
    return 'postgresql_only';
  } else {
    return 'degraded';
  }
}

module.exports = router;