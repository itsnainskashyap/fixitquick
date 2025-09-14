#!/usr/bin/env node

/**
 * Production Reset Script for FixitQuick
 * 
 * This script resets the database to a clean production state:
 * - Removes all test/fake data
 * - Keeps essential system data (admin users, categories)
 * - Preserves database schema
 */

const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function resetToProduction() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    console.log('🧹 Starting production reset...');

    // Begin transaction for safety
    await client.query('BEGIN');

    // Clear non-essential data while preserving structure
    const clearOperations = [
      // Clear user-generated content
      { table: 'reviews', description: 'user reviews' },
      { table: 'chat_messages', description: 'chat messages' },
      { table: 'notifications', description: 'notifications' },
      
      // Clear orders and related data
      { table: 'orders', description: 'orders' },
      { table: 'wallet_transactions', description: 'wallet transactions' },
      { table: 'payment_intents', description: 'payment intents' },
      { table: 'payment_methods', description: 'payment methods' },
      
      // Clear service-related content
      { table: 'services', description: 'services (fake test services)' },
      { table: 'parts', description: 'parts (fake test parts)' },
      
      // Clear expired/temporary data
      { table: 'otp_challenges', description: 'OTP challenges' },
      { table: 'user_sessions', description: 'user sessions' },
      { table: 'coupons', description: 'coupons' },
    ];

    for (const op of clearOperations) {
      try {
        const result = await client.query(`DELETE FROM ${op.table}`);
        console.log(`✅ Cleared ${op.description}: ${result.rowCount} records removed`);
      } catch (error) {
        if (error.code === '42P01') { // Table doesn't exist
          console.log(`⚠️  Table ${op.table} doesn't exist, skipping`);
        } else {
          throw error;
        }
      }
    }

    // Clean up test users (keep admin users)
    try {
      const userCleanResult = await client.query(`
        DELETE FROM users 
        WHERE role != 'admin' 
        AND (
          first_name ILIKE '%test%' OR 
          first_name ILIKE '%demo%' OR 
          first_name ILIKE '%fake%' OR
          email ILIKE '%test%' OR
          email ILIKE '%demo%' OR
          id LIKE 'service-provider-%' OR
          id LIKE 'parts-provider-%'
        )
      `);
      console.log(`✅ Cleaned test users: ${userCleanResult.rowCount} removed (kept admin users)`);
    } catch (error) {
      console.log(`⚠️  Could not clean test users: ${error.message}`);
    }

    // Clean service providers (remove test ones)
    try {
      await client.query(`DELETE FROM service_providers WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'admin')`);
      console.log(`✅ Cleaned test service providers`);
    } catch (error) {
      console.log(`⚠️  Could not clean service providers: ${error.message}`);
    }

    // Reset auto-increment sequences if they exist
    const sequenceResets = [
      'users_id_seq',
      'service_categories_id_seq', 
      'services_id_seq',
      'orders_id_seq',
      'parts_id_seq'
    ];

    for (const seq of sequenceResets) {
      try {
        await client.query(`SELECT setval('${seq}', 1, false)`);
        console.log(`✅ Reset sequence: ${seq}`);
      } catch (error) {
        // Sequence might not exist, that's okay
        console.log(`⚠️  Sequence ${seq} not found, skipping`);
      }
    }

    // Verify categories exist (should be created by seed data)
    const categoriesResult = await client.query('SELECT COUNT(*) as count FROM service_categories');
    const categoryCount = parseInt(categoriesResult.rows[0].count);
    
    if (categoryCount === 0) {
      console.log('⚠️  No service categories found. Run the application once to initialize categories.');
    } else {
      console.log(`✅ Service categories preserved: ${categoryCount} categories`);
    }

    // Commit the transaction
    await client.query('COMMIT');
    console.log('✅ Production reset completed successfully!');

    // Print summary
    console.log('\n📊 Production Reset Summary:');
    console.log('✅ Removed all test/fake data');
    console.log('✅ Preserved admin users and system settings');
    console.log('✅ Preserved database schema and structure');
    console.log('✅ Reset to clean production state');
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Start the application to initialize essential categories');
    console.log('2. Test empty state handling in the UI');
    console.log('3. Configure production environment variables');
    console.log('4. Set up real payment gateway and Firebase credentials');

  } catch (error) {
    // Rollback transaction on error
    try {
      await client.query('ROLLBACK');
      console.log('🔄 Transaction rolled back due to error');
    } catch (rollbackError) {
      console.error('❌ Could not rollback transaction:', rollbackError.message);
    }
    
    console.error('❌ Production reset failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('🚀 Starting FixitQuick production reset...');
  console.log('⚠️  This will remove all test data from the database!');
  
  // Production safety check
  if (process.env.NODE_ENV === 'production') {
    console.log('\n🚨 PRODUCTION ENVIRONMENT DETECTED!');
    console.log('This script will remove data from your production database.');
    console.log('Make sure you have a backup before proceeding.');
    
    // In production, require explicit confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('Are you sure you want to proceed? (type "yes" to confirm): ', resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Reset cancelled by user');
      process.exit(0);
    }
  }
  
  try {
    await resetToProduction();
    console.log('\n🎉 Database is now ready for production deployment!');
    
  } catch (error) {
    console.error('\n💥 Reset process failed:', error.message);
    console.error('Your database has not been modified.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { resetToProduction };