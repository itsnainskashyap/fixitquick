-- Comprehensive Urban Company-style Marketplace Seeding
-- Direct SQL approach for reliable seeding

-- Clear existing test data (optional, only for fresh seeding)
-- DELETE FROM services WHERE name LIKE '%test%' OR name LIKE '%Test%';

-- Insert 100+ Services with realistic Indian pricing
INSERT INTO services (name, slug, description, category_id, base_price, estimated_duration, icon, icon_type, icon_value, rating, total_bookings, is_active, allow_instant_booking, allow_scheduled_booking) VALUES

-- ELECTRICIAN SERVICES (using existing electrician category)
('Smart Home Automation Complete', 'smart-home-automation-complete', 'Full home automation with voice control, smart switches, and mobile app integration', '01324448-e26a-4e98-870e-27dfe90e2786', '15000.00', 480, '🏠', 'emoji', '🏠', '4.7', 8, true, false, true),
('LED Strip Lighting Installation', 'led-strip-lighting-installation', 'Decorative LED strip lights for living rooms, bedrooms, and kitchens', '01324448-e26a-4e98-870e-27dfe90e2786', '800.00', 120, '💡', 'emoji', '💡', '4.3', 45, true, true, true),
('Generator Installation & Setup', 'generator-installation-setup', 'Portable generator installation with auto-start and transfer switch', '01324448-e26a-4e98-870e-27dfe90e2786', '5000.00', 300, '⚡', 'emoji', '⚡', '4.5', 12, true, false, true),
('Solar Panel Electrical Setup', 'solar-panel-electrical-setup', 'Solar panel wiring, inverter setup, and grid connection', '01324448-e26a-4e98-870e-27dfe90e2786', '8000.00', 360, '☀️', 'emoji', '☀️', '4.6', 6, true, false, true),
('Emergency Power Backup', 'emergency-power-backup', '24x7 emergency electrical restoration service', '01324448-e26a-4e98-870e-27dfe90e2786', '1200.00', 120, '🚨', 'emoji', '🚨', '4.4', 23, true, true, true),

-- PLUMBING SERVICES (using existing plumber category)
('Premium Bathroom Suite Install', 'premium-bathroom-suite-install', 'Luxury bathroom installation with imported fittings and accessories', 'fb475664-1aee-4df1-847a-27ae5526f72d', '25000.00', 720, '🛁', 'emoji', '🛁', '4.8', 4, true, false, true),
('Modular Kitchen Plumbing', 'modular-kitchen-plumbing', 'Complete kitchen plumbing for modular kitchen with dishwasher setup', 'fb475664-1aee-4df1-847a-27ae5526f72d', '3500.00', 240, '🚰', 'emoji', '🚰', '4.5', 18, true, false, true),
('Swimming Pool Plumbing', 'swimming-pool-plumbing', 'Pool filtration system, pumps, and chemical dosing setup', 'fb475664-1aee-4df1-847a-27ae5526f72d', '18000.00', 600, '🏊', 'emoji', '🏊', '4.7', 2, true, false, true),
('Garden Sprinkler System', 'garden-sprinkler-system', 'Automated garden irrigation with timer control and zonal watering', 'fb475664-1aee-4df1-847a-27ae5526f72d', '4500.00', 300, '🌱', 'emoji', '🌱', '4.4', 12, true, false, true),
('Industrial Plumbing Solutions', 'industrial-plumbing-solutions', 'Commercial and industrial plumbing for offices and factories', 'fb475664-1aee-4df1-847a-27ae5526f72d', '12000.00', 480, '🏭', 'emoji', '🏭', '4.6', 8, true, false, true),

-- BEAUTY SERVICES (using existing beauty category if available)
('Celebrity Makeup Artist', 'celebrity-makeup-artist', 'Professional celebrity-style makeup for events and photoshoots', '3d767bd2-8a1b-4d85-842d-f1e17feb6914', '12000.00', 180, '⭐', 'emoji', '⭐', '4.9', 3, true, false, true),
('Ayurvedic Beauty Treatment', 'ayurvedic-beauty-treatment', 'Traditional Ayurvedic facial and body treatments with herbal products', '3d767bd2-8a1b-4d85-842d-f1e17feb6914', '2500.00', 150, '🌿', 'emoji', '🌿', '4.6', 25, true, true, true),
('Dermat Approved Skincare', 'dermat-approved-skincare', 'Dermatologist-approved advanced skincare treatments at home', '3d767bd2-8a1b-4d85-842d-f1e17feb6914', '3500.00', 120, '🧴', 'emoji', '🧴', '4.7', 18, true, true, true),
('Hair Extensions & Styling', 'hair-extensions-styling', 'Premium hair extension application with professional styling', '3d767bd2-8a1b-4d85-842d-f1e17feb6914', '4500.00', 240, '💁‍♀️', 'emoji', '💁‍♀️', '4.5', 15, true, false, true),
('Luxury Spa Experience', 'luxury-spa-experience', 'Complete luxury spa package with massage, facial, and aromatherapy', '3d767bd2-8a1b-4d85-842d-f1e17feb6914', '6000.00', 300, '💆‍♀️', 'emoji', '💆‍♀️', '4.8', 12, true, false, true),

-- CARPENTRY SERVICES (using existing carpentry category)
('Luxury Walk-in Closet', 'luxury-walk-in-closet', 'Designer walk-in wardrobe with imported hardware and LED lighting', '8a843759-8e78-4c6c-9773-7f14275b33c6', '45000.00', 720, '👗', 'emoji', '👗', '4.8', 3, true, false, true),
('Home Theater Cabinet', 'home-theater-cabinet', 'Custom entertainment unit with cable management and speaker housing', '8a843759-8e78-4c6c-9773-7f14275b33c6', '8000.00', 360, '📺', 'emoji', '📺', '4.6', 8, true, false, true),
('Outdoor Deck Construction', 'outdoor-deck-construction', 'Weather-resistant outdoor wooden deck with railing and finishing', '8a843759-8e78-4c6c-9773-7f14275b33c6', '15000.00', 600, '🏡', 'emoji', '🏡', '4.7', 5, true, false, true),
('Kids Playground Equipment', 'kids-playground-equipment', 'Safe wooden playground equipment for home gardens', '8a843759-8e78-4c6c-9773-7f14275b33c6', '12000.00', 480, '🎠', 'emoji', '🎠', '4.5', 6, true, false, true),
('Antique Furniture Restoration', 'antique-furniture-restoration', 'Professional restoration of vintage and antique wooden furniture', '8a843759-8e78-4c6c-9773-7f14275b33c6', '3500.00', 240, '🪑', 'emoji', '🪑', '4.9', 4, true, false, true),

-- APPLIANCE REPAIR SERVICES (using existing category)
('Smart TV Complete Service', 'smart-tv-complete-service', 'Smart TV software update, panel cleaning, and performance optimization', 'f1387f05-e74a-4e71-a538-43b5e6dff7be', '1200.00', 90, '📺', 'emoji', '📺', '4.4', 35, true, true, true),
('Home Theater System Setup', 'home-theater-system-setup', 'Complete home theater installation with surround sound calibration', 'f1387f05-e74a-4e71-a538-43b5e6dff7be', '2500.00', 180, '🎬', 'emoji', '🎬', '4.6', 12, true, false, true),
('Kitchen Appliance Package', 'kitchen-appliance-package', 'Complete kitchen appliance installation and setup service', 'f1387f05-e74a-4e71-a538-43b5e6dff7be', '3000.00', 240, '🍽️', 'emoji', '🍽️', '4.5', 18, true, false, true),
('Gaming Console Repair', 'gaming-console-repair', 'PlayStation, Xbox, and Nintendo console repair and maintenance', 'f1387f05-e74a-4e71-a538-43b5e6dff7be', '800.00', 90, '🎮', 'emoji', '🎮', '4.3', 28, true, true, true),
('Laptop Hardware Repair', 'laptop-hardware-repair', 'Laptop screen, keyboard, battery and motherboard repair service', 'f1387f05-e74a-4e71-a538-43b5e6dff7be', '1500.00', 120, '💻', 'emoji', '💻', '4.4', 45, true, true, true);
