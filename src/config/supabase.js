const { createClient } = require('@supabase/supabase-js');

// Supabase Configuration
class SupabaseService {
  constructor() {
    this.client = null;
    this.initialized = false;
    this.init();
  }

  init() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.log('⚠️  Supabase credentials not found, using PostgreSQL only');
      console.log('💡 Set SUPABASE_URL and SUPABASE_SERVICE_KEY for full Supabase integration');
      return;
    }

    try {
      this.client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      this.initialized = true;
      console.log('✅ Supabase client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Supabase client:', error.message);
    }
  }

  // Check if Supabase is available
  isAvailable() {
    return this.initialized && this.client;
  }

  // Get Supabase client
  getClient() {
    if (!this.isAvailable()) {
      throw new Error('Supabase client not initialized');
    }
    return this.client;
  }

  // Database operations using Supabase
  async query(tableName) {
    if (!this.isAvailable()) {
      throw new Error('Supabase not available');
    }
    return this.client.from(tableName);
  }

  // Storage operations
  async uploadFile(bucket, fileName, file, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('Supabase not available');
    }

    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        ...options
      });

    if (error) {
      throw new Error(`File upload failed: ${error.message}`);
    }

    return data;
  }

  // Get file URL
  getFileUrl(bucket, fileName) {
    if (!this.isAvailable()) {
      throw new Error('Supabase not available');
    }

    const { data } = this.client.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  // Real-time subscriptions
  subscribe(tableName, callback, filter = '*') {
    if (!this.isAvailable()) {
      throw new Error('Supabase not available');
    }

    return this.client
      .channel(`${tableName}_changes`)
      .on('postgres_changes', 
        { event: filter, schema: 'public', table: tableName }, 
        callback
      )
      .subscribe();
  }

  // Authentication (if using Supabase auth)
  async signUp(email, password, metadata = {}) {
    if (!this.isAvailable()) {
      throw new Error('Supabase not available');
    }

    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });

    if (error) {
      throw new Error(`Sign up failed: ${error.message}`);
    }

    return data;
  }

  async signIn(email, password) {
    if (!this.isAvailable()) {
      throw new Error('Supabase not available');
    }

    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error(`Sign in failed: ${error.message}`);
    }

    return data;
  }

  // Health check
  async healthCheck() {
    if (!this.isAvailable()) {
      return {
        status: 'unavailable',
        message: 'Supabase client not initialized',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // Test connection by trying to read from users table
      const { data, error } = await this.client
        .from('users')
        .select('id')
        .limit(1);

      if (error) {
        return {
          status: 'unhealthy',
          message: error.message,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        status: 'healthy',
        message: 'Supabase connection active',
        timestamp: new Date().toISOString(),
        features: {
          database: true,
          storage: true,
          realtime: true,
          auth: true,
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
}

// Export singleton instance
const supabaseService = new SupabaseService();
module.exports = { supabaseService, SupabaseService };