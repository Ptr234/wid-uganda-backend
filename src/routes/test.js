const express = require('express');
const { supabaseService } = require('../config/supabase');

const router = express.Router();

// Test endpoint to verify full stack integration
router.get('/', async (req, res) => {
  try {
    const testResults = {
      timestamp: new Date().toISOString(),
      backend: {
        status: 'healthy',
        environment: process.env.NODE_ENV || 'development',
        deployment: 'render',
        version: '1.0.0'
      },
      supabase: {
        status: 'unknown',
        connection: false,
        features: {}
      },
      database: {
        tables: [],
        userCount: 0,
        projectCount: 0
      }
    };

    // Test Supabase connection
    if (supabaseService.isAvailable()) {
      testResults.supabase.status = 'available';
      testResults.supabase.connection = true;
      testResults.supabase.features = {
        database: true,
        storage: true,
        realtime: true,
        auth: true
      };

      try {
        // Test database queries
        const { data: users, error: usersError } = await supabaseService.client
          .from('users')
          .select('id, email, role, created_at')
          .limit(5);

        if (!usersError && users) {
          testResults.database.tables.push('users');
          testResults.database.userCount = users.length;
          testResults.database.sampleUsers = users.map(user => ({
            id: user.id,
            email: user.email,
            role: user.role,
            created_at: user.created_at
          }));
        }

        const { data: projects, error: projectsError } = await supabaseService.client
          .from('projects')
          .select('id, title, status, created_at')
          .limit(5);

        if (!projectsError && projects) {
          testResults.database.tables.push('projects');
          testResults.database.projectCount = projects.length;
          testResults.database.sampleProjects = projects.map(project => ({
            id: project.id,
            title: project.title,
            status: project.status,
            created_at: project.created_at
          }));
        }

        // Test storage
        try {
          const { data: buckets } = await supabaseService.client.storage.listBuckets();
          testResults.supabase.storage = {
            status: 'healthy',
            buckets: buckets?.map(bucket => bucket.name) || []
          };
        } catch (storageError) {
          testResults.supabase.storage = {
            status: 'error',
            message: storageError.message
          };
        }

      } catch (dbError) {
        testResults.database.error = dbError.message;
      }
    } else {
      testResults.supabase.status = 'unavailable';
      testResults.supabase.connection = false;
    }

    // Overall system status
    if (testResults.supabase.connection && testResults.database.tables.length > 0) {
      testResults.overall = 'fully_operational';
    } else if (testResults.supabase.connection) {
      testResults.overall = 'supabase_connected';
    } else {
      testResults.overall = 'backend_only';
    }

    res.json({
      message: 'WID Uganda Platform - Full Stack Test',
      success: true,
      ...testResults
    });

  } catch (error) {
    res.status(500).json({
      message: 'Test endpoint error',
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint for frontend connectivity
router.get('/frontend', (req, res) => {
  res.json({
    message: 'Frontend connectivity test successful',
    backend_url: req.get('host'),
    frontend_origin: req.get('origin') || 'unknown',
    cors_enabled: true,
    timestamp: new Date().toISOString(),
    headers: {
      'user-agent': req.get('user-agent'),
      'referer': req.get('referer'),
      'origin': req.get('origin')
    }
  });
});

// Test database operations
router.post('/database', async (req, res) => {
  try {
    if (!supabaseService.isAvailable()) {
      return res.status(503).json({
        error: 'Supabase not available',
        success: false
      });
    }

    // Create a test user
    const testUser = {
      email: `test-${Date.now()}@wid-uganda.org`,
      password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      full_name: 'Test User',
      role: 'designer'
    };

    const { data, error } = await supabaseService.client
      .from('users')
      .insert([testUser])
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: 'Database insert failed',
        details: error.message,
        success: false
      });
    }

    res.json({
      message: 'Database test successful',
      success: true,
      created_user: {
        id: data.id,
        email: data.email,
        role: data.role,
        created_at: data.created_at
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Database test failed',
      details: error.message,
      success: false
    });
  }
});

module.exports = router;