#!/usr/bin/env node
/**
 * Generate bcrypt hash for admin password  
 * Usage: node scripts/generate-admin-hash.js "your-password"
 */
import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/generate-admin-hash.js "your-password"');
  process.exit(1);
}

const saltRounds = 10;
const hash = bcrypt.hashSync(password, saltRounds);

console.log('\n🔐 Admin Password Hash Generated');
console.log('=================================');
console.log('Password:', password);
console.log('Hash:', hash);
console.log('\n📝 Add this to your Replit Secrets:');
console.log('Key: ADMIN_PASSWORD_HASH');
console.log('Value:', hash);
console.log('\nAlso add:');
console.log('Key: ADMIN_EMAIL');
console.log('Value: nainspagal@gmail.com');