#!/usr/bin/env node

/**
 * Comprehensive Database Seeding Script for FixitQuick Admin Dashboard
 * 
 * This script creates realistic test data including:
 * - 10 Service Providers with diverse skills and profiles
 * - 5-10 Parts Providers with inventory
 * - Sample Orders in different states
 * - Additional specific services
 * - Sample Coupons and promotions
 */

import { storage } from '../server/storage.ts';

// Helper function to generate random values
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

// Cities in India for realistic data
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

// Service Provider Templates
const serviceProviderProfiles = [
  {
    firstName: 'Rajesh',
    lastName: 'Kumar',
    phone: '+919876543201',
    email: 'rajesh.kumar@example.com',
    skills: ['Electrician'],
    experience: 8,
    description: 'Expert electrical contractor with 8+ years experience in residential and commercial wiring, appliance repairs, and electrical installations.'
  },
  {
    firstName: 'Priya',
    lastName: 'Sharma',
    phone: '+919876543202', 
    email: 'priya.sharma@example.com',
    skills: ['Plumber'],
    experience: 6,
    description: 'Professional plumber specializing in bathroom fitting, pipe repairs, and water system installations with 6 years of experience.'
  },
  {
    firstName: 'Ahmed',
    lastName: 'Ali',
    phone: '+919876543203',
    email: 'ahmed.ali@example.com', 
    skills: ['Cleaner'],
    experience: 4,
    description: 'Professional cleaning service provider specializing in home deep cleaning, office maintenance, and specialized cleaning services.'
  },
  {
    firstName: 'Deepak',
    lastName: 'Patel',
    phone: '+919876543204',
    email: 'deepak.patel@example.com',
    skills: ['Carpentry'],
    experience: 10,
    description: 'Master carpenter with 10+ years experience in custom furniture, cabinet making, and home renovation projects.'
  },
  {
    firstName: 'Sunita',
    lastName: 'Singh',
    phone: '+919876543205',
    email: 'sunita.singh@example.com',
    skills: ['Pest Control'],
    experience: 5,
    description: 'Certified pest control specialist with expertise in residential and commercial pest management and eco-friendly treatments.'
  },
  {
    firstName: 'Vikram',
    lastName: 'Rao',
    phone: '+919876543206',
    email: 'vikram.rao@example.com',
    skills: ['Technology (Device Repair)'],
    experience: 7,
    description: 'Certified technician for mobile phones, laptops, and electronic device repairs with 7 years in the field.'
  },
  {
    firstName: 'Meera',
    lastName: 'Nair',
    phone: '+919876543207',
    email: 'meera.nair@example.com',
    skills: ['Beauty & Wellness'],
    experience: 5,
    description: 'Licensed beauty professional specializing in home beauty services, bridal makeup, and wellness treatments.'
  },
  {
    firstName: 'Ravi',
    lastName: 'Gupta',
    phone: '+919876543208',
    email: 'ravi.gupta@example.com',
    skills: ['Automotive'],
    experience: 12,
    description: 'Experienced automotive mechanic specializing in car and bike servicing, repairs, and maintenance with 12 years experience.'
  },
  {
    firstName: 'Anjali',
    lastName: 'Verma',
    phone: '+919876543209',
    email: 'anjali.verma@example.com',
    skills: ['Electrician', 'Appliance Repair'],
    experience: 9,
    description: 'Multi-skilled service provider specializing in electrical work and home appliance repairs and maintenance.'
  },
  {
    firstName: 'Mohammad',
    lastName: 'Khan',
    phone: '+919876543220',
    email: 'mohammad.khan@example.com',
    skills: ['Plumber', 'Carpentry'],
    experience: 8,
    description: 'Versatile home service professional with expertise in both plumbing and carpentry work for complete home solutions.'
  }
];

// Parts Provider Templates
const partsProviderProfiles = [
  {
    firstName: 'Suresh',
    lastName: 'Electricals',
    phone: '+919876540001',
    email: 'suresh.electricals@example.com',
    businessName: 'Suresh Electrical Supplies',
    businessType: 'individual',
    category: 'Electrical',
    description: 'Leading supplier of electrical components, wires, switches, and fixtures for residential and commercial projects.'
  },
  {
    firstName: 'Ramesh',
    lastName: 'Hardware',
    phone: '+919876540002', 
    email: 'ramesh.hardware@example.com',
    businessName: 'Ramesh Plumbing Supplies',
    businessType: 'partnership',
    category: 'Plumbing',
    description: 'Comprehensive plumbing supplies including pipes, fittings, fixtures, and bathroom accessories.'
  },
  {
    firstName: 'Kavita',
    lastName: 'Cleaners',
    phone: '+919876540003',
    email: 'kavita.cleaners@example.com', 
    businessName: 'Kavita Cleaning Solutions',
    businessType: 'individual',
    category: 'Cleaning',
    description: 'Professional grade cleaning supplies, chemicals, and equipment for residential and commercial use.'
  },
  {
    firstName: 'Dinesh',
    lastName: 'Woods',
    phone: '+919876540004',
    email: 'dinesh.woods@example.com',
    businessName: 'Dinesh Carpentry Materials',
    businessType: 'private_limited',
    category: 'Carpentry', 
    description: 'Quality wood, tools, hardware, and materials for all carpentry and furniture making needs.'
  },
  {
    firstName: 'Geeta',
    lastName: 'Pest Solutions',
    phone: '+919876540005',
    email: 'geeta.pestsolutions@example.com',
    businessName: 'Geeta Pest Control Products',
    businessType: 'individual',
    category: 'Pest Control',
    description: 'Safe and effective pest control products, equipment, and chemicals for professional and home use.'
  },
  {
    firstName: 'Tech',
    lastName: 'Parts Hub',
    phone: '+919876540006',
    email: 'tech.partshub@example.com',
    businessName: 'Tech Parts Hub',
    businessType: 'private_limited',
    category: 'Technology',
    description: 'Mobile phone parts, laptop components, and electronic device accessories and repair parts.'
  }
];

// Parts inventory data
const partsInventory = {
  'Electrical': [
    { name: 'LED Bulb 9W', price: 120, stock: 500, description: 'Energy efficient LED bulb, warm white light' },
    { name: 'Wall Switch 16A', price: 35, stock: 200, description: 'Modular wall switch, white finish' },
    { name: 'Ceiling Fan 48"', price: 2500, stock: 25, description: '48 inch ceiling fan with LED lights' },
    { name: 'Wire 2.5mm House Wire', price: 850, stock: 50, description: '90 meter copper wire roll' },
    { name: 'MCB 32A', price: 180, stock: 100, description: 'Miniature circuit breaker 32A' },
    { name: 'Socket 16A', price: 45, stock: 150, description: '3 pin modular socket outlet' },
    { name: 'Extension Board 6 Socket', price: 320, stock: 80, description: '6 socket extension board with surge protection' },
    { name: 'Tube Light 20W LED', price: 280, stock: 120, description: '4 feet LED tube light, cool white' }
  ],
  'Plumbing': [
    { name: 'PVC Pipe 4" x 3m', price: 280, stock: 200, description: 'PVC drainage pipe 4 inch diameter' },
    { name: 'Basin Mixer Tap', price: 1200, stock: 45, description: 'Chrome plated basin mixer tap' },
    { name: 'Toilet Seat', price: 800, stock: 30, description: 'White plastic toilet seat with soft close' },
    { name: 'Shower Head', price: 450, stock: 60, description: 'ABS plastic shower head with multiple settings' },
    { name: 'Gate Valve 15mm', price: 95, stock: 150, description: 'Brass gate valve for water control' },
    { name: 'Pipe Elbow 20mm', price: 12, stock: 500, description: 'PVC pipe elbow 90 degree' },
    { name: 'Water Tank 500L', price: 3500, stock: 12, description: 'Plastic water storage tank 500 liters' },
    { name: 'Washbasin', price: 2200, stock: 25, description: 'Ceramic wall mounted washbasin' }
  ],
  'Cleaning': [
    { name: 'Floor Cleaner 5L', price: 180, stock: 80, description: 'Multi-surface floor cleaner concentrate' },
    { name: 'Toilet Cleaner', price: 85, stock: 120, description: 'Powerful toilet bowl cleaner' },
    { name: 'Glass Cleaner Spray', price: 65, stock: 100, description: 'Streak-free glass and mirror cleaner' },
    { name: 'Microfiber Cloth Pack', price: 250, stock: 200, description: 'Pack of 6 microfiber cleaning cloths' },
    { name: 'Vacuum Bags Universal', price: 120, stock: 150, description: 'Universal vacuum cleaner bags pack of 5' },
    { name: 'Dish Wash Liquid 1L', price: 95, stock: 180, description: 'Concentrated dish washing liquid' },
    { name: 'Room Freshener', price: 75, stock: 100, description: 'Long lasting room air freshener spray' },
    { name: 'Scrub Pad Heavy Duty', price: 25, stock: 300, description: 'Heavy duty scrubbing pad for tough stains' }
  ],
  'Carpentry': [
    { name: 'Wood Screws Pack', price: 145, stock: 200, description: 'Assorted wood screws pack of 100' },
    { name: 'Wood Glue 250ml', price: 120, stock: 80, description: 'High strength wood adhesive' },
    { name: 'Sandpaper Assorted', price: 180, stock: 150, description: 'Assorted grit sandpaper pack' },
    { name: 'Door Handle Set', price: 350, stock: 60, description: 'Stainless steel door handle with lock' },
    { name: 'Hinges 4" Heavy Duty', price: 85, stock: 120, description: 'Heavy duty door hinges stainless steel' },
    { name: 'Wood Stain 500ml', price: 280, stock: 40, description: 'Premium wood stain and finish' },
    { name: 'Drill Bits Set', price: 450, stock: 35, description: 'Professional drill bit set for wood' },
    { name: 'Cabinet Hardware Kit', price: 650, stock: 25, description: 'Complete cabinet door and drawer hardware' }
  ],
  'Pest Control': [
    { name: 'Ant Killer Gel', price: 120, stock: 100, description: 'Professional ant killer gel bait' },
    { name: 'Cockroach Spray', price: 185, stock: 80, description: 'Long lasting cockroach killer spray' },
    { name: 'Rat Poison Blocks', price: 95, stock: 150, description: 'Effective rat poison bait blocks' },
    { name: 'Termite Treatment', price: 850, stock: 30, description: 'Professional termite treatment chemical' },
    { name: 'Mosquito Coils', price: 45, stock: 200, description: 'Natural mosquito repellent coils pack of 10' },
    { name: 'Spider Control Spray', price: 165, stock: 60, description: 'Targeted spider control insecticide' },
    { name: 'Fly Trap Sticky', price: 35, stock: 180, description: 'Sticky fly trap sheets pack of 5' },
    { name: 'Pest Detector Device', price: 1200, stock: 15, description: 'Electronic pest detection device' }
  ],
  'Technology': [
    { name: 'Phone Screen Protector', price: 150, stock: 300, description: 'Tempered glass screen protector universal' },
    { name: 'Phone Charging Cable', price: 250, stock: 200, description: 'USB-C charging and data cable' },
    { name: 'Laptop Keyboard', price: 850, stock: 45, description: 'Replacement laptop keyboard universal' },
    { name: 'Phone Battery', price: 650, stock: 80, description: 'Smartphone replacement battery' },
    { name: 'Screen Cleaning Kit', price: 120, stock: 150, description: 'Screen cleaning solution and microfiber cloth' },
    { name: 'USB Port Hub', price: 280, stock: 100, description: '4 port USB 3.0 hub' },
    { name: 'Phone Case Universal', price: 180, stock: 250, description: 'Shock proof phone case universal size' },
    { name: 'Laptop Cooling Pad', price: 950, stock: 30, description: 'Laptop cooling pad with dual fans' }
  ]
};

async function seedComprehensiveData() {
  console.log('🌱 Starting comprehensive database seeding...');
  
  try {
    // 1. Create Service Provider Users
    console.log('👷 Creating service provider users...');
    const serviceProviderIds = [];
    
    for (const profile of serviceProviderProfiles) {
      const location = randomChoice(indianCities);
      
      const user = await storage.createUser({
        email: profile.email,
        phone: profile.phone,
        firstName: profile.firstName,
        lastName: profile.lastName,
        role: 'service_provider',
        isVerified: true,
        walletBalance: randomFloat(100, 2000).toFixed(2),
        fixiPoints: randomInt(50, 500),
        location: {
          address: `${randomInt(1, 999)} ${randomChoice(['MG Road', 'Park Street', 'Main Road', 'Gandhi Nagar', 'Sector 1'])}, ${location.city}`,
          latitude: location.lat + randomFloat(-0.1, 0.1),
          longitude: location.lng + randomFloat(-0.1, 0.1),
          city: location.city,
          pincode: location.pincode
        },
        isActive: true
      });
      
      serviceProviderIds.push(user.id);
      console.log(`✅ Created service provider: ${profile.firstName} ${profile.lastName}`);
      
      // Create service provider profile
      await storage.createServiceProvider({
        userId: user.id,
        businessName: `${profile.firstName}'s ${profile.skills[0]} Services`,
        businessType: 'individual',
        experienceYears: profile.experience,
        description: profile.description,
        serviceAreas: [location.city],
        skills: profile.skills,
        hourlyRate: randomFloat(200, 800).toFixed(2),
        availabilityStatus: randomChoice(['available', 'busy', 'unavailable']),
        averageRating: randomFloat(3.5, 5.0).toFixed(2),
        totalBookings: randomInt(10, 200),
        completionRate: randomFloat(85, 99).toFixed(2),
        responseTimeMinutes: randomInt(15, 120),
        verificationStatus: 'approved',
        isVerified: true,
        profileImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
      });
    }
    
    // 2. Create Parts Provider Users
    console.log('📦 Creating parts provider users...');
    const partsProviderIds = [];
    
    for (const profile of partsProviderProfiles) {
      const location = randomChoice(indianCities);
      
      const user = await storage.createUser({
        email: profile.email,
        phone: profile.phone,
        firstName: profile.firstName,
        lastName: profile.lastName,
        role: 'parts_provider',
        isVerified: true,
        walletBalance: randomFloat(5000, 25000).toFixed(2),
        fixiPoints: randomInt(100, 1000),
        location: {
          address: `${randomInt(1, 999)} ${randomChoice(['Industrial Area', 'Market Street', 'Commerce Hub', 'Trade Center'])}, ${location.city}`,
          latitude: location.lat + randomFloat(-0.1, 0.1),
          longitude: location.lng + randomFloat(-0.1, 0.1),
          city: location.city,
          pincode: location.pincode
        },
        isActive: true
      });
      
      partsProviderIds.push(user.id);
      console.log(`✅ Created parts provider: ${profile.businessName}`);
      
      // Create parts provider business info
      await storage.createPartsProviderBusinessInfo({
        userId: user.id,
        businessName: profile.businessName,
        businessType: profile.businessType,
        businessAddress: {
          street: `${randomInt(1, 999)} ${randomChoice(['Industrial Area', 'Market Street', 'Commerce Hub'])}`,
          city: location.city,
          state: location.state,
          pincode: location.pincode,
          country: 'India'
        },
        gstNumber: '29' + randomInt(100000000, 999999999) + '1ZN',
        panNumber: 'ABCDE' + randomInt(1000, 9999) + 'F',
        isVerified: true,
        verificationStatus: 'approved',
        minOrderValue: randomFloat(100, 500).toFixed(2),
        processingTime: 24,
        shippingAreas: [location.city, location.state],
        paymentTerms: 'immediate',
        totalRevenue: randomFloat(50000, 500000).toFixed(2),
        totalOrders: randomInt(50, 500),
        averageRating: randomFloat(4.0, 5.0).toFixed(2),
        totalProducts: 0,
        isActive: true
      });
    }
    
    // 3. Create Parts Inventory
    console.log('🔧 Creating parts inventory...');
    
    for (let i = 0; i < partsProviderIds.length; i++) {
      const providerId = partsProviderIds[i];
      const category = Object.keys(partsInventory)[i % Object.keys(partsInventory).length];
      const parts = partsInventory[category];
      
      for (const part of parts) {
        const createdPart = await storage.createPart({
          name: part.name,
          description: part.description,
          category: category,
          providerId: providerId,
          price: part.price.toString(),
          costPrice: (part.price * 0.7).toFixed(2),
          stockQuantity: part.stock,
          minimumStockLevel: Math.max(1, Math.floor(part.stock * 0.1)),
          sku: category.substring(0, 3).toUpperCase() + randomInt(1000, 9999),
          isActive: true,
          imageUrls: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop'],
          specifications: { warranty: randomChoice(['1 month', '3 months', '6 months', '1 year']) },
          weight: randomFloat(0.1, 5.0).toString(),
          dimensions: { length: randomInt(5, 50), width: randomInt(5, 50), height: randomInt(5, 50), unit: 'cm' }
        });
        console.log(`✅ Created part: ${part.name}`);
      }
    }

    // 4. Create Sample Orders with different states
    console.log('📝 Creating sample orders...');
    
    // Get existing user IDs to create orders for
    const existingUsers = await storage.getUsersByRole('user');
    const orderStatuses = ['pending_assignment', 'matching', 'assigned', 'in_progress', 'completed', 'cancelled'];
    const services = await storage.getServices();
    
    for (let i = 0; i < 20; i++) {
      const userId = randomChoice(existingUsers).id;
      const providerId = randomChoice(serviceProviderIds);
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
      console.log(`✅ Created order: ${service.name} - ${status}`);
    }

    // 5. Create Sample Coupons
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
      }
    ];
    
    for (const coupon of coupons) {
      const createdCoupon = await storage.createCoupon({
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        minOrderValue: coupon.minOrderValue,
        isActive: coupon.isActive,
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
        usageLimit: randomInt(50, 1000),
        usageCount: randomInt(0, 100)
      });
      console.log(`✅ Created coupon: ${coupon.code}`);
    }

    console.log('✅ Comprehensive database seeding completed successfully!');
    console.log(`Created:
    - ${serviceProviderProfiles.length} Service Providers
    - ${partsProviderProfiles.length} Parts Providers  
    - ${Object.values(partsInventory).flat().length * partsProviderProfiles.length} Parts
    - 20 Sample Orders
    - ${coupons.length} Coupons`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Execute the seeding
seedComprehensiveData()
  .then(() => {
    console.log('🎉 Database seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });