#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

// Test Supabase configuration with the provided API key
async function testSupabaseConfig() {
  console.log('🔍 Testing Supabase configuration...\n');
  
  const apiKey = 'sb_secret_jjvNmp96bCkk3zMn5yTdwg_ER3dV9-Z';
  
  // Extract potential project ID from the API key
  const keyParts = apiKey.split('_');
  console.log('🔑 API Key format:', keyParts[0] + '_' + keyParts[1] + '_[hidden]');
  console.log('🆔 Potential project ID from key:', keyParts[2]?.substring(0, 8) + '...\n');
  
  // Common Supabase URL patterns to test
  const possibleUrls = [
    `https://jjvnmp96bckk3zmn5ytdwg.supabase.co`,
    `https://jjvnmp96bckk3zMn5yTdwg.supabase.co`,
    `https://jjvNmp96bCkk3zMn5yTdwg.supabase.co`,
  ];
  
  for (const url of possibleUrls) {
    console.log(`🌐 Testing URL: ${url}`);
    
    try {
      const client = createClient(url, apiKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      
      // Test connection
      const { data, error } = await client
        .from('test')
        .select('*')
        .limit(1);
        
      if (error && !error.message.includes('relation "test" does not exist')) {
        console.log('❌ Connection failed:', error.message);
      } else {
        console.log('✅ Connection successful!');
        console.log('📊 Response:', { data, error: error?.message });
        
        // Try to get project info
        try {
          const { data: healthData } = await client.rest.get('/');
          console.log('🏥 Health check successful');
        } catch (healthError) {
          console.log('⚠️  Health check:', healthError.message);
        }
        
        console.log('\n🎯 VALID CONFIGURATION:');
        console.log(`SUPABASE_URL=${url}`);
        console.log(`SUPABASE_SERVICE_KEY=${apiKey}`);
        console.log(`DATABASE_URL=postgresql://postgres:[password]@db.${url.split('https://')[1]}/postgres`);
        return;
      }
    } catch (testError) {
      console.log('❌ Test failed:', testError.message);
    }
    console.log('');
  }
  
  console.log('❌ No valid configuration found with provided API key');
  console.log('\n💡 To get the correct configuration:');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to Settings → API');
  console.log('4. Copy the Project URL and API keys');
}

testSupabaseConfig().catch(console.error);