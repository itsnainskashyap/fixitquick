#!/usr/bin/env node

/**
 * URGENT DATA SEEDING FIX: Create missing subcategories and services
 * 
 * This script fixes the critical "0 sub" and "0 services" issue by creating:
 * - Level 1 subcategories under each main category
 * - Realistic services under each subcategory with Indian pricing
 * - Proper hierarchical relationships
 */

import { db } from '../server/db.ts';
import { serviceCategories, services } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Helper function to create slug from name
function createSlug(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Helper function to generate ID
function generateId() {
  return crypto.randomUUID();
}

// Comprehensive subcategories and services data structure
const subcategoriesAndServices = {
  'Electrician': {
    icon: '⚡',
    subcategories: [
      {
        name: 'Electrical Installation',
        icon: '🔌',
        description: 'New electrical installations and setups',
        services: [
          {
            name: 'Home Electrical Wiring',
            description: 'Complete house electrical wiring installation',
            basePrice: 1500,
            estimatedDuration: 240,
            icon: '🏠',
            iconValue: '🏠'
          },
          {
            name: 'New Connection Setup',
            description: 'New electrical meter and connection setup',
            basePrice: 800,
            estimatedDuration: 180,
            icon: '⚡',
            iconValue: '⚡'
          },
          {
            name: 'Socket Installation',
            description: 'Installation of new electrical sockets and outlets',
            basePrice: 300,
            estimatedDuration: 60,
            icon: '🔌',
            iconValue: '🔌'
          },
          {
            name: 'Circuit Breaker Installation',
            description: 'Install and configure circuit breakers',
            basePrice: 600,
            estimatedDuration: 120,
            icon: '⚙️',
            iconValue: '⚙️'
          }
        ]
      },
      {
        name: 'Electrical Repair',
        icon: '🔧',
        description: 'Electrical fault diagnosis and repairs',
        services: [
          {
            name: 'Power Outage Repair',
            description: 'Fix electrical outages and power issues',
            basePrice: 500,
            estimatedDuration: 90,
            icon: '💡',
            iconValue: '💡'
          },
          {
            name: 'Short Circuit Repair',
            description: 'Identify and fix short circuit problems',
            basePrice: 400,
            estimatedDuration: 120,
            icon: '⚡',
            iconValue: '⚡'
          },
          {
            name: 'Switch Repair',
            description: 'Repair faulty electrical switches',
            basePrice: 200,
            estimatedDuration: 45,
            icon: '🔘',
            iconValue: '🔘'
          }
        ]
      },
      {
        name: 'Light Fixture Installation',
        icon: '💡',
        description: 'Installation of lights and fixtures',
        services: [
          {
            name: 'LED Light Installation',
            description: 'Install LED lights and panels',
            basePrice: 400,
            estimatedDuration: 75,
            icon: '💡',
            iconValue: '💡'
          },
          {
            name: 'Chandelier Installation',
            description: 'Installation of decorative chandeliers',
            basePrice: 800,
            estimatedDuration: 120,
            icon: '🏮',
            iconValue: '🏮'
          },
          {
            name: 'Tube Light Installation',
            description: 'Install tube lights and fixtures',
            basePrice: 300,
            estimatedDuration: 60,
            icon: '💡',
            iconValue: '💡'
          }
        ]
      },
      {
        name: 'Ceiling Fan Installation',
        icon: '🌪️',
        description: 'Ceiling fan installation and maintenance',
        services: [
          {
            name: 'New Fan Installation',
            description: 'Install new ceiling fans with proper wiring',
            basePrice: 600,
            estimatedDuration: 90,
            icon: '🌪️',
            iconValue: '🌪️'
          },
          {
            name: 'Fan Repair Service',
            description: 'Repair faulty ceiling fans',
            basePrice: 350,
            estimatedDuration: 60,
            icon: '🔧',
            iconValue: '🔧'
          },
          {
            name: 'Fan Speed Regulator Fix',
            description: 'Repair or replace fan speed regulators',
            basePrice: 200,
            estimatedDuration: 45,
            icon: '⚙️',
            iconValue: '⚙️'
          }
        ]
      }
    ]
  },
  'Plumber': {
    icon: '🔧',
    subcategories: [
      {
        name: 'Pipe Installation & Repair',
        icon: '🚰',
        description: 'Water pipe installation and repair services',
        services: [
          {
            name: 'Water Pipe Installation',
            description: 'New water pipeline installation for homes',
            basePrice: 1200,
            estimatedDuration: 180,
            icon: '🚰',
            iconValue: '🚰'
          },
          {
            name: 'Pipe Leak Repair',
            description: 'Fix leaking water pipes',
            basePrice: 400,
            estimatedDuration: 75,
            icon: '💧',
            iconValue: '💧'
          },
          {
            name: 'PVC Pipe Fitting',
            description: 'Install and fit PVC water pipes',
            basePrice: 600,
            estimatedDuration: 120,
            icon: '🔧',
            iconValue: '🔧'
          }
        ]
      },
      {
        name: 'Bathroom Plumbing',
        icon: '🛁',
        description: 'Complete bathroom plumbing solutions',
        services: [
          {
            name: 'Toilet Installation',
            description: 'Install new toilet seats and fittings',
            basePrice: 800,
            estimatedDuration: 120,
            icon: '🚽',
            iconValue: '🚽'
          },
          {
            name: 'Shower Installation',
            description: 'Install shower heads and faucets',
            basePrice: 600,
            estimatedDuration: 90,
            icon: '🚿',
            iconValue: '🚿'
          },
          {
            name: 'Bathroom Tap Repair',
            description: 'Fix dripping taps and faucets',
            basePrice: 300,
            estimatedDuration: 60,
            icon: '🚰',
            iconValue: '🚰'
          }
        ]
      },
      {
        name: 'Kitchen Plumbing',
        icon: '🏠',
        description: 'Kitchen water supply and drainage solutions',
        services: [
          {
            name: 'Kitchen Sink Installation',
            description: 'Install kitchen sinks with proper drainage',
            basePrice: 700,
            estimatedDuration: 105,
            icon: '🍽️',
            iconValue: '🍽️'
          },
          {
            name: 'Water Filter Connection',
            description: 'Connect and install water purification systems',
            basePrice: 500,
            estimatedDuration: 90,
            icon: '💧',
            iconValue: '💧'
          }
        ]
      },
      {
        name: 'Drain Cleaning',
        icon: '🌊',
        description: 'Professional drain cleaning and unclogging',
        services: [
          {
            name: 'Drain Unclogging',
            description: 'Remove blockages from drains and pipes',
            basePrice: 400,
            estimatedDuration: 75,
            icon: '🌊',
            iconValue: '🌊'
          },
          {
            name: 'Sewer Line Cleaning',
            description: 'Clean main sewer lines and drainage',
            basePrice: 800,
            estimatedDuration: 150,
            icon: '🚰',
            iconValue: '🚰'
          }
        ]
      }
    ]
  },
  'Beauty & Spa': {
    icon: '💄',
    subcategories: [
      {
        name: 'Hair Cut & Styling',
        icon: '✂️',
        description: 'Professional hair cutting and styling services',
        services: [
          {
            name: 'Men\'s Haircut',
            description: 'Professional men\'s hair cutting service',
            basePrice: 300,
            estimatedDuration: 45,
            icon: '✂️',
            iconValue: '✂️'
          },
          {
            name: 'Women\'s Haircut & Style',
            description: 'Ladies hair cutting and styling',
            basePrice: 600,
            estimatedDuration: 90,
            icon: '💇',
            iconValue: '💇'
          },
          {
            name: 'Hair Color Service',
            description: 'Professional hair coloring and highlights',
            basePrice: 1200,
            estimatedDuration: 120,
            icon: '🎨',
            iconValue: '🎨'
          }
        ]
      },
      {
        name: 'Facial Treatments',
        icon: '🧴',
        description: 'Skin care and facial treatment services',
        services: [
          {
            name: 'Basic Facial Cleanup',
            description: 'Deep cleansing facial treatment',
            basePrice: 800,
            estimatedDuration: 75,
            icon: '🧴',
            iconValue: '🧴'
          },
          {
            name: 'Anti-Aging Facial',
            description: 'Specialized anti-aging facial treatment',
            basePrice: 1500,
            estimatedDuration: 90,
            icon: '✨',
            iconValue: '✨'
          }
        ]
      },
      {
        name: 'Bridal Makeup',
        icon: '👰',
        description: 'Wedding and bridal makeup services',
        services: [
          {
            name: 'Bridal Makeup Package',
            description: 'Complete bridal makeup for wedding day',
            basePrice: 2000,
            estimatedDuration: 180,
            icon: '👰',
            iconValue: '👰'
          },
          {
            name: 'Pre-Wedding Makeup',
            description: 'Makeup for pre-wedding ceremonies',
            basePrice: 1200,
            estimatedDuration: 120,
            icon: '💄',
            iconValue: '💄'
          }
        ]
      }
    ]
  },
  'Carpentry': {
    icon: '🔨',
    subcategories: [
      {
        name: 'Furniture Repair',
        icon: '🪑',
        description: 'Repair and restoration of furniture',
        services: [
          {
            name: 'Chair Repair',
            description: 'Fix broken chairs and furniture',
            basePrice: 400,
            estimatedDuration: 90,
            icon: '🪑',
            iconValue: '🪑'
          },
          {
            name: 'Table Repair',
            description: 'Repair dining and office tables',
            basePrice: 600,
            estimatedDuration: 120,
            icon: '📱',
            iconValue: '📱'
          }
        ]
      },
      {
        name: 'Custom Furniture Making',
        icon: '🛠️',
        description: 'Custom furniture design and creation',
        services: [
          {
            name: 'Custom Bookshelf',
            description: 'Design and build custom bookshelves',
            basePrice: 1800,
            estimatedDuration: 360,
            icon: '📚',
            iconValue: '📚'
          },
          {
            name: 'Wardrobe Creation',
            description: 'Custom wardrobe design and construction',
            basePrice: 2500,
            estimatedDuration: 480,
            icon: '👗',
            iconValue: '👗'
          }
        ]
      },
      {
        name: 'Door & Window Installation',
        icon: '🚪',
        description: 'Door and window fitting services',
        services: [
          {
            name: 'Door Installation',
            description: 'Install new doors with proper fitting',
            basePrice: 800,
            estimatedDuration: 120,
            icon: '🚪',
            iconValue: '🚪'
          },
          {
            name: 'Window Frame Repair',
            description: 'Repair wooden window frames',
            basePrice: 500,
            estimatedDuration: 90,
            icon: '🪟',
            iconValue: '🪟'
          }
        ]
      }
    ]
  },
  'Appliance Repair': {
    icon: '⚙️',
    subcategories: [
      {
        name: 'Washing Machine Repair',
        icon: '👕',
        description: 'Washing machine repair and maintenance',
        services: [
          {
            name: 'Washing Machine Service',
            description: 'Complete washing machine repair service',
            basePrice: 600,
            estimatedDuration: 90,
            icon: '👕',
            iconValue: '👕'
          },
          {
            name: 'Drain Pump Replacement',
            description: 'Replace faulty washing machine drain pump',
            basePrice: 800,
            estimatedDuration: 120,
            icon: '🔧',
            iconValue: '🔧'
          }
        ]
      },
      {
        name: 'Refrigerator Repair',
        icon: '❄️',
        description: 'Refrigerator and freezer repair services',
        services: [
          {
            name: 'Refrigerator Gas Filling',
            description: 'Refill refrigerator cooling gas',
            basePrice: 1000,
            estimatedDuration: 75,
            icon: '❄️',
            iconValue: '❄️'
          },
          {
            name: 'Compressor Repair',
            description: 'Repair refrigerator compressor issues',
            basePrice: 1500,
            estimatedDuration: 150,
            icon: '⚙️',
            iconValue: '⚙️'
          }
        ]
      },
      {
        name: 'Air Conditioner Repair',
        icon: '🌡️',
        description: 'AC repair and maintenance services',
        services: [
          {
            name: 'AC Service & Cleaning',
            description: 'Complete AC cleaning and maintenance',
            basePrice: 800,
            estimatedDuration: 120,
            icon: '🌡️',
            iconValue: '🌡️'
          },
          {
            name: 'AC Gas Refilling',
            description: 'Refill AC cooling gas',
            basePrice: 1200,
            estimatedDuration: 90,
            icon: '❄️',
            iconValue: '❄️'
          }
        ]
      }
    ]
  },
  'Painting Services': {
    icon: '🎨',
    subcategories: [
      {
        name: 'Interior Painting',
        icon: '🏠',
        description: 'Interior wall painting services',
        services: [
          {
            name: 'Room Wall Painting',
            description: 'Professional interior room painting',
            basePrice: 1500,
            estimatedDuration: 360,
            icon: '🎨',
            iconValue: '🎨'
          },
          {
            name: 'Ceiling Painting',
            description: 'Ceiling painting and touch-up services',
            basePrice: 800,
            estimatedDuration: 180,
            icon: '🏠',
            iconValue: '🏠'
          }
        ]
      },
      {
        name: 'Exterior Painting',
        icon: '🏘️',
        description: 'Exterior wall and building painting',
        services: [
          {
            name: 'House Exterior Painting',
            description: 'Complete exterior house painting',
            basePrice: 2500,
            estimatedDuration: 480,
            icon: '🏘️',
            iconValue: '🏘️'
          }
        ]
      }
    ]
  },
  'Pest Control': {
    icon: '🐛',
    subcategories: [
      {
        name: 'Termite Control',
        icon: '🐜',
        description: 'Termite detection and elimination',
        services: [
          {
            name: 'Termite Treatment',
            description: 'Professional termite elimination service',
            basePrice: 1200,
            estimatedDuration: 180,
            icon: '🐜',
            iconValue: '🐜'
          },
          {
            name: 'Wood Protection Treatment',
            description: 'Protect wooden furniture from termites',
            basePrice: 800,
            estimatedDuration: 120,
            icon: '🪵',
            iconValue: '🪵'
          }
        ]
      },
      {
        name: 'General Pest Control',
        icon: '🦟',
        description: 'General pest elimination services',
        services: [
          {
            name: 'Cockroach Control',
            description: 'Eliminate cockroaches from premises',
            basePrice: 600,
            estimatedDuration: 90,
            icon: '🪳',
            iconValue: '🪳'
          },
          {
            name: 'Mosquito Control',
            description: 'Mosquito elimination and prevention',
            basePrice: 500,
            estimatedDuration: 75,
            icon: '🦟',
            iconValue: '🦟'
          }
        ]
      }
    ]
  }
};

async function fixSubcategoriesAndServices() {
  console.log('🚀 Starting URGENT subcategories and services seeding fix...\n');
  
  try {
    // Step 1: Get all existing main categories
    console.log('📁 Fetching existing main categories...');
    const mainCategories = await db.select()
      .from(serviceCategories)
      .where(eq(serviceCategories.level, 0));
      
    console.log(`✅ Found ${mainCategories.length} main categories\n`);
    
    // Step 2: Process each main category
    for (const mainCategory of mainCategories) {
      console.log(`🔄 Processing category: ${mainCategory.name}`);
      
      // Check if we have subcategory data for this main category
      const subcategoryData = subcategoriesAndServices[mainCategory.name];
      if (!subcategoryData) {
        console.log(`⚠️ No subcategory data found for ${mainCategory.name}, skipping...`);
        continue;
      }
      
      // Step 3: Create subcategories for this main category
      console.log(`📂 Creating ${subcategoryData.subcategories.length} subcategories for ${mainCategory.name}...`);
      
      for (let i = 0; i < subcategoryData.subcategories.length; i++) {
        const subcatData = subcategoryData.subcategories[i];
        
        // Create subcategory
        const subcategoryPayload = {
          id: generateId(),
          name: subcatData.name,
          slug: createSlug(subcatData.name),
          icon: subcatData.icon,
          description: subcatData.description,
          level: 1, // Level 1 = subcategory
          parentId: mainCategory.id, // Link to main category
          sortOrder: i + 1,
          isActive: true,
          serviceCount: subcatData.services.length,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        console.log(`  📂 Creating subcategory: ${subcatData.name}`);
        const [newSubcategory] = await db.insert(serviceCategories)
          .values(subcategoryPayload)
          .returning();
        
        // Step 4: Create services for this subcategory
        console.log(`  🛠️ Creating ${subcatData.services.length} services for ${subcatData.name}...`);
        
        for (let j = 0; j < subcatData.services.length; j++) {
          const serviceData = subcatData.services[j];
          
          const servicePayload = {
            id: generateId(),
            categoryId: newSubcategory.id, // Link to subcategory
            name: serviceData.name,
            slug: createSlug(serviceData.name),
            description: serviceData.description,
            basePrice: serviceData.basePrice.toString(),
            estimatedDuration: serviceData.estimatedDuration,
            icon: serviceData.icon,
            iconType: 'emoji',
            iconValue: serviceData.iconValue,
            rating: '4.5',
            totalBookings: 0,
            isActive: true,
            allowInstantBooking: true,
            allowScheduledBooking: true,
            advanceBookingDays: 7,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          console.log(`    🛠️ Creating service: ${serviceData.name} (₹${serviceData.basePrice})`);
          await db.insert(services).values(servicePayload);
        }
        
        console.log(`  ✅ Created subcategory "${subcatData.name}" with ${subcatData.services.length} services\n`);
      }
      
      console.log(`✅ Completed processing ${mainCategory.name}\n`);
    }
    
    // Step 5: Verify the results
    console.log('🔍 Verifying results...');
    
    const subcategoryCount = await db.select()
      .from(serviceCategories)
      .where(eq(serviceCategories.level, 1));
      
    const totalServices = await db.select().from(services);
    
    console.log(`📊 SEEDING COMPLETE - SUMMARY:`);
    console.log(`   ✅ Main categories: ${mainCategories.length}`);
    console.log(`   ✅ Subcategories created: ${subcategoryCount.length}`);
    console.log(`   ✅ Total services: ${totalServices.length}`);
    console.log(`   ✅ Average subcategories per main category: ${(subcategoryCount.length / mainCategories.length).toFixed(1)}`);
    
    console.log('\n🎉 SUCCESS: All subcategories and services have been created!');
    console.log('🎯 The "0 sub" and "0 services" issue should now be fixed!');
    
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR during seeding:', error);
    console.error('📍 Stack trace:', error.stack);
    throw error;
  }
}

// Execute the fix
if (import.meta.url === `file://${process.argv[1]}`) {
  fixSubcategoriesAndServices()
    .then(() => {
      console.log('\n✅ Seeding script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Seeding script failed:', error.message);
      process.exit(1);
    });
}

export { fixSubcategoriesAndServices };