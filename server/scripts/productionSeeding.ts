import { db } from '../db';
import { serviceCategories, services, users, serviceProviders, partsSuppliers } from '../../shared/schema';
import { sql } from 'drizzle-orm';

async function comprehensiveMarketplaceSeeding() {
  console.log('🚀 Starting comprehensive Urban Company-style marketplace seeding...');
  
  try {
    // Execute operations sequentially (Neon HTTP doesn't support transactions)
    
    // 1. Seed Service Categories (8 main categories)
    console.log('📂 Seeding service categories...');
    const categories = [
        {
          name: 'Electrician',
          slug: 'electrician',
          icon: '⚡',
          description: 'Professional electrical services and repairs',
          level: 0,
          sortOrder: 0,
          isActive: true,
          serviceCount: 0
        },
        {
          name: 'Plumber', 
          slug: 'plumber',
          icon: '🔧',
          description: 'Expert plumbing services for home and office',
          level: 0,
          sortOrder: 1,
          isActive: true,
          serviceCount: 0
        },
        {
          name: 'Beauty & Spa',
          slug: 'beauty-spa', 
          icon: '💅',
          description: 'Professional beauty and wellness services at home',
          level: 0,
          sortOrder: 2,
          isActive: true,
          serviceCount: 0
        },
        {
          name: 'Carpentry',
          slug: 'carpentry',
          icon: '🔨', 
          description: 'Custom carpentry and furniture solutions',
          level: 0,
          sortOrder: 3,
          isActive: true,
          serviceCount: 0
        },
        {
          name: 'Appliance Repair',
          slug: 'appliance-repair',
          icon: '🔧',
          description: 'Repair services for home appliances',
          level: 0,
          sortOrder: 4, 
          isActive: true,
          serviceCount: 0
        },
        {
          name: 'Painting Services',
          slug: 'painting',
          icon: '🎨',
          description: 'Interior and exterior painting services',
          level: 0,
          sortOrder: 5,
          isActive: true,
          serviceCount: 0
        },
        {
          name: 'Pest Control',
          slug: 'pest-control',
          icon: '🐛',
          description: 'Professional pest control and fumigation services', 
          level: 0,
          sortOrder: 6,
          isActive: true,
          serviceCount: 0
        },
        {
          name: 'Cleaning Services',
          slug: 'cleaning',
          icon: '🧽',
          description: 'Professional home and office cleaning services',
          level: 0,
          sortOrder: 7,
          isActive: true,
          serviceCount: 0
        }
      ];

    // Use ON CONFLICT for idempotent category insertion
    for (const category of categories) {
      await db.execute(sql`
          INSERT INTO service_categories (name, slug, icon, description, level, sort_order, is_active, service_count)
          VALUES (${category.name}, ${category.slug}, ${category.icon}, ${category.description}, ${category.level}, ${category.sortOrder}, ${category.isActive}, ${category.serviceCount})
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            icon = EXCLUDED.icon,
            description = EXCLUDED.description,
            is_active = EXCLUDED.is_active
      `);
    }

    console.log('✅ Service categories seeded successfully');

    // 2. Get category IDs for service insertion
    const categoryResults = await db.execute(sql`SELECT id, slug FROM service_categories WHERE is_active = true`);
    const categoryMap = new Map(categoryResults.rows.map(row => [row.slug as string, row.id as string]));

    // 3. Seed 100+ Comprehensive Services
    console.log('🛠️  Seeding 100+ comprehensive services...');
      
      const allServices = [
        // ELECTRICIAN SERVICES (15 services)
        { name: 'Basic Electrical Repair', slug: 'basic-electrical-repair', description: 'Switch, socket and minor electrical fault repairs', categorySlug: 'electrician', basePrice: '250.00', duration: 60, icon: '⚡', rating: '4.2', bookings: 89, allowInstant: true, allowScheduled: true },
        { name: 'Smart Switch Installation', slug: 'smart-switch-installation', description: 'WiFi enabled smart switches with mobile app control', categorySlug: 'electrician', basePrice: '500.00', duration: 90, icon: '📱', rating: '4.3', bookings: 45, allowInstant: true, allowScheduled: true },
        { name: 'MCB Panel Upgrade', slug: 'mcb-panel-upgrade', description: 'Complete electrical panel upgrade with safety MCBs', categorySlug: 'electrician', basePrice: '2500.00', duration: 180, icon: '⚡', rating: '4.5', bookings: 28, allowInstant: true, allowScheduled: true },
        { name: 'Emergency Electrical Repair', slug: 'emergency-electrical-repair', description: '24x7 emergency electrical fault resolution', categorySlug: 'electrician', basePrice: '600.00', duration: 60, icon: '🚨', rating: '4.2', bookings: 67, allowInstant: true, allowScheduled: true },
        { name: 'Home Automation Setup', slug: 'home-automation-setup', description: 'Complete smart home automation with voice control', categorySlug: 'electrician', basePrice: '3500.00', duration: 240, icon: '🏠', rating: '4.4', bookings: 15, allowInstant: false, allowScheduled: true },
        { name: 'LED Light Installation', slug: 'led-light-installation', description: 'Energy efficient LED lighting installation', categorySlug: 'electrician', basePrice: '250.00', duration: 45, icon: '💡', rating: '4.1', bookings: 89, allowInstant: true, allowScheduled: true },
        { name: 'Ceiling Fan Installation', slug: 'ceiling-fan-installation', description: 'New ceiling fan installation with regulator', categorySlug: 'electrician', basePrice: '400.00', duration: 90, icon: '🌀', rating: '4.3', bookings: 56, allowInstant: true, allowScheduled: true },
        { name: 'Inverter Installation', slug: 'inverter-installation', description: 'Home inverter setup with battery backup', categorySlug: 'electrician', basePrice: '1200.00', duration: 150, icon: '🔋', rating: '4.4', bookings: 34, allowInstant: true, allowScheduled: true },
        { name: 'Electric Water Heater Setup', slug: 'electric-water-heater-setup', description: 'Electric geyser installation and wiring', categorySlug: 'electrician', basePrice: '800.00', duration: 120, icon: '🔥', rating: '4.2', bookings: 45, allowInstant: true, allowScheduled: true },
        { name: 'CCTV Camera Installation', slug: 'cctv-camera-installation', description: 'Security camera installation with DVR setup', categorySlug: 'electrician', basePrice: '2000.00', duration: 180, icon: '📹', rating: '4.5', bookings: 23, allowInstant: false, allowScheduled: true },
        { name: 'Doorbell Installation', slug: 'doorbell-installation', description: 'Wired or wireless doorbell setup', categorySlug: 'electrician', basePrice: '300.00', duration: 45, icon: '🔔', rating: '4.1', bookings: 67, allowInstant: true, allowScheduled: true },
        { name: 'Extension Board Repair', slug: 'extension-board-repair', description: 'Power strip and extension cord repairs', categorySlug: 'electrician', basePrice: '200.00', duration: 30, icon: '🔌', rating: '4.0', bookings: 78, allowInstant: true, allowScheduled: true },
        { name: 'Outdoor Lighting Setup', slug: 'outdoor-lighting-setup', description: 'Garden and exterior lighting installation', categorySlug: 'electrician', basePrice: '1500.00', duration: 180, icon: '💡', rating: '4.3', bookings: 29, allowInstant: false, allowScheduled: true },
        { name: 'Stabilizer Installation', slug: 'stabilizer-installation', description: 'Voltage stabilizer setup for appliances', categorySlug: 'electrician', basePrice: '350.00', duration: 60, icon: '⚡', rating: '4.2', bookings: 56, allowInstant: true, allowScheduled: true },
        { name: 'Electric Chimney Setup', slug: 'electric-chimney-setup', description: 'Kitchen chimney electrical installation', categorySlug: 'electrician', basePrice: '600.00', duration: 90, icon: '🏠', rating: '4.4', bookings: 34, allowInstant: true, allowScheduled: true },

        // PLUMBER SERVICES (15 services)
        { name: 'Basic Plumbing Repair', slug: 'basic-plumbing-repair', description: 'Tap, drain and minor pipe leak repairs', categorySlug: 'plumber', basePrice: '300.00', duration: 60, icon: '🔧', rating: '4.1', bookings: 78, allowInstant: true, allowScheduled: true },
        { name: 'Bathroom Renovation', slug: 'bathroom-renovation', description: 'Complete bathroom plumbing and fitting renovation', categorySlug: 'plumber', basePrice: '5000.00', duration: 480, icon: '🛁', rating: '4.6', bookings: 23, allowInstant: false, allowScheduled: true },
        { name: 'Kitchen Sink Setup', slug: 'kitchen-sink-setup', description: 'Kitchen sink installation with granite fitting', categorySlug: 'plumber', basePrice: '800.00', duration: 120, icon: '🚰', rating: '4.3', bookings: 56, allowInstant: true, allowScheduled: true },
        { name: 'Water Heater Installation', slug: 'water-heater-installation', description: 'Electric/gas water heater installation and setup', categorySlug: 'plumber', basePrice: '1200.00', duration: 150, icon: '🔥', rating: '4.4', bookings: 34, allowInstant: true, allowScheduled: true },
        { name: 'Pipe Leak Emergency', slug: 'pipe-leak-emergency', description: 'Emergency pipe leak detection and repair service', categorySlug: 'plumber', basePrice: '400.00', duration: 60, icon: '💧', rating: '4.2', bookings: 78, allowInstant: true, allowScheduled: true },
        { name: 'RO Water Purifier Setup', slug: 'ro-water-purifier-setup', description: 'Complete RO system installation with plumbing', categorySlug: 'plumber', basePrice: '1000.00', duration: 120, icon: '💧', rating: '4.3', bookings: 45, allowInstant: true, allowScheduled: true },
        { name: 'Toilet Installation', slug: 'toilet-installation', description: 'New toilet seat installation with plumbing', categorySlug: 'plumber', basePrice: '1500.00', duration: 180, icon: '🚽', rating: '4.5', bookings: 28, allowInstant: true, allowScheduled: true },
        { name: 'Shower Installation', slug: 'shower-installation', description: 'Modern shower head and fittings installation', categorySlug: 'plumber', basePrice: '700.00', duration: 90, icon: '🚿', rating: '4.2', bookings: 45, allowInstant: true, allowScheduled: true },
        { name: 'Water Tank Cleaning', slug: 'water-tank-cleaning', description: 'Overhead and underground water tank cleaning', categorySlug: 'plumber', basePrice: '800.00', duration: 120, icon: '💧', rating: '4.1', bookings: 34, allowInstant: false, allowScheduled: true },
        { name: 'Drain Cleaning Service', slug: 'drain-cleaning-service', description: 'Professional drain unclogging and cleaning', categorySlug: 'plumber', basePrice: '500.00', duration: 90, icon: '🌊', rating: '4.0', bookings: 67, allowInstant: true, allowScheduled: true },
        { name: 'Washing Machine Connection', slug: 'washing-machine-connection', description: 'Washing machine water inlet and outlet setup', categorySlug: 'plumber', basePrice: '400.00', duration: 60, icon: '🌀', rating: '4.2', bookings: 56, allowInstant: true, allowScheduled: true },
        { name: 'Bathroom Fittings Repair', slug: 'bathroom-fittings-repair', description: 'Faucet, mixer and bathroom fixture repairs', categorySlug: 'plumber', basePrice: '350.00', duration: 75, icon: '🔧', rating: '4.1', bookings: 67, allowInstant: true, allowScheduled: true },
        { name: 'Water Pressure Booster', slug: 'water-pressure-booster', description: 'Water pump installation for low pressure areas', categorySlug: 'plumber', basePrice: '2500.00', duration: 240, icon: '💪', rating: '4.4', bookings: 18, allowInstant: false, allowScheduled: true },
        { name: 'Pipe Insulation Service', slug: 'pipe-insulation-service', description: 'Hot water pipe insulation and lagging', categorySlug: 'plumber', basePrice: '600.00', duration: 120, icon: '🔥', rating: '4.2', bookings: 23, allowInstant: true, allowScheduled: true },
        { name: 'Sewage Line Repair', slug: 'sewage-line-repair', description: 'Sewage pipe repair and maintenance service', categorySlug: 'plumber', basePrice: '1800.00', duration: 180, icon: '🚰', rating: '4.3', bookings: 15, allowInstant: false, allowScheduled: true },

        // BEAUTY & SPA SERVICES (15 services)
        { name: 'Bridal Makeup Package', slug: 'bridal-makeup-package', description: 'Complete bridal makeup with hair styling and saree draping', categorySlug: 'beauty-spa', basePrice: '8000.00', duration: 240, icon: '👰', rating: '4.8', bookings: 12, allowInstant: false, allowScheduled: true },
        { name: 'Home Facial Service', slug: 'home-facial-service', description: 'Professional facial treatment at your home', categorySlug: 'beauty-spa', basePrice: '1200.00', duration: 90, icon: '💆‍♀️', rating: '4.4', bookings: 67, allowInstant: true, allowScheduled: true },
        { name: 'Hair Cut & Styling', slug: 'hair-cut-styling', description: 'Professional hair cutting and styling service', categorySlug: 'beauty-spa', basePrice: '600.00', duration: 60, icon: '✂️', rating: '4.3', bookings: 89, allowInstant: true, allowScheduled: true },
        { name: 'Manicure Pedicure Combo', slug: 'manicure-pedicure-combo', description: 'Complete nail care with polish and design', categorySlug: 'beauty-spa', basePrice: '800.00', duration: 120, icon: '💅', rating: '4.2', bookings: 76, allowInstant: true, allowScheduled: true },
        { name: 'Men Grooming Service', slug: 'men-grooming-service', description: 'Complete men grooming with haircut, beard trim and facial', categorySlug: 'beauty-spa', basePrice: '900.00', duration: 75, icon: '👨', rating: '4.1', bookings: 43, allowInstant: true, allowScheduled: true },
        { name: 'Party Makeup', slug: 'party-makeup', description: 'Professional party makeup with hair styling', categorySlug: 'beauty-spa', basePrice: '2500.00', duration: 120, icon: '🎉', rating: '4.5', bookings: 34, allowInstant: false, allowScheduled: true },
        { name: 'Hair Spa Treatment', slug: 'hair-spa-treatment', description: 'Deep conditioning hair spa with massage', categorySlug: 'beauty-spa', basePrice: '1500.00', duration: 90, icon: '💆‍♀️', rating: '4.4', bookings: 45, allowInstant: true, allowScheduled: true },
        { name: 'Eyebrow Threading', slug: 'eyebrow-threading', description: 'Professional eyebrow shaping and threading', categorySlug: 'beauty-spa', basePrice: '200.00', duration: 30, icon: '👁️', rating: '4.2', bookings: 89, allowInstant: true, allowScheduled: true },
        { name: 'Waxing Service Full Body', slug: 'waxing-service-full-body', description: 'Complete body waxing service at home', categorySlug: 'beauty-spa', basePrice: '1800.00', duration: 150, icon: '🦵', rating: '4.3', bookings: 56, allowInstant: true, allowScheduled: true },
        { name: 'Henna/Mehndi Design', slug: 'henna-mehndi-design', description: 'Beautiful henna designs for hands and feet', categorySlug: 'beauty-spa', basePrice: '500.00', duration: 90, icon: '🎨', rating: '4.4', bookings: 67, allowInstant: true, allowScheduled: true },
        { name: 'Hair Coloring Service', slug: 'hair-coloring-service', description: 'Professional hair coloring and highlights', categorySlug: 'beauty-spa', basePrice: '2000.00', duration: 180, icon: '🌈', rating: '4.5', bookings: 23, allowInstant: false, allowScheduled: true },
        { name: 'Massage Therapy', slug: 'massage-therapy', description: 'Relaxing full body massage therapy', categorySlug: 'beauty-spa', basePrice: '1500.00', duration: 90, icon: '💆', rating: '4.6', bookings: 34, allowInstant: true, allowScheduled: true },
        { name: 'Beard Styling Service', slug: 'beard-styling-service', description: 'Professional beard trimming and styling', categorySlug: 'beauty-spa', basePrice: '300.00', duration: 45, icon: '🧔', rating: '4.1', bookings: 78, allowInstant: true, allowScheduled: true },
        { name: 'Skin Bleaching Treatment', slug: 'skin-bleaching-treatment', description: 'Professional skin bleaching and whitening', categorySlug: 'beauty-spa', basePrice: '800.00', duration: 60, icon: '✨', rating: '4.2', bookings: 45, allowInstant: true, allowScheduled: true },
        { name: 'Pre-Wedding Beauty Package', slug: 'pre-wedding-beauty-package', description: 'Complete pre-wedding beauty treatment package', categorySlug: 'beauty-spa', basePrice: '15000.00', duration: 480, icon: '💒', rating: '4.7', bookings: 8, allowInstant: false, allowScheduled: true },

        // CARPENTRY SERVICES (15 services)
        { name: 'Modular Kitchen Installation', slug: 'modular-kitchen-installation', description: 'Complete modular kitchen setup with cabinets and fittings', categorySlug: 'carpentry', basePrice: '25000.00', duration: 720, icon: '🏠', rating: '4.7', bookings: 8, allowInstant: false, allowScheduled: true },
        { name: 'Custom Wardrobe Making', slug: 'custom-wardrobe-making', description: 'Made-to-measure wardrobe with modern fittings', categorySlug: 'carpentry', basePrice: '15000.00', duration: 480, icon: '🚪', rating: '4.5', bookings: 15, allowInstant: false, allowScheduled: true },
        { name: 'Furniture Assembly Service', slug: 'furniture-assembly-service', description: 'Assembly of flat-pack and modular furniture', categorySlug: 'carpentry', basePrice: '500.00', duration: 90, icon: '🪑', rating: '4.2', bookings: 67, allowInstant: true, allowScheduled: true },
        { name: 'Door Installation Service', slug: 'door-installation-service', description: 'New door installation with frame and hardware', categorySlug: 'carpentry', basePrice: '1800.00', duration: 180, icon: '🚪', rating: '4.3', bookings: 34, allowInstant: true, allowScheduled: true },
        { name: 'TV Unit Wall Mounting', slug: 'tv-unit-wall-mounting', description: 'Wall-mounted TV unit with cable management', categorySlug: 'carpentry', basePrice: '1200.00', duration: 120, icon: '📺', rating: '4.4', bookings: 56, allowInstant: true, allowScheduled: true },
        { name: 'Wooden Flooring Installation', slug: 'wooden-flooring-installation', description: 'Laminate and engineered wood flooring', categorySlug: 'carpentry', basePrice: '8000.00', duration: 480, icon: '🪵', rating: '4.6', bookings: 12, allowInstant: false, allowScheduled: true },
        { name: 'Cabinet Door Repair', slug: 'cabinet-door-repair', description: 'Kitchen and wardrobe door hinge repairs', categorySlug: 'carpentry', basePrice: '300.00', duration: 60, icon: '🔧', rating: '4.1', bookings: 78, allowInstant: true, allowScheduled: true },
        { name: 'Custom Bookshelf Making', slug: 'custom-bookshelf-making', description: 'Made-to-order bookshelves and storage units', categorySlug: 'carpentry', basePrice: '3500.00', duration: 240, icon: '📚', rating: '4.4', bookings: 23, allowInstant: false, allowScheduled: true },
        { name: 'Window Frame Repair', slug: 'window-frame-repair', description: 'Wooden window frame repair and maintenance', categorySlug: 'carpentry', basePrice: '800.00', duration: 120, icon: '🪟', rating: '4.2', bookings: 45, allowInstant: true, allowScheduled: true },
        { name: 'Study Table Making', slug: 'study-table-making', description: 'Custom study table with storage drawers', categorySlug: 'carpentry', basePrice: '2500.00', duration: 180, icon: '📝', rating: '4.3', bookings: 28, allowInstant: false, allowScheduled: true },
        { name: 'Bed Frame Assembly', slug: 'bed-frame-assembly', description: 'Wooden bed frame assembly and installation', categorySlug: 'carpentry', basePrice: '800.00', duration: 120, icon: '🛏️', rating: '4.2', bookings: 45, allowInstant: true, allowScheduled: true },
        { name: 'Kitchen Platform Repair', slug: 'kitchen-platform-repair', description: 'Kitchen counter and platform repair work', categorySlug: 'carpentry', basePrice: '1200.00', duration: 150, icon: '🔨', rating: '4.3', bookings: 34, allowInstant: true, allowScheduled: true },
        { name: 'False Ceiling Work', slug: 'false-ceiling-work', description: 'Gypsum and POP false ceiling installation', categorySlug: 'carpentry', basePrice: '5000.00', duration: 360, icon: '🏠', rating: '4.5', bookings: 18, allowInstant: false, allowScheduled: true },
        { name: 'Staircase Railing Repair', slug: 'staircase-railing-repair', description: 'Wooden staircase railing repair and polish', categorySlug: 'carpentry', basePrice: '1500.00', duration: 180, icon: '🪜', rating: '4.2', bookings: 29, allowInstant: true, allowScheduled: true },
        { name: 'Partition Wall Creation', slug: 'partition-wall-creation', description: 'Wooden partition walls for room division', categorySlug: 'carpentry', basePrice: '4000.00', duration: 300, icon: '🏗️', rating: '4.4', bookings: 15, allowInstant: false, allowScheduled: true },

        // APPLIANCE REPAIR SERVICES (15 services)
        { name: 'AC Service & Repair', slug: 'ac-service-repair', description: 'Complete AC servicing with gas refill and deep cleaning', categorySlug: 'appliance-repair', basePrice: '1200.00', duration: 120, icon: '❄️', rating: '4.3', bookings: 89, allowInstant: true, allowScheduled: true },
        { name: 'Washing Machine Repair', slug: 'washing-machine-repair', description: 'All brand washing machine repair and maintenance', categorySlug: 'appliance-repair', basePrice: '800.00', duration: 90, icon: '🌀', rating: '4.2', bookings: 67, allowInstant: true, allowScheduled: true },
        { name: 'Refrigerator Repair', slug: 'refrigerator-repair', description: 'Fridge repair including cooling system and compressor', categorySlug: 'appliance-repair', basePrice: '1000.00', duration: 120, icon: '🧊', rating: '4.4', bookings: 45, allowInstant: true, allowScheduled: true },
        { name: 'Microwave Oven Repair', slug: 'microwave-oven-repair', description: 'Microwave repair and magnetron replacement service', categorySlug: 'appliance-repair', basePrice: '600.00', duration: 60, icon: '📱', rating: '4.1', bookings: 34, allowInstant: true, allowScheduled: true },
        { name: 'TV LED Repair Service', slug: 'tv-led-repair-service', description: 'LED/LCD TV panel and motherboard repair', categorySlug: 'appliance-repair', basePrice: '1500.00', duration: 150, icon: '📺', rating: '4.5', bookings: 23, allowInstant: true, allowScheduled: true },
        { name: 'Dishwasher Repair', slug: 'dishwasher-repair', description: 'Dishwasher pump, motor and control panel repair', categorySlug: 'appliance-repair', basePrice: '1200.00', duration: 120, icon: '🍽️', rating: '4.3', bookings: 28, allowInstant: true, allowScheduled: true },
        { name: 'Oven Repair Service', slug: 'oven-repair-service', description: 'Electric and gas oven heating element repair', categorySlug: 'appliance-repair', basePrice: '800.00', duration: 90, icon: '🔥', rating: '4.2', bookings: 34, allowInstant: true, allowScheduled: true },
        { name: 'Water Purifier Service', slug: 'water-purifier-service', description: 'RO water purifier filter change and servicing', categorySlug: 'appliance-repair', basePrice: '500.00', duration: 60, icon: '💧', rating: '4.1', bookings: 78, allowInstant: true, allowScheduled: true },
        { name: 'Mixer Grinder Repair', slug: 'mixer-grinder-repair', description: 'Kitchen mixer grinder motor and blade repair', categorySlug: 'appliance-repair', basePrice: '400.00', duration: 75, icon: '🥤', rating: '4.0', bookings: 56, allowInstant: true, allowScheduled: true },
        { name: 'Iron Box Repair', slug: 'iron-box-repair', description: 'Electric iron heating plate and cord repair', categorySlug: 'appliance-repair', basePrice: '300.00', duration: 45, icon: '👔', rating: '4.1', bookings: 67, allowInstant: true, allowScheduled: true },
        { name: 'Fan Repair Service', slug: 'fan-repair-service', description: 'Ceiling and table fan motor and regulator repair', categorySlug: 'appliance-repair', basePrice: '350.00', duration: 60, icon: '🌀', rating: '4.2', bookings: 89, allowInstant: true, allowScheduled: true },
        { name: 'Geyser Repair Service', slug: 'geyser-repair-service', description: 'Electric water heater element and thermostat repair', categorySlug: 'appliance-repair', basePrice: '700.00', duration: 90, icon: '🔥', rating: '4.3', bookings: 45, allowInstant: true, allowScheduled: true },
        { name: 'Chimney Repair Service', slug: 'chimney-repair-service', description: 'Kitchen chimney motor and filter cleaning service', categorySlug: 'appliance-repair', basePrice: '600.00', duration: 75, icon: '🏠', rating: '4.2', bookings: 34, allowInstant: true, allowScheduled: true },
        { name: 'Induction Cooktop Repair', slug: 'induction-cooktop-repair', description: 'Induction stove heating coil and control repair', categorySlug: 'appliance-repair', basePrice: '500.00', duration: 60, icon: '🔥', rating: '4.1', bookings: 45, allowInstant: true, allowScheduled: true },
        { name: 'Vacuum Cleaner Repair', slug: 'vacuum-cleaner-repair', description: 'Vacuum cleaner motor and suction repair service', categorySlug: 'appliance-repair', basePrice: '600.00', duration: 75, icon: '🧹', rating: '4.2', bookings: 28, allowInstant: true, allowScheduled: true },

        // PAINTING SERVICES (15 services)
        { name: '1 BHK Interior Painting', slug: '1-bhk-interior-painting', description: 'Complete 1BHK apartment interior painting with premium paint', categorySlug: 'painting', basePrice: '8000.00', duration: 480, icon: '🎨', rating: '4.6', bookings: 34, allowInstant: false, allowScheduled: true },
        { name: 'Exterior House Painting', slug: 'exterior-house-painting', description: 'Weather-resistant exterior painting with primer', categorySlug: 'painting', basePrice: '12000.00', duration: 720, icon: '🏠', rating: '4.5', bookings: 18, allowInstant: false, allowScheduled: true },
        { name: 'Texture Wall Painting', slug: 'texture-wall-painting', description: 'Designer textured wall finish with Asian Paints', categorySlug: 'painting', basePrice: '3500.00', duration: 300, icon: '🖼️', rating: '4.4', bookings: 25, allowInstant: false, allowScheduled: true },
        { name: 'Wood Polish & Staining', slug: 'wood-polish-staining', description: 'Furniture and door wood polishing service', categorySlug: 'painting', basePrice: '1200.00', duration: 240, icon: '🪑', rating: '4.2', bookings: 45, allowInstant: true, allowScheduled: true },
        { name: 'Wallpaper Installation', slug: 'wallpaper-installation', description: 'Premium wallpaper installation with adhesive', categorySlug: 'painting', basePrice: '2000.00', duration: 180, icon: '📄', rating: '4.3', bookings: 28, allowInstant: true, allowScheduled: true },
        { name: 'Single Room Painting', slug: 'single-room-painting', description: 'Complete room painting with primer and finish', categorySlug: 'painting', basePrice: '2500.00', duration: 240, icon: '🏠', rating: '4.4', bookings: 56, allowInstant: false, allowScheduled: true },
        { name: 'Bathroom Waterproofing', slug: 'bathroom-waterproofing', description: 'Complete bathroom waterproofing with coating', categorySlug: 'painting', basePrice: '4000.00', duration: 360, icon: '💧', rating: '4.5', bookings: 23, allowInstant: false, allowScheduled: true },
        { name: 'Metal Painting Service', slug: 'metal-painting-service', description: 'Anti-rust metal gate and grill painting', categorySlug: 'painting', basePrice: '1500.00', duration: 180, icon: '🔗', rating: '4.2', bookings: 34, allowInstant: true, allowScheduled: true },
        { name: 'Ceiling Painting', slug: 'ceiling-painting', description: 'Ceiling painting with weather-proof paint', categorySlug: 'painting', basePrice: '1800.00', duration: 200, icon: '🏠', rating: '4.3', bookings: 29, allowInstant: false, allowScheduled: true },
        { name: 'Wall Crack Repair', slug: 'wall-crack-repair', description: 'Wall crack filling and repainting service', categorySlug: 'painting', basePrice: '800.00', duration: 120, icon: '🔧', rating: '4.1', bookings: 67, allowInstant: true, allowScheduled: true },
        { name: 'Whitewashing Service', slug: 'whitewashing-service', description: 'Traditional lime whitewashing for walls', categorySlug: 'painting', basePrice: '1000.00', duration: 180, icon: '⚪', rating: '4.0', bookings: 45, allowInstant: true, allowScheduled: true },
        { name: 'Enamel Paint Touch-up', slug: 'enamel-paint-touch-up', description: 'Minor enamel paint touch-up and spot painting', categorySlug: 'painting', basePrice: '500.00', duration: 90, icon: '🎨', rating: '4.1', bookings: 78, allowInstant: true, allowScheduled: true },
        { name: 'Distemper Wall Painting', slug: 'distemper-wall-painting', description: 'Budget-friendly distemper wall painting', categorySlug: 'painting', basePrice: '1500.00', duration: 200, icon: '🎨', rating: '4.2', bookings: 56, allowInstant: false, allowScheduled: true },
        { name: 'Staircase Painting', slug: 'staircase-painting', description: 'Staircase railing and step painting service', categorySlug: 'painting', basePrice: '1200.00', duration: 150, icon: '🪜', rating: '4.3', bookings: 34, allowInstant: true, allowScheduled: true },
        { name: 'Office Painting Service', slug: 'office-painting-service', description: 'Commercial office space painting with quick dry', categorySlug: 'painting', basePrice: '15000.00', duration: 600, icon: '🏢', rating: '4.4', bookings: 12, allowInstant: false, allowScheduled: true },

        // PEST CONTROL SERVICES (10 services)
        { name: 'General Pest Control', slug: 'general-pest-control', description: 'Complete house pest control with 3-month warranty', categorySlug: 'pest-control', basePrice: '1500.00', duration: 120, icon: '🏠', rating: '4.4', bookings: 67, allowInstant: true, allowScheduled: true },
        { name: 'Anti-Termite Treatment', slug: 'anti-termite-treatment', description: 'Professional anti-termite treatment with 5-year warranty', categorySlug: 'pest-control', basePrice: '3500.00', duration: 180, icon: '🐛', rating: '4.6', bookings: 15, allowInstant: false, allowScheduled: true },
        { name: 'Cockroach Control Service', slug: 'cockroach-control-service', description: 'Targeted cockroach elimination with gel treatment', categorySlug: 'pest-control', basePrice: '800.00', duration: 90, icon: '🪳', rating: '4.2', bookings: 89, allowInstant: true, allowScheduled: true },
        { name: 'Rat & Rodent Control', slug: 'rat-rodent-control', description: 'Safe rodent control without poison, family-safe', categorySlug: 'pest-control', basePrice: '1200.00', duration: 120, icon: '🐭', rating: '4.3', bookings: 34, allowInstant: true, allowScheduled: true },
        { name: 'Mosquito Control', slug: 'mosquito-control', description: 'Mosquito fogging and breeding control treatment', categorySlug: 'pest-control', basePrice: '600.00', duration: 60, icon: '🦟', rating: '4.1', bookings: 56, allowInstant: true, allowScheduled: true },
        { name: 'Lizard Control Service', slug: 'lizard-control-service', description: 'Natural lizard repellent treatment', categorySlug: 'pest-control', basePrice: '500.00', duration: 75, icon: '🦎', rating: '4.0', bookings: 78, allowInstant: true, allowScheduled: true },
        { name: 'Ant Control Treatment', slug: 'ant-control-treatment', description: 'Complete ant colony elimination treatment', categorySlug: 'pest-control', basePrice: '700.00', duration: 90, icon: '🐜', rating: '4.2', bookings: 45, allowInstant: true, allowScheduled: true },
        { name: 'Wood Borer Treatment', slug: 'wood-borer-treatment', description: 'Furniture wood borer and termite treatment', categorySlug: 'pest-control', basePrice: '1800.00', duration: 150, icon: '🪵', rating: '4.4', bookings: 23, allowInstant: true, allowScheduled: true },
        { name: 'Spider Control Service', slug: 'spider-control-service', description: 'Safe spider removal and prevention treatment', categorySlug: 'pest-control', basePrice: '600.00', duration: 75, icon: '🕷️', rating: '4.1', bookings: 34, allowInstant: true, allowScheduled: true },
        { name: 'Bed Bug Treatment', slug: 'bed-bug-treatment', description: 'Complete bed bug elimination with heat treatment', categorySlug: 'pest-control', basePrice: '2500.00', duration: 180, icon: '🛏️', rating: '4.5', bookings: 18, allowInstant: false, allowScheduled: true },

        // CLEANING SERVICES (10 services)
        { name: 'Deep House Cleaning', slug: 'deep-house-cleaning', description: 'Complete house deep cleaning with sanitization', categorySlug: 'cleaning', basePrice: '2500.00', duration: 240, icon: '🏠', rating: '4.5', bookings: 45, allowInstant: false, allowScheduled: true },
        { name: 'Bathroom Deep Cleaning', slug: 'bathroom-deep-cleaning', description: 'Professional bathroom deep cleaning and sanitization', categorySlug: 'cleaning', basePrice: '800.00', duration: 90, icon: '🚿', rating: '4.3', bookings: 67, allowInstant: true, allowScheduled: true },
        { name: 'Kitchen Deep Cleaning', slug: 'kitchen-deep-cleaning', description: 'Complete kitchen cleaning with appliance cleaning', categorySlug: 'cleaning', basePrice: '1200.00', duration: 120, icon: '🍽️', rating: '4.4', bookings: 56, allowInstant: true, allowScheduled: true },
        { name: 'Sofa Cleaning Service', slug: 'sofa-cleaning-service', description: 'Professional sofa and upholstery cleaning', categorySlug: 'cleaning', basePrice: '1000.00', duration: 90, icon: '🛋️', rating: '4.2', bookings: 78, allowInstant: true, allowScheduled: true },
        { name: 'Carpet Cleaning Service', slug: 'carpet-cleaning-service', description: 'Deep carpet and rug cleaning with stain removal', categorySlug: 'cleaning', basePrice: '800.00', duration: 75, icon: '🏠', rating: '4.3', bookings: 45, allowInstant: true, allowScheduled: true },
        { name: 'Window Cleaning Service', slug: 'window-cleaning-service', description: 'Professional window and glass cleaning', categorySlug: 'cleaning', basePrice: '500.00', duration: 60, icon: '🪟', rating: '4.1', bookings: 89, allowInstant: true, allowScheduled: true },
        { name: 'AC Duct Cleaning', slug: 'ac-duct-cleaning', description: 'Central AC duct cleaning and sanitization', categorySlug: 'cleaning', basePrice: '1500.00', duration: 120, icon: '❄️', rating: '4.4', bookings: 23, allowInstant: true, allowScheduled: true },
        { name: 'Office Cleaning Service', slug: 'office-cleaning-service', description: 'Professional office space cleaning and maintenance', categorySlug: 'cleaning', basePrice: '2000.00', duration: 180, icon: '🏢', rating: '4.3', bookings: 34, allowInstant: false, allowScheduled: true },
        { name: 'Post-Construction Cleaning', slug: 'post-construction-cleaning', description: 'Construction debris and dust cleaning service', categorySlug: 'cleaning', basePrice: '3500.00', duration: 300, icon: '🏗️', rating: '4.5', bookings: 15, allowInstant: false, allowScheduled: true },
        { name: 'Car Interior Cleaning', slug: 'car-interior-cleaning', description: 'Complete car interior cleaning and detailing', categorySlug: 'cleaning', basePrice: '1200.00', duration: 120, icon: '🚗', rating: '4.2', bookings: 34, allowInstant: true, allowScheduled: true }
      ];

      // Insert services with idempotent upserts
      for (const service of allServices) {
        const categoryId = categoryMap.get(service.categorySlug);
        if (!categoryId) {
          console.log(`⚠️  Category not found for slug: ${service.categorySlug}`);
          continue;
        }

        await db.execute(sql`
          INSERT INTO services (name, slug, description, category_id, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking)
          VALUES (${service.name}, ${service.slug}, ${service.description}, ${categoryId}, ${service.basePrice}, ${service.duration}, ${service.icon}, 'emoji', ${service.icon}, ${service.rating}, ${service.bookings}, true, ${service.allowInstant}, ${service.allowScheduled})
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            base_price = EXCLUDED.base_price,
            estimated_duration = EXCLUDED.estimated_duration,
            rating = EXCLUDED.rating,
            total_bookings = EXCLUDED.total_bookings,
            is_active = EXCLUDED.is_active,
            allow_instant_booking = EXCLUDED.allow_instant_booking,
            allow_scheduled_booking = EXCLUDED.allow_scheduled_booking
        `);
      }

      console.log('✅ 100+ Services seeded successfully');

      // 4. Create Service Provider Users (if not exists)
    console.log('👥 Seeding service provider users...');
    const providerUsers = [
        { firstName: 'Rajesh', lastName: 'Kumar', email: 'rajesh.electrician@fixitquick.com', phone: '+919876543210', walletBalance: '5000.00', fixiPoints: 150 },
        { firstName: 'Priya', lastName: 'Sharma', email: 'priya.plumbing@fixitquick.com', phone: '+919876543211', walletBalance: '7500.00', fixiPoints: 200 },
        { firstName: 'Neha', lastName: 'Verma', email: 'neha@mumbaibeautyhub.com', phone: '+919876543212', walletBalance: '3000.00', fixiPoints: 100 },
        { firstName: 'Amit', lastName: 'Singh', email: 'amit@singhcarpentry.com', phone: '+919876543213', walletBalance: '10000.00', fixiPoints: 300 },
        { firstName: 'Vikram', lastName: 'Pest', email: 'vikram@professionalpest.com', phone: '+919876543214', walletBalance: '4500.00', fixiPoints: 180 }
      ];

      for (const user of providerUsers) {
        await db.execute(sql`
          INSERT INTO users (first_name, last_name, email, phone, role, is_verified, wallet_balance, fixi_points, is_active)
          VALUES (${user.firstName}, ${user.lastName}, ${user.email}, ${user.phone}, 'service_provider', true, ${user.walletBalance}, ${user.fixiPoints}, true)
          ON CONFLICT (email) DO UPDATE SET
            wallet_balance = EXCLUDED.wallet_balance,
            fixi_points = EXCLUDED.fixi_points,
            is_verified = true,
            is_active = true
        `);
      }

    // 5. Create Parts Provider Users (if not exists)
    console.log('🏪 Seeding parts provider users...');
    const partsProviderUsers = [
        { firstName: 'Mumbai', lastName: 'Electronics', email: 'contact@mumbaielectronics.com', phone: '+919876543220', walletBalance: '25000.00', fixiPoints: 500 },
        { firstName: 'Delhi', lastName: 'Plumbing', email: 'sales@delhiplumbing.com', phone: '+919876543221', walletBalance: '18000.00', fixiPoints: 350 },
        { firstName: 'Bangalore', lastName: 'Hardware', email: 'info@bangalorehardware.com', phone: '+919876543222', walletBalance: '30000.00', fixiPoints: 600 },
        { firstName: 'Chennai', lastName: 'Appliances', email: 'help@chennaipharmacy.com', phone: '+919876543223', walletBalance: '22000.00', fixiPoints: 420 },
        { firstName: 'Pune', lastName: 'Tools', email: 'contact@punetools.com', phone: '+919876543224', walletBalance: '15000.00', fixiPoints: 280 }
      ];

      for (const user of partsProviderUsers) {
        await db.execute(sql`
          INSERT INTO users (first_name, last_name, email, phone, role, is_verified, wallet_balance, fixi_points, is_active)
          VALUES (${user.firstName}, ${user.lastName}, ${user.email}, ${user.phone}, 'parts_provider', true, ${user.walletBalance}, ${user.fixiPoints}, true)
          ON CONFLICT (email) DO UPDATE SET
            wallet_balance = EXCLUDED.wallet_balance,
            fixi_points = EXCLUDED.fixi_points,
            is_verified = true,
            is_active = true
        `);
      }

    console.log('✅ All users seeded successfully');

    // 6. Verification - Check counts
    console.log('🔍 Verifying seeded data...');
    const categoryCount = await db.execute(sql`SELECT COUNT(*) as count FROM service_categories WHERE is_active = true`);
    const serviceCount = await db.execute(sql`SELECT COUNT(*) as count FROM services WHERE is_active = true`);
    const providerCount = await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE role = 'service_provider' AND is_verified = true`);
    const partsCount = await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE role = 'parts_provider' AND is_active = true`);

    console.log(`\n✅ COMPREHENSIVE MARKETPLACE SEEDING COMPLETE!`);
    console.log(`📊 Final Counts:`);
    console.log(`   • Categories: ${categoryCount.rows[0].count}`);
    console.log(`   • Services: ${serviceCount.rows[0].count}`);
    console.log(`   • Service Providers: ${providerCount.rows[0].count}`);
    console.log(`   • Parts Providers: ${partsCount.rows[0].count}`);

    if (parseInt(serviceCount.rows[0].count as string) >= 100) {
      console.log(`🎉 SUCCESS: Achieved 100+ services target!`);
    } else {
      console.log(`⚠️  WARNING: Only ${serviceCount.rows[0].count} services created, target was 100+`);
    }

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

// Execute seeding - ES Module compatible
comprehensiveMarketplaceSeeding()
  .then(() => {
    console.log('🎯 Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });