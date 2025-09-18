#!/usr/bin/env node

/**
 * Focused script to create Orders and Coupons
 * This completes the seeding process where the main script left off
 */

import { storage } from '../server/storage.ts';

// Helper functions
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Cities for realistic addresses
const indianCities = [
  { city: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777, pincode: '400001' },
  { city: 'Delhi', state: 'Delhi', lat: 28.7041, lng: 77.1025, pincode: '110001' },
  { city: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946, pincode: '560001' },
  { city: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867, pincode: '500001' },
  { city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, pincode: '600001' },
  { city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, pincode: '411001' },
  { city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, pincode: '700001' },
  { city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, pincode: '302001' }
];

async function seedOrdersAndCoupons() {
  console.log('🌱 Starting orders and coupons seeding...');
  
  try {
    // Get existing data
    console.log('📊 Getting existing data...');
    const existingUsers = await storage.getUsersByRole('user');
    const serviceProviders = await storage.getUsersByRole('service_provider');
    const services = await storage.getServices();
    
    console.log(`Found: ${existingUsers.length} users, ${serviceProviders.length} service providers, ${services.length} services`);

    // 1. Create Sample Orders
    console.log('📝 Creating sample orders...');
    
    const orderStatuses = ['pending_assignment', 'matching', 'assigned', 'in_progress', 'completed', 'cancelled'];
    
    for (let i = 0; i < 20; i++) {
      const userId = randomChoice(existingUsers).id;
      const providerId = randomChoice(serviceProviders).id;
      const status = randomChoice(orderStatuses);
      const location = randomChoice(indianCities);
      const service = randomChoice(services);
      
      const orderDate = randomDate(new Date(2024, 0, 1), new Date());
      const acceptDeadline = new Date(orderDate.getTime() + 5 * 60 * 1000); // 5 minutes from creation
      const basePrice = parseFloat(service.basePrice || '500');
      const serviceFee = randomFloat(20, 100);
      const totalAmount = basePrice + serviceFee;
      
      const order = await storage.createOrder({
        userId: userId,
        serviceId: service.id,
        providerId: status !== 'pending_assignment' ? providerId : null,
        status: status,
        acceptDeadlineAt: acceptDeadline,
        acceptedAt: status === 'assigned' || status === 'in_progress' || status === 'completed' ? 
          new Date(orderDate.getTime() + randomInt(1, 4) * 60 * 1000) : null,
        meta: {
          basePrice: basePrice,
          totalAmount: totalAmount,
          serviceFee: serviceFee,
          taxes: Math.round(totalAmount * 0.05 * 100) / 100, // 5% tax
          notes: randomChoice(['Please call before arriving', 'Handle with care', 'Urgent service needed', '']),
          customerNotes: randomChoice(['Ring the doorbell twice', 'Use the service entrance', 'Call upon arrival', '']),
          estimatedDuration: randomInt(60, 240), // 1-4 hours in minutes
          urgencyLevel: randomChoice(['normal', 'urgent']),
          paymentMethod: randomChoice(['online', 'cod', 'wallet']),
          paymentStatus: randomChoice(['pending', 'paid', 'failed']),
          location: {
            address: `${randomInt(1, 999)} ${randomChoice(['MG Road', 'Park Street', 'Main Road'])}, ${location.city}`,
            latitude: location.lat + randomFloat(-0.01, 0.01),
            longitude: location.lng + randomFloat(-0.01, 0.01),
            instructions: randomChoice(['Near Metro Station', 'Opposite Mall', 'Behind School', ''])
          }
        }
      });
      console.log(`✅ Created order ${i + 1}/20: ${service.name} - ${status}`);
    }

    // 2. Create Sample Coupons
    console.log('🎟️ Creating sample coupons...');
    
    const coupons = [
      {
        code: 'WELCOME50',
        name: 'Welcome Discount',
        description: 'Get 50 rupees off on your first service booking',
        type: 'fixed',
        value: '50.00',
        minOrderValue: '200.00',
        isActive: true,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2025-12-31')
      },
      {
        code: 'SAVE20',
        name: '20% Off',
        description: '20% discount on all electrical services',
        type: 'percentage',
        value: '20.00',
        minOrderValue: '500.00',
        isActive: true,
        validFrom: new Date('2024-06-01'),
        validUntil: new Date('2025-06-30')
      },
      {
        code: 'PLUMBER15',
        name: 'Plumbing Special',
        description: '15% off on plumbing services',
        type: 'percentage',
        value: '15.00',
        minOrderValue: '300.00',
        isActive: true,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-12-31')
      },
      {
        code: 'EXPIRED10',
        name: 'Expired Offer',
        description: '10% discount - expired offer',
        type: 'percentage',
        value: '10.00',
        minOrderValue: '250.00',
        isActive: false,
        validFrom: new Date('2023-01-01'),
        validUntil: new Date('2023-12-31')
      },
      {
        code: 'CLEAN100',
        name: 'Cleaning Bonus',
        description: '100 rupees off on deep cleaning services',
        type: 'fixed',
        value: '100.00',
        minOrderValue: '800.00',
        isActive: true,
        validFrom: new Date('2024-09-01'),
        validUntil: new Date('2025-03-31')
      },
      {
        code: 'NEWUSER25',
        name: 'New User Special',
        description: '25% off for new users on any service',
        type: 'percentage',
        value: '25.00',
        minOrderValue: '400.00',
        isActive: true,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2025-12-31')
      },
      {
        code: 'CARPENTER200',
        name: 'Carpentry Discount',
        description: 'Flat 200 rupees off on carpentry services',
        type: 'fixed',
        value: '200.00',
        minOrderValue: '1000.00',
        isActive: true,
        validFrom: new Date('2024-08-01'),
        validUntil: new Date('2024-12-31')
      }
    ];
    
    for (const coupon of coupons) {
      const createdCoupon = await storage.createCoupon({
        code: coupon.code,
        title: coupon.name, // title is required
        name: coupon.name,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        minOrderValue: coupon.minOrderValue,
        isActive: coupon.isActive,
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
        usageLimit: randomInt(50, 1000),
        usageCount: randomInt(0, 50),
        createdBy: 'dede9a5b-cb3d-41a4-b423-46133d47ad86' // Admin user ID for created_by
      });
      console.log(`✅ Created coupon: ${coupon.code}`);
    }

    console.log('✅ Orders and coupons seeding completed successfully!');
    console.log(`Created:
    - 20 Sample Orders in various states
    - ${coupons.length} Coupons (active and expired)`);
    
  } catch (error) {
    console.error('❌ Error seeding orders and coupons:', error);
    throw error;
  }
}

// Execute the seeding
seedOrdersAndCoupons()
  .then(() => {
    console.log('🎉 Orders and coupons seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });