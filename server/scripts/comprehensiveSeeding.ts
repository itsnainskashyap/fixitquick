import { db } from '../db';
import { 
  serviceCategories, 
  services, 
  users, 
  serviceProviders, 
  partsSuppliers,
  parts,
  partsCategories
} from '@shared/schema.js';
import { eq } from 'drizzle-orm';

// Comprehensive Urban Company-style marketplace seeding
export async function seedComprehensiveMarketplace() {
  console.log('🚀 Starting comprehensive marketplace seeding...');

  // Main service categories with subcategories
  const mainCategories = [
    {
      name: 'Electrical Services',
      slug: 'electrical',
      icon: '⚡',
      description: 'Complete electrical solutions for homes and offices',
      subcategories: [
        'Wiring & Installation',
        'Repair & Maintenance', 
        'Smart Home Setup',
        'Emergency Services'
      ]
    },
    {
      name: 'Plumbing Services', 
      slug: 'plumbing',
      icon: '🔧',
      description: 'Professional plumbing services and repairs',
      subcategories: [
        'Pipe Installation',
        'Leak Repair',
        'Bathroom Fitting',
        'Kitchen Plumbing'
      ]
    },
    {
      name: 'Home Cleaning',
      slug: 'cleaning',
      icon: '🧹', 
      description: 'Professional cleaning services for homes and offices',
      subcategories: [
        'Deep Cleaning',
        'Regular Cleaning',
        'Post-Construction Cleaning',
        'Office Cleaning'
      ]
    },
    {
      name: 'Carpentry & Furniture',
      slug: 'carpentry',
      icon: '🔨',
      description: 'Custom carpentry and furniture services',
      subcategories: [
        'Furniture Repair',
        'Custom Furniture',
        'Cabinet Installation',
        'Door & Window Services'
      ]
    },
    {
      name: 'Beauty & Spa',
      slug: 'beauty',
      icon: '💅',
      description: 'Professional beauty and wellness services',
      subcategories: [
        'Salon at Home',
        'Bridal Services',
        'Men\'s Grooming',
        'Massage & Spa'
      ]
    },
    {
      name: 'Appliance Repair',
      slug: 'appliance-repair',
      icon: '🔧',
      description: 'Repair services for home appliances',
      subcategories: [
        'AC Repair',
        'Washing Machine',
        'Refrigerator',
        'Microwave & Electronics'
      ]
    },
    {
      name: 'Painting Services',
      slug: 'painting',
      icon: '🎨',
      description: 'Interior and exterior painting services',
      subcategories: [
        'Interior Painting',
        'Exterior Painting', 
        'Wall Texturing',
        'Wood Polishing'
      ]
    },
    {
      name: 'Pest Control',
      slug: 'pest-control',
      icon: '🐛',
      description: 'Professional pest control and fumigation',
      subcategories: [
        'General Pest Control',
        'Termite Treatment',
        'Cockroach Treatment',
        'Rodent Control'
      ]
    }
  ];

  // Comprehensive services with genuine Indian pricing
  const allServices = [
    // Electrical Services (15 services)
    { name: 'Home Wiring Installation', category: 'Electrical Services', subcat: 'Wiring & Installation', price: 1500, desc: 'Complete home electrical wiring with quality materials', duration: 180, icon: '⚡' },
    { name: 'Switch & Socket Installation', category: 'Electrical Services', subcat: 'Wiring & Installation', price: 150, desc: 'Installation of switches, sockets and electrical points', duration: 30, icon: '🔌' },
    { name: 'Ceiling Fan Installation', category: 'Electrical Services', subcat: 'Wiring & Installation', price: 300, desc: 'Professional ceiling fan installation with warranty', duration: 45, icon: '🌀' },
    { name: 'Light Fixture Installation', category: 'Electrical Services', subcat: 'Wiring & Installation', price: 200, desc: 'Installation of lights, chandeliers and decorative fixtures', duration: 30, icon: '💡' },
    { name: 'Electrical Panel Upgrade', category: 'Electrical Services', subcat: 'Wiring & Installation', price: 2500, desc: 'MCB panel installation and electrical board upgrading', duration: 120, icon: '⚡' },
    
    { name: 'Short Circuit Repair', category: 'Electrical Services', subcat: 'Repair & Maintenance', price: 400, desc: 'Emergency short circuit detection and repair', duration: 60, icon: '⚡' },
    { name: 'Power Cut Issues', category: 'Electrical Services', subcat: 'Repair & Maintenance', price: 300, desc: 'Diagnose and fix power supply problems', duration: 45, icon: '🔧' },
    { name: 'Appliance Wiring Repair', category: 'Electrical Services', subcat: 'Repair & Maintenance', price: 250, desc: 'Fix wiring issues for home appliances', duration: 60, icon: '🔌' },
    
    { name: 'Smart Switch Installation', category: 'Electrical Services', subcat: 'Smart Home Setup', price: 500, desc: 'WiFi enabled smart switches and home automation', duration: 90, icon: '📱' },
    { name: 'Smart Doorbell Setup', category: 'Electrical Services', subcat: 'Smart Home Setup', price: 800, desc: 'Video doorbell installation with mobile app', duration: 60, icon: '🔔' },
    
    { name: '24x7 Electrical Emergency', category: 'Electrical Services', subcat: 'Emergency Services', price: 600, desc: 'Emergency electrical repairs anytime', duration: 45, icon: '🚨' },
    { name: 'Power Backup Solutions', category: 'Electrical Services', subcat: 'Emergency Services', price: 1200, desc: 'UPS and inverter installation and repair', duration: 120, icon: '🔋' },
    { name: 'Generator Installation', category: 'Electrical Services', subcat: 'Emergency Services', price: 2000, desc: 'Diesel/petrol generator setup and maintenance', duration: 180, icon: '⚙️' },
    { name: 'Voltage Stabilizer Setup', category: 'Electrical Services', subcat: 'Emergency Services', price: 350, desc: 'Voltage stabilizer installation for appliances', duration: 30, icon: '📊' },
    { name: 'Earth Leakage Protection', category: 'Electrical Services', subcat: 'Emergency Services', price: 800, desc: 'ELCB installation for electrical safety', duration: 90, icon: '⚡' },

    // Plumbing Services (15 services)
    { name: 'Tap Installation', category: 'Plumbing Services', subcat: 'Pipe Installation', price: 200, desc: 'Installation of taps and faucets with fitting', duration: 30, icon: '🚿' },
    { name: 'Toilet Installation', category: 'Plumbing Services', subcat: 'Pipe Installation', price: 800, desc: 'Complete toilet fitting and pipe connections', duration: 120, icon: '🚽' },
    { name: 'Shower Installation', category: 'Plumbing Services', subcat: 'Pipe Installation', price: 500, desc: 'Shower head and bathroom fitting installation', duration: 60, icon: '🚿' },
    { name: 'Water Tank Installation', category: 'Plumbing Services', subcat: 'Pipe Installation', price: 1200, desc: 'Overhead and underground tank installation', duration: 180, icon: '🪣' },
    
    { name: 'Pipe Leakage Repair', category: 'Plumbing Services', subcat: 'Leak Repair', price: 300, desc: 'Emergency pipe leak detection and repair', duration: 45, icon: '💧' },
    { name: 'Faucet Repair', category: 'Plumbing Services', subcat: 'Leak Repair', price: 150, desc: 'Fix leaky taps and faucet problems', duration: 30, icon: '🔧' },
    { name: 'Toilet Repair', category: 'Plumbing Services', subcat: 'Leak Repair', price: 400, desc: 'Toilet flush and plumbing issues repair', duration: 60, icon: '🚽' },
    { name: 'Water Heater Repair', category: 'Plumbing Services', subcat: 'Leak Repair', price: 500, desc: 'Geyser and water heater repair services', duration: 90, icon: '🔥' },
    
    { name: 'Complete Bathroom Setup', category: 'Plumbing Services', subcat: 'Bathroom Fitting', price: 3000, desc: 'Full bathroom plumbing and fitting service', duration: 300, icon: '🛁' },
    { name: 'Washbasin Installation', category: 'Plumbing Services', subcat: 'Bathroom Fitting', price: 600, desc: 'Basin and mirror installation with plumbing', duration: 90, icon: '🚿' },
    
    { name: 'Kitchen Sink Setup', category: 'Plumbing Services', subcat: 'Kitchen Plumbing', price: 500, desc: 'Kitchen sink installation with pipe fitting', duration: 60, icon: '🚰' },
    { name: 'Dishwasher Connection', category: 'Plumbing Services', subcat: 'Kitchen Plumbing', price: 400, desc: 'Dishwasher water supply and drain connection', duration: 45, icon: '🍽️' },
    { name: 'RO Water Purifier Setup', category: 'Plumbing Services', subcat: 'Kitchen Plumbing', price: 800, desc: 'RO water purifier installation and plumbing', duration: 120, icon: '💧' },
    { name: 'Kitchen Chimney Ducting', category: 'Plumbing Services', subcat: 'Kitchen Plumbing', price: 600, desc: 'Chimney exhaust pipe installation', duration: 90, icon: '💨' },
    { name: 'Gas Pipeline Installation', category: 'Plumbing Services', subcat: 'Kitchen Plumbing', price: 1000, desc: 'LPG gas pipeline and safety valve installation', duration: 120, icon: '🔥' },

    // Home Cleaning Services (15 services)
    { name: 'Full House Deep Cleaning', category: 'Home Cleaning', subcat: 'Deep Cleaning', price: 2500, desc: 'Complete deep cleaning of entire house', duration: 360, icon: '🏠' },
    { name: 'Kitchen Deep Cleaning', category: 'Home Cleaning', subcat: 'Deep Cleaning', price: 800, desc: 'Deep cleaning of kitchen including appliances', duration: 180, icon: '🍳' },
    { name: 'Bathroom Deep Cleaning', category: 'Home Cleaning', subcat: 'Deep Cleaning', price: 600, desc: 'Thorough bathroom and toilet deep cleaning', duration: 120, icon: '🛁' },
    { name: 'Carpet & Sofa Cleaning', category: 'Home Cleaning', subcat: 'Deep Cleaning', price: 1200, desc: 'Professional carpet and upholstery cleaning', duration: 180, icon: '🛋️' },
    { name: 'Window & Glass Cleaning', category: 'Home Cleaning', subcat: 'Deep Cleaning', price: 400, desc: 'Window glass and mirror deep cleaning', duration: 60, icon: '🪟' },
    
    { name: 'Weekly House Cleaning', category: 'Home Cleaning', subcat: 'Regular Cleaning', price: 600, desc: 'Weekly regular cleaning service', duration: 120, icon: '🧹' },
    { name: 'Daily Maid Service', category: 'Home Cleaning', subcat: 'Regular Cleaning', price: 300, desc: 'Daily house cleaning and maintenance', duration: 90, icon: '👩‍🦲' },
    { name: 'Monthly Maintenance Clean', category: 'Home Cleaning', subcat: 'Regular Cleaning', price: 1000, desc: 'Monthly comprehensive house cleaning', duration: 240, icon: '📅' },
    
    { name: 'Construction Debris Clean', category: 'Home Cleaning', subcat: 'Post-Construction Cleaning', price: 1500, desc: 'Post-construction cleaning and debris removal', duration: 300, icon: '🏗️' },
    { name: 'Paint & Dust Removal', category: 'Home Cleaning', subcat: 'Post-Construction Cleaning', price: 800, desc: 'Remove construction paint splatters and dust', duration: 180, icon: '🎨' },
    
    { name: 'Office Daily Cleaning', category: 'Home Cleaning', subcat: 'Office Cleaning', price: 500, desc: 'Daily office cleaning and sanitization', duration: 120, icon: '🏢' },
    { name: 'Conference Room Cleaning', category: 'Home Cleaning', subcat: 'Office Cleaning', price: 300, desc: 'Meeting room and presentation area cleaning', duration: 60, icon: '📊' },
    { name: 'Office Deep Sanitization', category: 'Home Cleaning', subcat: 'Office Cleaning', price: 1200, desc: 'Complete office sanitization and disinfection', duration: 180, icon: '🧴' },
    { name: 'Washroom Deep Cleaning', category: 'Home Cleaning', subcat: 'Office Cleaning', price: 400, desc: 'Office washroom thorough cleaning', duration: 90, icon: '🚻' },
    { name: 'Pantry Area Cleaning', category: 'Home Cleaning', subcat: 'Office Cleaning', price: 250, desc: 'Office kitchen and pantry cleaning', duration: 45, icon: '☕' },

    // Carpentry & Furniture (10 services)
    { name: 'Furniture Assembly', category: 'Carpentry & Furniture', subcat: 'Furniture Repair', price: 400, desc: 'Assembly of flat-pack and modular furniture', duration: 90, icon: '🪑' },
    { name: 'Chair & Table Repair', category: 'Carpentry & Furniture', subcat: 'Furniture Repair', price: 300, desc: 'Repair broken chairs, tables and wooden furniture', duration: 60, icon: '🪑' },
    { name: 'Bed & Mattress Setup', category: 'Carpentry & Furniture', subcat: 'Furniture Repair', price: 500, desc: 'Bed assembly and mattress installation', duration: 75, icon: '🛏️' },
    
    { name: 'Custom Wardrobe Making', category: 'Carpentry & Furniture', subcat: 'Custom Furniture', price: 15000, desc: 'Made-to-measure wardrobe with fittings', duration: 480, icon: '🚪' },
    { name: 'Kitchen Cabinet Install', category: 'Carpentry & Furniture', subcat: 'Cabinet Installation', price: 8000, desc: 'Modular kitchen cabinet installation', duration: 360, icon: '🏠' },
    { name: 'TV Unit Installation', category: 'Carpentry & Furniture', subcat: 'Custom Furniture', price: 1200, desc: 'Wall-mounted TV unit and entertainment center', duration: 120, icon: '📺' },
    
    { name: 'Door Installation', category: 'Carpentry & Furniture', subcat: 'Door & Window Services', price: 1500, desc: 'New door installation with frame and fittings', duration: 180, icon: '🚪' },
    { name: 'Window Frame Repair', category: 'Carpentry & Furniture', subcat: 'Door & Window Services', price: 600, desc: 'Window frame repair and hardware replacement', duration: 90, icon: '🪟' },
    { name: 'Door Lock Installation', category: 'Carpentry & Furniture', subcat: 'Door & Window Services', price: 300, desc: 'Digital and mechanical door lock installation', duration: 45, icon: '🔐' },
    { name: 'Sliding Door Setup', category: 'Carpentry & Furniture', subcat: 'Door & Window Services', price: 2000, desc: 'Sliding door installation with tracks', duration: 240, icon: '🚪' },

    // Beauty & Spa (10 services)
    { name: 'Classic Facial at Home', category: 'Beauty & Spa', subcat: 'Salon at Home', price: 800, desc: 'Professional facial treatment at your home', duration: 90, icon: '💆‍♀️' },
    { name: 'Hair Cut & Styling', category: 'Beauty & Spa', subcat: 'Salon at Home', price: 500, desc: 'Professional hair cutting and styling service', duration: 60, icon: '✂️' },
    { name: 'Manicure & Pedicure', category: 'Beauty & Spa', subcat: 'Salon at Home', price: 600, desc: 'Complete nail care and grooming', duration: 90, icon: '💅' },
    { name: 'Hair Spa Treatment', category: 'Beauty & Spa', subcat: 'Salon at Home', price: 1000, desc: 'Deep conditioning hair spa at home', duration: 120, icon: '💆‍♀️' },
    
    { name: 'Bridal Makeup', category: 'Beauty & Spa', subcat: 'Bridal Services', price: 5000, desc: 'Complete bridal makeup with hairstyling', duration: 180, icon: '👰' },
    { name: 'Pre-Wedding Beauty', category: 'Beauty & Spa', subcat: 'Bridal Services', price: 1500, desc: 'Pre-wedding beauty treatments and grooming', duration: 120, icon: '💒' },
    
    { name: 'Men\'s Haircut & Beard', category: 'Beauty & Spa', subcat: 'Men\'s Grooming', price: 400, desc: 'Professional men\'s haircut and beard styling', duration: 45, icon: '👨‍🦲' },
    { name: 'Men\'s Facial', category: 'Beauty & Spa', subcat: 'Men\'s Grooming', price: 600, desc: 'Deep cleansing facial for men', duration: 60, icon: '👨' },
    
    { name: 'Full Body Massage', category: 'Beauty & Spa', subcat: 'Massage & Spa', price: 1200, desc: 'Relaxing full body massage therapy', duration: 90, icon: '💆' },
    { name: 'Aromatherapy Session', category: 'Beauty & Spa', subcat: 'Massage & Spa', price: 1000, desc: 'Stress relief aromatherapy massage', duration: 75, icon: '🌸' },

    // Appliance Repair (10 services)
    { name: 'AC Service & Repair', category: 'Appliance Repair', subcat: 'AC Repair', price: 800, desc: 'Air conditioner service, gas refill and repair', duration: 120, icon: '❄️' },
    { name: 'AC Installation', category: 'Appliance Repair', subcat: 'AC Repair', price: 1200, desc: 'Split AC installation with pipe work', duration: 180, icon: '❄️' },
    { name: 'AC Deep Cleaning', category: 'Appliance Repair', subcat: 'AC Repair', price: 600, desc: 'Deep cleaning of AC filters and coils', duration: 90, icon: '🧽' },
    
    { name: 'Washing Machine Repair', category: 'Appliance Repair', subcat: 'Washing Machine', price: 500, desc: 'Washing machine repair and part replacement', duration: 90, icon: '👔' },
    { name: 'Dryer Repair Service', category: 'Appliance Repair', subcat: 'Washing Machine', price: 600, desc: 'Clothes dryer repair and maintenance', duration: 75, icon: '🌀' },
    
    { name: 'Refrigerator Repair', category: 'Appliance Repair', subcat: 'Refrigerator', price: 700, desc: 'Fridge repair including cooling and electrical', duration: 120, icon: '❄️' },
    { name: 'Freezer Repair', category: 'Appliance Repair', subcat: 'Refrigerator', price: 600, desc: 'Deep freezer repair and gas refill', duration: 90, icon: '🧊' },
    
    { name: 'Microwave Repair', category: 'Appliance Repair', subcat: 'Microwave & Electronics', price: 400, desc: 'Microwave oven repair and part replacement', duration: 60, icon: '📱' },
    { name: 'TV Repair Service', category: 'Appliance Repair', subcat: 'Microwave & Electronics', price: 800, desc: 'LED/LCD TV repair and screen replacement', duration: 120, icon: '📺' },
    { name: 'Chimney Repair', category: 'Appliance Repair', subcat: 'Microwave & Electronics', price: 500, desc: 'Kitchen chimney motor and filter repair', duration: 75, icon: '💨' },

    // Painting Services (8 services)
    { name: '1 Room Interior Paint', category: 'Painting Services', subcat: 'Interior Painting', price: 3000, desc: 'Complete room painting with premium paint', duration: 360, icon: '🎨' },
    { name: '2BHK Full House Paint', category: 'Painting Services', subcat: 'Interior Painting', price: 15000, desc: 'Complete 2BHK apartment interior painting', duration: 720, icon: '🏠' },
    { name: 'Kitchen & Bathroom Paint', category: 'Painting Services', subcat: 'Interior Painting', price: 4000, desc: 'Waterproof painting for kitchen and bathroom', duration: 300, icon: '🛁' },
    
    { name: 'Exterior House Painting', category: 'Painting Services', subcat: 'Exterior Painting', price: 8000, desc: 'Weather-resistant exterior house painting', duration: 480, icon: '🏠' },
    { name: 'Building Facade Paint', category: 'Painting Services', subcat: 'Exterior Painting', price: 12000, desc: 'Commercial building exterior painting', duration: 600, icon: '🏢' },
    
    { name: 'Textured Wall Finish', category: 'Painting Services', subcat: 'Wall Texturing', price: 5000, desc: 'Designer textured wall finishes and patterns', duration: 420, icon: '🖼️' },
    { name: 'Wallpaper Installation', category: 'Painting Services', subcat: 'Wall Texturing', price: 2000, desc: 'Premium wallpaper installation service', duration: 240, icon: '📄' },
    
    { name: 'Furniture Polishing', category: 'Painting Services', subcat: 'Wood Polishing', price: 1500, desc: 'Wood furniture polishing and refinishing', duration: 180, icon: '🪑' },

    // Pest Control (7 services)
    { name: 'Full House Pest Control', category: 'Pest Control', subcat: 'General Pest Control', price: 1200, desc: 'Complete house pest control with warranty', duration: 120, icon: '🏠' },
    { name: 'Kitchen Pest Treatment', category: 'Pest Control', subcat: 'General Pest Control', price: 600, desc: 'Targeted kitchen area pest control', duration: 60, icon: '🍳' },
    
    { name: 'Anti-Termite Treatment', category: 'Pest Control', subcat: 'Termite Treatment', price: 2500, desc: 'Professional termite treatment with guarantee', duration: 180, icon: '🐛' },
    { name: 'Pre-Construction Termite', category: 'Pest Control', subcat: 'Termite Treatment', price: 5000, desc: 'Pre-construction anti-termite soil treatment', duration: 300, icon: '🏗️' },
    
    { name: 'Cockroach Control', category: 'Pest Control', subcat: 'Cockroach Treatment', price: 800, desc: 'Targeted cockroach elimination treatment', duration: 90, icon: '🪳' },
    
    { name: 'Rat & Mice Control', category: 'Pest Control', subcat: 'Rodent Control', price: 1000, desc: 'Safe and effective rodent control service', duration: 120, icon: '🐭' },
    { name: 'Bird Netting Service', category: 'Pest Control', subcat: 'Rodent Control', price: 1500, desc: 'Balcony and terrace bird control netting', duration: 180, icon: '🕊️' }
  ];

  // Create categories and subcategories
  console.log('📋 Creating service categories...');
  const categoryIds: { [key: string]: string } = {};
  
  for (const mainCat of mainCategories) {
    // Create main category
    const [category] = await db.insert(serviceCategories).values({
      name: mainCat.name,
      slug: mainCat.slug,
      icon: mainCat.icon,
      description: mainCat.description,
      level: 0,
      sortOrder: mainCategories.indexOf(mainCat),
      isActive: true,
      serviceCount: 0
    }).returning();
    
    categoryIds[mainCat.name] = category.id;
    
    // Create subcategories
    for (const subcat of mainCat.subcategories) {
      const [subcategory] = await db.insert(serviceCategories).values({
        name: subcat,
        slug: subcat.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        icon: mainCat.icon,
        description: `${subcat} services under ${mainCat.name}`,
        parentId: category.id,
        level: 1,
        sortOrder: mainCat.subcategories.indexOf(subcat),
        isActive: true,
        serviceCount: 0
      }).returning();
    }
  }

  // Create comprehensive services
  console.log('🛠️ Creating 100 comprehensive services...');
  for (const service of allServices) {
    const categoryId = categoryIds[service.category];
    
    await db.insert(services).values({
      name: service.name,
      slug: service.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: service.desc,
      categoryId: categoryId,
      basePrice: service.price.toString(),
      estimatedDuration: service.duration,
      icon: service.icon,
      iconType: 'emoji',
      iconValue: service.icon,
      rating: (4.2 + Math.random() * 0.6).toFixed(1),
      totalBookings: Math.floor(Math.random() * 100) + 10,
      isActive: true,
      allowInstantBooking: true,
      allowScheduledBooking: true,
      advanceBookingDays: 7,
      isTestService: false
    });
  }

  // Create 5 verified service providers
  console.log('👥 Creating 5 service providers...');
  const providerData = [
    {
      businessName: 'ElectroTech Solutions',
      contactPerson: 'Rajesh Kumar',
      phone: '+91-9876543210',
      email: 'rajesh@electrotech.in',
      category: 'Electrical Services',
      experience: 8,
      skills: ['Wiring', 'Smart Home', 'Emergency Repair'],
      areas: ['South Delhi', 'Greater Kailash', 'Defence Colony']
    },
    {
      businessName: 'PurePlumbing Services', 
      contactPerson: 'Amit Sharma',
      phone: '+91-9876543211',
      email: 'amit@pureplumbing.in',
      category: 'Plumbing Services',
      experience: 6,
      skills: ['Pipe Installation', 'Leak Repair', 'Bathroom Fitting'],
      areas: ['Gurgaon', 'DLF', 'Cyber City']
    },
    {
      businessName: 'SparkleClean Home',
      contactPerson: 'Priya Singh',
      phone: '+91-9876543212', 
      email: 'priya@sparkleclean.in',
      category: 'Home Cleaning',
      experience: 4,
      skills: ['Deep Cleaning', 'Office Cleaning', 'Sanitization'],
      areas: ['Noida', 'Greater Noida', 'Ghaziabad']
    },
    {
      businessName: 'WoodCraft Masters',
      contactPerson: 'Suresh Yadav',
      phone: '+91-9876543213',
      email: 'suresh@woodcraft.in', 
      category: 'Carpentry & Furniture',
      experience: 12,
      skills: ['Custom Furniture', 'Repair', 'Installation'],
      areas: ['Bangalore', 'Koramangala', 'Indiranagar']
    },
    {
      businessName: 'GlowBeauty At Home',
      contactPerson: 'Neha Gupta',
      phone: '+91-9876543214',
      email: 'neha@glowbeauty.in',
      category: 'Beauty & Spa',
      experience: 5,
      skills: ['Bridal Makeup', 'Facials', 'Hair Styling'],
      areas: ['Mumbai', 'Bandra', 'Juhu']
    }
  ];

  for (const provider of providerData) {
    // Create user account for provider
    const [user] = await db.insert(users).values({
      phone: provider.phone.replace(/\D/g, ''),
      email: provider.email,
      firstName: provider.contactPerson.split(' ')[0],
      lastName: provider.contactPerson.split(' ')[1] || '',
      role: 'service_provider',
      isActive: true
    }).returning();

    // Create service provider profile
    await db.insert(serviceProviders).values({
      userId: user.id,
      categoryId: categoryIds[provider.category],
      businessName: provider.businessName,
      businessType: 'Individual',
      skills: provider.skills,
      experienceYears: provider.experience,
      isVerified: true,
      verificationLevel: 'premium',
      verificationStatus: 'verified',
      verificationDate: new Date(),
      rating: (4.3 + Math.random() * 0.5).toFixed(1),
      totalCompletedOrders: Math.floor(Math.random() * 150) + 50,
      completionRate: (92 + Math.random() * 7).toFixed(1),
      onTimeRate: (88 + Math.random() * 10).toFixed(1),
      isOnline: true,
      isAvailable: true,
      serviceAreas: provider.areas,
      serviceRadius: 15,
      avgResponseTime: Math.floor(Math.random() * 20) + 10
    });
  }

  // Create 5 parts providers
  console.log('🔧 Creating 5 parts providers...');
  const partsProviderData = [
    {
      name: 'ElectroMart Parts Supply',
      contact: 'Vikram Electrical Stores',
      email: 'orders@electromart.in',
      phone: '+91-11-25671234',
      address: { street: 'Chandni Chowk', city: 'New Delhi', state: 'Delhi', pincode: '110006' },
      gst: '07AABCV1234F1Z5',
      specializes: ['Electrical Parts', 'Switches', 'Wiring', 'Smart Devices']
    },
    {
      name: 'AquaFlow Plumbing Supplies',
      contact: 'Mohanlal Trading Co.',
      email: 'supply@aquaflow.in',
      phone: '+91-22-26781234',
      address: { street: 'Crawford Market', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
      gst: '27AABCA1234B1Z5', 
      specializes: ['Pipes', 'Fittings', 'Taps', 'Bathroom Accessories']
    },
    {
      name: 'CleanPro Equipment Hub',
      contact: 'Rajesh Cleaning Solutions',
      email: 'info@cleanpro.in', 
      phone: '+91-80-28341234',
      address: { street: 'Commercial Street', city: 'Bangalore', state: 'Karnataka', pincode: '560001' },
      gst: '29AABCC1234C1Z5',
      specializes: ['Cleaning Chemicals', 'Equipment', 'Sanitizers', 'Tools']
    },
    {
      name: 'WoodWorks Material Supply',
      contact: 'Carpenter Tools & Woods',
      email: 'materials@woodworks.in',
      phone: '+91-33-22451234', 
      address: { street: 'Burrabazar', city: 'Kolkata', state: 'West Bengal', pincode: '700007' },
      gst: '19AABCW1234W1Z5',
      specializes: ['Wood', 'Hardware', 'Adhesives', 'Polish & Finishes']
    },
    {
      name: 'BeautySupplies Direct',
      contact: 'Cosmetic Distributors Ltd',
      email: 'wholesale@beautysupplies.in',
      phone: '+91-44-28561234',
      address: { street: 'T.Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600017' },
      gst: '33AABCB1234D1Z5',
      specializes: ['Cosmetics', 'Beauty Tools', 'Salon Equipment', 'Skincare']
    }
  ];

  for (const partsProvider of partsProviderData) {
    await db.insert(partsSuppliers).values({
      name: partsProvider.name,
      contactPerson: partsProvider.contact,
      email: partsProvider.email,
      phone: partsProvider.phone,
      address: partsProvider.address,
      gstNumber: partsProvider.gst,
      paymentTerms: '30 days',
      creditLimit: (50000 + Math.random() * 100000).toFixed(0),
      qualityRating: (4.1 + Math.random() * 0.7).toFixed(1),
      avgDeliveryTime: Math.floor(Math.random() * 5) + 2,
      isActive: true,
      notes: `Specializes in: ${partsProvider.specializes.join(', ')}`
    });
  }

  // Create parts categories
  console.log('🏷️ Creating parts categories...');
  const partsCategoriesData = [
    { name: 'Electrical Components', desc: 'Wires, switches, sockets, MCBs' },
    { name: 'Plumbing Parts', desc: 'Pipes, fittings, valves, taps' },
    { name: 'Cleaning Supplies', desc: 'Chemicals, equipment, tools' },
    { name: 'Hardware & Tools', desc: 'Screws, nails, tools, adhesives' },
    { name: 'Beauty Products', desc: 'Cosmetics, tools, equipment' },
    { name: 'Appliance Parts', desc: 'Spare parts for appliances' },
    { name: 'Paint & Finishes', desc: 'Paints, brushes, primers' },
    { name: 'Pest Control Products', desc: 'Pesticides, traps, equipment' }
  ];

  for (const partsCat of partsCategoriesData) {
    await db.insert(partsCategories).values({
      name: partsCat.name,
      description: partsCat.desc,
      isActive: true,
      sortOrder: partsCategoriesData.indexOf(partsCat)
    });
  }

  console.log('✅ Comprehensive marketplace seeding completed!');
  console.log(`📊 Summary:`);
  console.log(`• Main Categories: ${mainCategories.length}`);
  console.log(`• Services Created: ${allServices.length}`);  
  console.log(`• Service Providers: ${providerData.length}`);
  console.log(`• Parts Providers: ${partsProviderData.length}`);
  console.log(`• Parts Categories: ${partsCategoriesData.length}`);

  return {
    categoriesCreated: mainCategories.length * 5, // Including subcategories 
    servicesCreated: allServices.length,
    providersCreated: providerData.length,
    partsProvidersCreated: partsProviderData.length
  };
}