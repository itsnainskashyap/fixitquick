-- Comprehensive Service Structure Population for FixitQuick Platform
-- This script creates all main categories, subcategories, and services with realistic Indian market pricing

-- Clear existing data (commented out for safety)
-- DELETE FROM services;
-- DELETE FROM service_categories WHERE level > 0;
-- DELETE FROM service_categories WHERE slug IN ('electrician', 'plumber', 'cleaner', 'carpentry', 'pest-control', 'technology-device-repair', 'beauty-wellness-new', 'automotive-new');

-- 1. CREATE MAIN CATEGORIES (Level 0)

-- Electrician
INSERT INTO service_categories (id, name, slug, icon, description, level, sort_order, is_active)
VALUES (gen_random_uuid(), 'Electrician', 'electrician', '⚡', 'Electrical installation, repair and maintenance services', 0, 1, true)
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- Plumber  
INSERT INTO service_categories (id, name, slug, icon, description, level, sort_order, is_active)
VALUES (gen_random_uuid(), 'Plumber', 'plumber', '🔧', 'Plumbing installation, repair and maintenance services', 0, 2, true)
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- Cleaner
INSERT INTO service_categories (id, name, slug, icon, description, level, sort_order, is_active)
VALUES (gen_random_uuid(), 'Cleaner', 'cleaner-new', '🧹', 'Professional cleaning services for homes and offices', 0, 3, true)
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- Carpentry
INSERT INTO service_categories (id, name, slug, icon, description, level, sort_order, is_active)
VALUES (gen_random_uuid(), 'Carpentry', 'carpentry', '🔨', 'Woodwork, furniture repair and carpentry services', 0, 4, true)
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- Pest Control
INSERT INTO service_categories (id, name, slug, icon, description, level, sort_order, is_active)
VALUES (gen_random_uuid(), 'Pest Control', 'pest-control', '🐛', 'Professional pest control and extermination services', 0, 5, true)
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- Technology (Device Repair)
INSERT INTO service_categories (id, name, slug, icon, description, level, sort_order, is_active)
VALUES (gen_random_uuid(), 'Technology (Device Repair)', 'technology-device-repair', '📱', 'Device repair and technology support services', 0, 6, true)
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- Beauty & Wellness
INSERT INTO service_categories (id, name, slug, icon, description, level, sort_order, is_active)
VALUES (gen_random_uuid(), 'Beauty & Wellness', 'beauty-wellness-new', '💅', 'Professional beauty and wellness services at home', 0, 7, true)
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- Automotive
INSERT INTO service_categories (id, name, slug, icon, description, level, sort_order, is_active)
VALUES (gen_random_uuid(), 'Automotive', 'automotive-new', '🚗', 'Vehicle maintenance and repair services', 0, 8, true)
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- 2. CREATE SUBCATEGORIES (Level 1) 

-- ELECTRICIAN SUBCATEGORIES
INSERT INTO service_categories (id, parent_id, name, slug, icon, description, level, sort_order, is_active)
SELECT gen_random_uuid(), sc.id, 'Home Wiring', 'home-wiring', '🔌', 'Complete home electrical wiring solutions', 1, 1, true
FROM service_categories sc WHERE sc.slug = 'electrician'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO service_categories (id, parent_id, name, slug, icon, description, level, sort_order, is_active)
SELECT gen_random_uuid(), sc.id, 'Appliance Repair', 'appliance-repair', '🔧', 'Electrical appliance repair and maintenance', 1, 2, true
FROM service_categories sc WHERE sc.slug = 'electrician'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO service_categories (id, parent_id, name, slug, icon, description, level, sort_order, is_active)
SELECT gen_random_uuid(), sc.id, 'Electrical Emergency', 'electrical-emergency', '🚨', 'Emergency electrical repair services', 1, 3, true
FROM service_categories sc WHERE sc.slug = 'electrician'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- PLUMBER SUBCATEGORIES
INSERT INTO service_categories (id, parent_id, name, slug, icon, description, level, sort_order, is_active)
SELECT gen_random_uuid(), sc.id, 'Pipe Works', 'pipe-works', '🚰', 'Water pipe installation, repair and maintenance', 1, 1, true
FROM service_categories sc WHERE sc.slug = 'plumber'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO service_categories (id, parent_id, name, slug, icon, description, level, sort_order, is_active)
SELECT gen_random_uuid(), sc.id, 'Bathroom Fitting', 'bathroom-fitting', '🚿', 'Complete bathroom fixture installation and repair', 1, 2, true
FROM service_categories sc WHERE sc.slug = 'plumber'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO service_categories (id, parent_id, name, slug, icon, description, level, sort_order, is_active)
SELECT gen_random_uuid(), sc.id, 'Emergency Plumbing', 'emergency-plumbing', '🚨', 'Emergency plumbing repair services', 1, 3, true
FROM service_categories sc WHERE sc.slug = 'plumber'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- CLEANER SUBCATEGORIES
INSERT INTO service_categories (id, parent_id, name, slug, icon, description, level, sort_order, is_active)
SELECT gen_random_uuid(), sc.id, 'Home Cleaning', 'home-cleaning', '🏠', 'Comprehensive home cleaning services', 1, 1, true
FROM service_categories sc WHERE sc.slug = 'cleaner-new'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO service_categories (id, parent_id, name, slug, icon, description, level, sort_order, is_active)
SELECT gen_random_uuid(), sc.id, 'Specialized Cleaning', 'specialized-cleaning', '✨', 'Specialized cleaning for specific items and areas', 1, 2, true
FROM service_categories sc WHERE sc.slug = 'cleaner-new'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- CARPENTRY SUBCATEGORIES
INSERT INTO service_categories (id, parent_id, name, slug, icon, description, level, sort_order, is_active)
SELECT gen_random_uuid(), sc.id, 'Furniture Repair', 'furniture-repair', '🪑', 'Repair and restoration of furniture items', 1, 1, true
FROM service_categories sc WHERE sc.slug = 'carpentry'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO service_categories (id, parent_id, name, slug, icon, description, level, sort_order, is_active)
SELECT gen_random_uuid(), sc.id, 'Custom Carpentry', 'custom-carpentry', '🔨', 'Custom furniture and carpentry work', 1, 2, true
FROM service_categories sc WHERE sc.slug = 'carpentry'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- PEST CONTROL SUBCATEGORIES
INSERT INTO service_categories (id, parent_id, name, slug, icon, description, level, sort_order, is_active)
SELECT gen_random_uuid(), sc.id, 'Residential Pest Control', 'residential-pest-control', '🏠', 'Comprehensive pest control for homes', 1, 1, true
FROM service_categories sc WHERE sc.slug = 'pest-control'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO service_categories (id, parent_id, name, slug, icon, description, level, sort_order, is_active)
SELECT gen_random_uuid(), sc.id, 'Specialized Treatments', 'specialized-treatments', '🔬', 'Specialized pest control treatments', 1, 2, true
FROM service_categories sc WHERE sc.slug = 'pest-control'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- TECHNOLOGY SUBCATEGORIES
INSERT INTO service_categories (id, parent_id, name, slug, icon, description, level, sort_order, is_active)
SELECT gen_random_uuid(), sc.id, 'Mobile & Laptop Repair', 'mobile-laptop-repair', '📱', 'Smartphone and laptop repair services', 1, 1, true
FROM service_categories sc WHERE sc.slug = 'technology-device-repair'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO service_categories (id, parent_id, name, slug, icon, description, level, sort_order, is_active)
SELECT gen_random_uuid(), sc.id, 'Computer Support', 'computer-support', '💻', 'Computer hardware and software support', 1, 2, true
FROM service_categories sc WHERE sc.slug = 'technology-device-repair'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- BEAUTY & WELLNESS SUBCATEGORIES
INSERT INTO service_categories (id, parent_id, name, slug, icon, description, level, sort_order, is_active)
SELECT gen_random_uuid(), sc.id, 'Women''s Beauty', 'womens-beauty', '💄', 'Beauty services for women', 1, 1, true
FROM service_categories sc WHERE sc.slug = 'beauty-wellness-new'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO service_categories (id, parent_id, name, slug, icon, description, level, sort_order, is_active)
SELECT gen_random_uuid(), sc.id, 'Men''s Grooming', 'mens-grooming', '💇‍♂️', 'Grooming services for men', 1, 2, true
FROM service_categories sc WHERE sc.slug = 'beauty-wellness-new'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO service_categories (id, parent_id, name, slug, icon, description, level, sort_order, is_active)
SELECT gen_random_uuid(), sc.id, 'Wellness & Massage', 'wellness-massage', '💆', 'Wellness and therapeutic massage services', 1, 3, true
FROM service_categories sc WHERE sc.slug = 'beauty-wellness-new'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- AUTOMOTIVE SUBCATEGORIES
INSERT INTO service_categories (id, parent_id, name, slug, icon, description, level, sort_order, is_active)
SELECT gen_random_uuid(), sc.id, 'Car Service', 'car-service', '🔧', 'Regular car maintenance and servicing', 1, 1, true
FROM service_categories sc WHERE sc.slug = 'automotive-new'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO service_categories (id, parent_id, name, slug, icon, description, level, sort_order, is_active)
SELECT gen_random_uuid(), sc.id, 'Bike Service', 'bike-service', '🏍️', 'Motorcycle and bike maintenance services', 1, 2, true
FROM service_categories sc WHERE sc.slug = 'automotive-new'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO service_categories (id, parent_id, name, slug, icon, description, level, sort_order, is_active)
SELECT gen_random_uuid(), sc.id, 'Emergency Roadside', 'emergency-roadside', '🆘', 'Emergency roadside assistance services', 1, 3, true
FROM service_categories sc WHERE sc.slug = 'automotive-new'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- 3. CREATE SERVICES WITH REALISTIC INDIAN MARKET PRICING

-- ELECTRICIAN SERVICES

-- Home Wiring Services
INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'New Electrical Installation', 'new-electrical-installation', 'Complete electrical installation for new homes or major renovations', 8000.00, 480, '🔌', 'emoji', '🔌', 4.5, 0, true, false, true, 7
FROM service_categories sc WHERE sc.slug = 'home-wiring'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Home Rewiring Service', 'home-rewiring-service', 'Complete rewiring of old electrical systems for safety and efficiency', 12000.00, 720, '⚡', 'emoji', '⚡', 4.5, 0, true, false, true, 7
FROM service_categories sc WHERE sc.slug = 'home-wiring'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Switch & Socket Installation', 'switch-socket-installation', 'Installation and replacement of electrical switches and sockets', 150.00, 30, '🔘', 'emoji', '🔘', 4.7, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'home-wiring'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'MCB & DB Installation', 'mcb-db-installation', 'Main distribution board and MCB installation or upgrades', 2500.00, 180, '⚡', 'emoji', '⚡', 4.4, 0, true, false, true, 7
FROM service_categories sc WHERE sc.slug = 'home-wiring'
ON CONFLICT (slug) DO NOTHING;

-- Appliance Repair Services
INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Ceiling Fan Repair', 'ceiling-fan-repair', 'Repair and maintenance of ceiling fans including motor and blade issues', 300.00, 60, '🪬', 'emoji', '🪬', 4.6, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'appliance-repair'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'AC Repair & Service', 'ac-repair-service', 'Air conditioner repair, gas filling and general maintenance', 500.00, 90, '❄️', 'emoji', '❄️', 4.4, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'appliance-repair'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'LED & Bulb Installation', 'led-bulb-installation', 'Installation and replacement of LED lights and bulbs', 100.00, 20, '💡', 'emoji', '💡', 4.8, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'appliance-repair'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Water Heater Repair', 'water-heater-repair', 'Electric water heater and geyser repair services', 400.00, 75, '🚿', 'emoji', '🚿', 4.3, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'appliance-repair'
ON CONFLICT (slug) DO NOTHING;

-- Electrical Emergency Services
INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Power Outage Fix', 'power-outage-fix', 'Emergency power restoration and electrical fault diagnosis', 800.00, 120, '⚡', 'emoji', '⚡', 4.2, 0, true, true, true, 1
FROM service_categories sc WHERE sc.slug = 'electrical-emergency'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Short Circuit Repair', 'short-circuit-repair', 'Emergency short circuit detection and repair', 600.00, 90, '🚨', 'emoji', '🚨', 4.3, 0, true, true, true, 1
FROM service_categories sc WHERE sc.slug = 'electrical-emergency'
ON CONFLICT (slug) DO NOTHING;

-- PLUMBER SERVICES

-- Pipe Works Services
INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Pipe Installation', 'pipe-installation', 'New water pipe installation for homes and commercial spaces', 1500.00, 240, '🚰', 'emoji', '🚰', 4.4, 0, true, false, true, 7
FROM service_categories sc WHERE sc.slug = 'pipe-works'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Pipe Leak Repair', 'pipe-leak-repair', 'Detection and repair of water pipe leaks', 350.00, 60, '💧', 'emoji', '💧', 4.6, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'pipe-works'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Pipe Blockage Clearing', 'pipe-blockage-clearing', 'Clearing blocked water pipes and drainage systems', 400.00, 90, '🔧', 'emoji', '🔧', 4.5, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'pipe-works'
ON CONFLICT (slug) DO NOTHING;

-- Bathroom Fitting Services
INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Toilet Installation', 'toilet-installation', 'Complete toilet and commode installation with fittings', 800.00, 180, '🚽', 'emoji', '🚽', 4.3, 0, true, false, true, 7
FROM service_categories sc WHERE sc.slug = 'bathroom-fitting'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Tap & Faucet Repair', 'tap-faucet-repair', 'Kitchen and bathroom tap repair and replacement', 200.00, 45, '🚰', 'emoji', '🚰', 4.7, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'bathroom-fitting'
ON CONFLICT (slug) DO NOTHING;

-- Emergency Plumbing Services
INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Emergency Leak Fix', 'emergency-leak-fix', 'Urgent water leak repair and damage control', 700.00, 90, '💧', 'emoji', '💧', 4.2, 0, true, true, true, 1
FROM service_categories sc WHERE sc.slug = 'emergency-plumbing'
ON CONFLICT (slug) DO NOTHING;

-- CLEANING SERVICES

-- Home Cleaning Services
INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Regular House Cleaning', 'regular-house-cleaning', 'Regular deep cleaning of entire house including all rooms', 800.00, 180, '🧹', 'emoji', '🧹', 4.6, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'home-cleaning'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Kitchen Deep Cleaning', 'kitchen-deep-cleaning', 'Thorough kitchen cleaning including appliances and chimney', 600.00, 120, '🍳', 'emoji', '🍳', 4.5, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'home-cleaning'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Bathroom Deep Cleaning', 'bathroom-deep-cleaning', 'Complete bathroom sanitization and deep cleaning', 400.00, 90, '🚿', 'emoji', '🚿', 4.7, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'home-cleaning'
ON CONFLICT (slug) DO NOTHING;

-- Specialized Cleaning Services
INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Sofa & Carpet Cleaning', 'sofa-carpet-cleaning', 'Professional sofa, carpet and upholstery cleaning', 500.00, 120, '🛋️', 'emoji', '🛋️', 4.4, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'specialized-cleaning'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'AC Deep Cleaning', 'ac-deep-cleaning', 'Split and window AC deep cleaning and sanitization', 700.00, 90, '❄️', 'emoji', '❄️', 4.3, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'specialized-cleaning'
ON CONFLICT (slug) DO NOTHING;

-- CARPENTRY SERVICES

-- Furniture Repair Services
INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Chair & Table Repair', 'chair-table-repair', 'Repair of wooden chairs, tables and dining furniture', 400.00, 90, '🪑', 'emoji', '🪑', 4.5, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'furniture-repair'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Door & Window Repair', 'door-window-repair', 'Wooden door and window frame repair and maintenance', 500.00, 120, '🚪', 'emoji', '🚪', 4.4, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'furniture-repair'
ON CONFLICT (slug) DO NOTHING;

-- Custom Carpentry Services
INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Custom Furniture Making', 'custom-furniture-making', 'Custom designed furniture creation and installation', 2000.00, 480, '🪑', 'emoji', '🪑', 4.6, 0, true, false, true, 14
FROM service_categories sc WHERE sc.slug = 'custom-carpentry'
ON CONFLICT (slug) DO NOTHING;

-- PEST CONTROL SERVICES

-- Residential Pest Control Services
INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Cockroach Control', 'cockroach-control', 'Complete cockroach extermination and prevention treatment', 800.00, 120, '🪳', 'emoji', '🪳', 4.3, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'residential-pest-control'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'General Pest Control', 'general-pest-control', 'Comprehensive treatment for multiple household pests', 1200.00, 150, '🐛', 'emoji', '🐛', 4.4, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'residential-pest-control'
ON CONFLICT (slug) DO NOTHING;

-- Specialized Treatments
INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Bed Bug Treatment', 'bed-bug-treatment', 'Complete bed bug elimination and mattress treatment', 1000.00, 120, '🛏️', 'emoji', '🛏️', 4.2, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'specialized-treatments'
ON CONFLICT (slug) DO NOTHING;

-- TECHNOLOGY SERVICES

-- Mobile & Laptop Repair Services
INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Mobile Screen Repair', 'mobile-screen-repair', 'Smartphone screen replacement and repair services', 1500.00, 90, '📱', 'emoji', '📱', 4.5, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'mobile-laptop-repair'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Battery Replacement', 'battery-replacement', 'Mobile and laptop battery replacement services', 800.00, 60, '🔋', 'emoji', '🔋', 4.6, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'mobile-laptop-repair'
ON CONFLICT (slug) DO NOTHING;

-- Computer Support Services
INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Virus Removal & Security', 'virus-removal-security', 'Computer virus removal and security setup', 500.00, 120, '🛡️', 'emoji', '🛡️', 4.4, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'computer-support'
ON CONFLICT (slug) DO NOTHING;

-- BEAUTY & WELLNESS SERVICES

-- Women's Beauty Services
INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Hair Cut & Styling', 'hair-cut-styling', 'Professional hair cutting and styling at home', 400.00, 90, '✂️', 'emoji', '✂️', 4.6, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'womens-beauty'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Manicure & Pedicure', 'manicure-pedicure', 'Professional nail care and beauty treatment', 600.00, 90, '💅', 'emoji', '💅', 4.7, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'womens-beauty'
ON CONFLICT (slug) DO NOTHING;

-- Men's Grooming Services
INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Men''s Haircut', 'mens-haircut', 'Professional men''s haircut and styling', 250.00, 60, '✂️', 'emoji', '✂️', 4.5, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'mens-grooming'
ON CONFLICT (slug) DO NOTHING;

-- Wellness & Massage Services
INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Full Body Massage', 'full-body-massage', 'Relaxing full body therapeutic massage', 1200.00, 90, '💆', 'emoji', '💆', 4.4, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'wellness-massage'
ON CONFLICT (slug) DO NOTHING;

-- AUTOMOTIVE SERVICES

-- Car Service Services
INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Basic Car Service', 'basic-car-service', 'Basic car servicing including oil change and checkup', 1500.00, 180, '🚗', 'emoji', '🚗', 4.3, 0, true, false, true, 7
FROM service_categories sc WHERE sc.slug = 'car-service'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Car Wash & Detailing', 'car-wash-detailing', 'Professional car washing and interior detailing', 500.00, 120, '🚿', 'emoji', '🚿', 4.5, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'car-service'
ON CONFLICT (slug) DO NOTHING;

-- Bike Service Services
INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Basic Bike Service', 'basic-bike-service', 'Basic motorcycle servicing and maintenance', 800.00, 120, '🏍️', 'emoji', '🏍️', 4.4, 0, true, true, true, 7
FROM service_categories sc WHERE sc.slug = 'bike-service'
ON CONFLICT (slug) DO NOTHING;

-- Emergency Roadside Services
INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Battery Jump Start', 'battery-jump-start', 'Emergency car battery jump start service', 400.00, 30, '🔋', 'emoji', '🔋', 4.2, 0, true, true, true, 1
FROM service_categories sc WHERE sc.slug = 'emergency-roadside'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (id, category_id, name, slug, description, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking, advance_booking_days)
SELECT gen_random_uuid(), sc.id, 'Flat Tire Change', 'flat-tire-change', 'Emergency flat tire replacement service', 300.00, 45, '🛞', 'emoji', '🛞', 4.3, 0, true, true, true, 1
FROM service_categories sc WHERE sc.slug = 'emergency-roadside'
ON CONFLICT (slug) DO NOTHING;