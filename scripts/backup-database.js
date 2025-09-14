#!/usr/bin/env node

/**
 * Database Backup Script for FixitQuick
 * 
 * This script creates a backup of the current database state
 * before performing production migrations.
 */

const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function createBackup() {
  const client = new Client({ connectionString: DATABASE_URL });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  const backupFile = path.join(backupDir, `fixitquick-backup-${timestamp}.json`);

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // Ensure backup directory exists
    await fs.mkdir(backupDir, { recursive: true });

    const backup = {
      timestamp,
      version: '1.0.0',
      data: {}
    };

    // List of tables to backup
    const tables = [
      'users',
      'service_categories', 
      'services',
      'parts_categories',
      'parts',
      'service_providers',
      'orders',
      'wallet_transactions',
      'payment_methods',
      'stripe_customers',
      'payment_intents',
      'reviews',
      'notifications',
      'coupons',
      'chat_messages',
      'otp_challenges',
      'user_sessions',
      'app_settings'
    ];

    console.log('📦 Creating backup...');

    for (const table of tables) {
      try {
        const result = await client.query(`SELECT * FROM ${table}`);
        backup.data[table] = result.rows;
        console.log(`✅ Backed up ${table}: ${result.rows.length} records`);
      } catch (error) {
        if (error.code === '42P01') { // Table doesn't exist
          console.log(`⚠️  Table ${table} doesn't exist, skipping`);
          backup.data[table] = [];
        } else {
          throw error;
        }
      }
    }

    // Save backup to file
    await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));
    console.log(`💾 Backup saved to: ${backupFile}`);

    // Create a summary
    const totalRecords = Object.values(backup.data).reduce((sum, table) => sum + table.length, 0);
    console.log(`📊 Backup summary: ${totalRecords} total records across ${tables.length} tables`);

    return backupFile;
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('🚀 Starting FixitQuick database backup...');
  
  try {
    const backupFile = await createBackup();
    console.log('✅ Backup completed successfully!');
    console.log(`📁 Backup location: ${backupFile}`);
    
    console.log('\n📋 Next steps:');
    console.log('1. Keep this backup file safe');
    console.log('2. Run `node scripts/reset-to-production.js` to clean database for production');
    console.log('3. Test the application with empty state');
    
  } catch (error) {
    console.error('💥 Backup process failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { createBackup };