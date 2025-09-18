// Script to populate comprehensive service structure for FixitQuick platform
const fs = require('fs');

// Read the service structure
const serviceStructure = JSON.parse(fs.readFileSync('./service_structure.json', 'utf8'));

// Base URL for the API (adjust if needed)
const BASE_URL = 'http://localhost:5000';

// Helper function to make authenticated API requests
async function makeAuthenticatedRequest(method, endpoint, data = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      // Add admin token if available - we'll need to implement admin auth
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (!response.ok) {
      console.error(`❌ ${method} ${endpoint} failed:`, result);
      throw new Error(`HTTP ${response.status}: ${result.message || 'Request failed'}`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Request failed for ${method} ${endpoint}:`, error.message);
    throw error;
  }
}

// Helper function to create a category
async function createCategory(categoryData) {
  console.log(`📁 Creating category: ${categoryData.name} (Level ${categoryData.level})`);
  
  const payload = {
    name: categoryData.name,
    slug: categoryData.slug,
    icon: categoryData.icon,
    description: categoryData.description,
    level: categoryData.level,
    sortOrder: categoryData.sortOrder,
    parentId: categoryData.parentId || null,
    isActive: true
  };
  
  try {
    const result = await makeAuthenticatedRequest('POST', '/api/v1/admin/categories', payload);
    console.log(`✅ Created category: ${categoryData.name} (ID: ${result.id})`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to create category ${categoryData.name}:`, error.message);
    throw error;
  }
}

// Helper function to create a service
async function createService(serviceData, categoryId) {
  console.log(`🛠️ Creating service: ${serviceData.name}`);
  
  const payload = {
    categoryId: categoryId,
    name: serviceData.name,
    slug: serviceData.slug,
    description: serviceData.description,
    basePrice: serviceData.basePrice,
    estimatedDuration: serviceData.estimatedDuration,
    icon: serviceData.icon,
    iconType: serviceData.iconType || 'emoji',
    iconValue: serviceData.iconValue,
    rating: 4.5, // Default rating
    totalBookings: 0,
    isActive: true,
    allowInstantBooking: true,
    allowScheduledBooking: true,
    advanceBookingDays: 7
  };
  
  try {
    const result = await makeAuthenticatedRequest('POST', '/api/v1/admin/services', payload);
    console.log(`✅ Created service: ${serviceData.name} (ID: ${result.id}) - ₹${serviceData.basePrice}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to create service ${serviceData.name}:`, error.message);
    throw error;
  }
}

// Main function to populate all data
async function populateServiceStructure() {
  console.log('🚀 Starting comprehensive service structure population...\n');
  
  const createdCategories = {};
  const createdServices = [];
  
  try {
    // Step 1: Create all main categories (Level 0)
    console.log('📁 Creating main categories (Level 0)...');
    for (const mainCategory of serviceStructure.mainCategories) {
      const createdMainCategory = await createCategory({
        name: mainCategory.name,
        slug: mainCategory.slug,
        icon: mainCategory.icon,
        description: mainCategory.description,
        level: 0,
        sortOrder: mainCategory.sortOrder,
        parentId: null
      });
      
      createdCategories[mainCategory.slug] = createdMainCategory;
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Created ${Object.keys(createdCategories).length} main categories\n`);
    
    // Step 2: Create subcategories (Level 1) and their services
    console.log('📂 Creating subcategories and services...');
    for (const mainCategory of serviceStructure.mainCategories) {
      const mainCategoryRecord = createdCategories[mainCategory.slug];
      
      if (mainCategory.subcategories) {
        for (const subcategory of mainCategory.subcategories) {
          // Create subcategory
          const createdSubcategory = await createCategory({
            name: subcategory.name,
            slug: subcategory.slug,
            icon: subcategory.icon,
            description: subcategory.description,
            level: 1,
            sortOrder: subcategory.sortOrder,
            parentId: mainCategoryRecord.id
          });
          
          createdCategories[subcategory.slug] = createdSubcategory;
          
          // Create services for this subcategory
          if (subcategory.services) {
            for (const service of subcategory.services) {
              const createdService = await createService(service, createdSubcategory.id);
              createdServices.push(createdService);
              
              // Small delay between service creation
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    
    console.log('\n🎉 Service structure population completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Main categories: ${serviceStructure.mainCategories.length}`);
    console.log(`   - Total categories: ${Object.keys(createdCategories).length}`);
    console.log(`   - Total services: ${createdServices.length}`);
    
    // Save the mapping for reference
    const mapping = {
      categories: createdCategories,
      services: createdServices,
      summary: {
        mainCategories: serviceStructure.mainCategories.length,
        totalCategories: Object.keys(createdCategories).length,
        totalServices: createdServices.length
      }
    };
    
    fs.writeFileSync('./service_population_result.json', JSON.stringify(mapping, null, 2));
    console.log('💾 Results saved to service_population_result.json');
    
  } catch (error) {
    console.error('\n💥 Population failed:', error.message);
    console.error('🔄 You may need to run this script again or check admin authentication.');
    process.exit(1);
  }
}

// Execute the population
if (require.main === module) {
  populateServiceStructure();
}

module.exports = { populateServiceStructure, createCategory, createService };