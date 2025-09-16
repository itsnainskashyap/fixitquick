#!/usr/bin/env node
/**
 * Debug admin environment variables
 */
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

console.log('🔍 Debugging Admin Environment Variables');
console.log('==========================================');
console.log('ADMIN_EMAIL exists:', !!ADMIN_EMAIL);
console.log('ADMIN_EMAIL length:', ADMIN_EMAIL?.length || 0);
console.log('ADMIN_EMAIL configured:', !!ADMIN_EMAIL);
console.log('ADMIN_PASSWORD_HASH exists:', !!ADMIN_PASSWORD_HASH);
console.log('ADMIN_PASSWORD_HASH length:', ADMIN_PASSWORD_HASH?.length || 0);
console.log('ADMIN_PASSWORD_HASH format check:', ADMIN_PASSWORD_HASH?.startsWith('$2b$') ? 'Valid bcrypt' : 'Invalid format');
console.log('DEV_ADMIN_ENABLED exists:', !!DEV_ADMIN_ENABLED);
console.log('DEV_ADMIN_ENABLED value:', DEV_ADMIN_ENABLED);
console.log('DEV_ADMIN_ENABLED should be:', 'true');

// Test email comparison
const testEmail = 'nainspagal@gmail.com';
console.log('\n🧪 Email Comparison Test');
console.log('Test email:', `"${testEmail}"`);
console.log('Emails match:', testEmail === ADMIN_EMAIL);
console.log('Emails match (trimmed):', testEmail.trim() === ADMIN_EMAIL?.trim());

// Test password comparison
const testPassword = 'Sinha@1357';
console.log('\n🧪 Password Hash Test');
console.log('Test password:', testPassword);

if (ADMIN_PASSWORD_HASH) {
  try {
    const isValid = await bcrypt.compare(testPassword, ADMIN_PASSWORD_HASH);
    console.log('Password hash valid:', isValid);
    
    // Test with generated hash to ensure bcrypt is working
    const newHash = bcrypt.hashSync(testPassword, 10);
    const newHashValid = await bcrypt.compare(testPassword, newHash);
    console.log('New hash test (should be true):', newHashValid);
  } catch (error) {
    console.error('Bcrypt error:', error);
  }
} else {
  console.log('No password hash to test');
}