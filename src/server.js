const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { DatabaseService } = require('./config/database');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const clientsRoutes = require('./routes/clients');
const suppliersRoutes = require('./routes/suppliers');
const designersRoutes = require('./routes/designers');
const projectsRoutes = require('./routes/projects');
const conversationsRoutes = require('./routes/conversations');
const verificationRoutes = require('./routes/verification');
const uploadsRoutes = require('./routes/uploads');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://wid-uganda-platform-4oh57u1g1-ptr234s-projects.vercel.app',
    /\.vercel\.app$/,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression and logging
app.use(compression());
app.use(morgan('combined'));

// Health check endpoint
app.use('/api/health', healthRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/designers', designersRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/uploads', uploadsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'WID Uganda Platform Backend API',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      clients: '/api/clients',
      suppliers: '/api/suppliers',
      designers: '/api/designers',
      projects: '/api/projects',
      conversations: '/api/conversations',
      verification: '/api/verification',
      uploads: '/api/uploads',
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      '/api/health',
      '/api/auth',
      '/api/users',
      '/api/clients',
      '/api/suppliers',
      '/api/designers',
      '/api/projects',
      '/api/conversations',
      '/api/verification',
      '/api/uploads',
    ],
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  // Database errors
  if (error.code === '23505') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Resource already exists',
    });
  }
  
  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.message,
    });
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token',
    });
  }
  
  // Default error
  res.status(error.status || 500).json({
    error: error.name || 'Internal Server Error',
    message: error.message || 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
});

// Database connection and server startup
async function startServer() {
  try {
    // Test database connection
    const healthCheck = await DatabaseService.healthCheck();
    console.log('Database health check:', healthCheck);
    
    if (healthCheck.status === 'healthy') {
      console.log('✅ Database connected successfully');
    } else {
      console.log('⚠️  Database connection issues, but starting server anyway');
    }
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 WID Uganda Backend API running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 CORS enabled for frontend domains`);
      console.log(`🔒 Security middleware active`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();