const { Pool } = require('pg');

class DatabaseService {
  constructor() {
    this.pool = null;
    this.init();
  }

  init() {
    // Railway PostgreSQL connection
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    
    if (!connectionString) {
      console.error('❌ No database connection string found');
      console.log('💡 Set DATABASE_URL or POSTGRES_URL environment variable');
      console.log('🚀 Server will start without database connection');
      return;
    }

    try {
      this.pool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000, // Increased timeout
      });

      this.pool.on('error', (err) => {
        console.error('❌ Database pool error:', err.message);
      });

      this.pool.on('connect', () => {
        console.log('✅ Database client connected');
      });

      console.log('🔗 Database connection pool initialized');
    } catch (error) {
      console.error('❌ Failed to initialize database pool:', error.message);
      console.log('🚀 Server will start without database connection');
    }
  }

  async query(text, params) {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('📊 Query executed:', { duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('❌ Database query error:', error);
      throw error;
    }
  }

  async transaction(callback) {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck() {
    try {
      if (!this.pool) {
        return {
          status: 'unhealthy',
          message: 'Database not initialized',
          timestamp: new Date().toISOString(),
        };
      }

      const start = Date.now();
      const result = await this.pool.query('SELECT NOW() as timestamp, version() as version');
      const latency = Date.now() - start;

      return {
        status: 'healthy',
        latency: `${latency}ms`,
        timestamp: result.rows[0].timestamp,
        version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1],
        connections: {
          total: this.pool.totalCount,
          idle: this.pool.idleCount,
          waiting: this.pool.waitingCount,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('🔌 Database connection pool closed');
    }
  }
}

// Export singleton instance
const databaseService = new DatabaseService();
module.exports = { DatabaseService: databaseService };