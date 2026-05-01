export type CategorySeed = {
  name: string;
  slug: string;
  description?: string;
  subcategories?: { name: string; slug: string; description?: string }[];
};

/**
 * Comprehensive category tree — alphabetical order, wholesale → retail.
 * Covers raw materials, industrial, B2B, and B2C consumer goods.
 */
export const CATEGORY_TREE: CategorySeed[] = [
  {
    name: 'Agriculture & Food',
    slug: 'agriculture-food',
    description: 'Raw agricultural commodities, processed food, beverages and food ingredients.',
    subcategories: [
      { name: 'Cereals, Grains & Pulses', slug: 'cereals-grains-pulses', description: 'Wheat, rice, corn, soybeans, lentils and other bulk grains.' },
      { name: 'Dairy Products & Eggs', slug: 'dairy-eggs', description: 'Milk, cheese, butter, yoghurt, eggs and dairy derivatives.' },
      { name: 'Edible Oils & Fats', slug: 'edible-oils-fats', description: 'Vegetable oils, olive oil, palm oil, margarines and shortening.' },
      { name: 'Fish & Seafood', slug: 'fish-seafood', description: 'Fresh, frozen and processed fish, shellfish and aquaculture products.' },
      { name: 'Fresh Fruits & Vegetables', slug: 'fresh-fruits-vegetables', description: 'Seasonal and tropical fruits, root vegetables, leafy greens and herbs.' },
      { name: 'Frozen & Convenience Foods', slug: 'frozen-convenience-foods', description: 'Ready meals, frozen vegetables, pre-packaged convenience items.' },
      { name: 'Honey, Jams & Preserves', slug: 'honey-jams-preserves' },
      { name: 'Livestock & Poultry (live)', slug: 'livestock-poultry-live', description: 'Cattle, sheep, goats, pigs, chickens and other live animals.' },
      { name: 'Meat & Poultry (processed)', slug: 'meat-poultry-processed', description: 'Fresh, chilled and frozen meat cuts, deli products and sausages.' },
      { name: 'Nuts, Seeds & Dried Fruits', slug: 'nuts-seeds-dried-fruits' },
      { name: 'Organic & Natural Foods', slug: 'organic-natural-foods' },
      { name: 'Pet Food & Treats', slug: 'pet-food-treats' },
      { name: 'Snacks, Confectionery & Chocolate', slug: 'snacks-confectionery-chocolate' },
      { name: 'Spices, Herbs & Seasonings', slug: 'spices-herbs-seasonings' },
      { name: 'Sugar & Sweeteners', slug: 'sugar-sweeteners' },
      { name: 'Tea, Coffee & Cocoa', slug: 'tea-coffee-cocoa' },
      { name: 'Wine, Beer & Spirits', slug: 'wine-beer-spirits' }
    ]
  },
  {
    name: 'Apparel & Fashion',
    slug: 'apparel-fashion',
    description: 'Clothing, footwear and accessories for all genders and age groups.',
    subcategories: [
      { name: 'Accessories & Haberdashery', slug: 'accessories-haberdashery', description: 'Belts, scarves, hats, gloves and small leather goods.' },
      { name: 'Baby & Children\'s Clothing', slug: 'baby-children-clothing' },
      { name: 'Eyewear & Optical', slug: 'eyewear-optical', description: 'Sunglasses, prescription frames, contact lenses and cases.' },
      { name: 'Footwear', slug: 'footwear', description: 'Shoes, boots, sandals and athletic footwear.' },
      { name: 'Handbags & Luggage', slug: 'handbags-luggage' },
      { name: 'Lingerie & Underwear', slug: 'lingerie-underwear' },
      { name: 'Men\'s Clothing', slug: 'mens-clothing', description: 'Shirts, trousers, suits, jackets and casualwear.' },
      { name: 'Sports & Activewear', slug: 'sports-activewear' },
      { name: 'Swimwear', slug: 'swimwear' },
      { name: 'Uniforms & Workwear', slug: 'uniforms-workwear', description: 'Safety clothing, medical scrubs, hospitality and corporate uniforms.' },
      { name: 'Women\'s Clothing', slug: 'womens-clothing', description: 'Dresses, tops, trousers, skirts, coats and evening wear.' }
    ]
  },
  {
    name: 'Automotive & Vehicles',
    slug: 'automotive-vehicles',
    description: 'Vehicles, spare parts, accessories and automotive fluids.',
    subcategories: [
      { name: 'Agricultural Vehicles & Tractors', slug: 'agricultural-vehicles-tractors' },
      { name: 'Automotive Electronics', slug: 'automotive-electronics', description: 'ECUs, sensors, dashcams, navigation and audio systems.' },
      { name: 'Buses & Coaches', slug: 'buses-coaches' },
      { name: 'Car Parts & Accessories', slug: 'car-parts-accessories', description: 'Engine components, body parts, filters, brakes and suspension.' },
      { name: 'Commercial & Heavy Vehicles', slug: 'commercial-heavy-vehicles', description: 'Trucks, vans, lorries and specialised commercial vehicles.' },
      { name: 'Electric Vehicles & EV Components', slug: 'electric-vehicles-components' },
      { name: 'Lubricants, Oils & Fluids', slug: 'lubricants-oils-fluids' },
      { name: 'Motorcycles & Scooters', slug: 'motorcycles-scooters' },
      { name: 'Tires & Wheels', slug: 'tires-wheels' },
      { name: 'Trailers & Semi-trailers', slug: 'trailers-semi-trailers' }
    ]
  },
  {
    name: 'Beauty & Personal Care',
    slug: 'beauty-personal-care',
    description: 'Cosmetics, skincare, hair care and personal hygiene products.',
    subcategories: [
      { name: 'Body Care & Hygiene', slug: 'body-care-hygiene', description: 'Soaps, shower gels, deodorants, lotions and body scrubs.' },
      { name: 'Cosmetics & Makeup', slug: 'cosmetics-makeup', description: 'Foundation, lipstick, eyeshadow, mascara and makeup tools.' },
      { name: 'Fragrances & Perfumes', slug: 'fragrances-perfumes' },
      { name: 'Hair Care', slug: 'hair-care', description: 'Shampoos, conditioners, styling products, dyes and hair tools.' },
      { name: 'Men\'s Grooming', slug: 'mens-grooming', description: 'Razors, shaving cream, beard care and aftershave.' },
      { name: 'Nail Care', slug: 'nail-care' },
      { name: 'Oral Care', slug: 'oral-care', description: 'Toothbrushes, toothpaste, mouthwash and dental accessories.' },
      { name: 'Skincare', slug: 'skincare', description: 'Moisturisers, serums, sunscreens, cleansers and masks.' }
    ]
  },
  {
    name: 'Books, Media & Education',
    slug: 'books-media-education',
    description: 'Books, e-learning content, educational materials and printed media.',
    subcategories: [
      { name: 'Academic & Professional Books', slug: 'academic-professional-books' },
      { name: 'Children\'s Books & Learning Kits', slug: 'children-books-learning-kits' },
      { name: 'E-learning Courses & Content', slug: 'elearning-courses-content' },
      { name: 'Magazines & Periodicals', slug: 'magazines-periodicals' },
      { name: 'Maps, Charts & Reference', slug: 'maps-charts-reference' },
      { name: 'Musical Instruments & Sheet Music', slug: 'musical-instruments-sheet-music' },
      { name: 'Training & Certification Materials', slug: 'training-certification-materials' }
    ]
  },
  {
    name: 'Building & Construction',
    slug: 'building-construction',
    description: 'Construction materials, building systems and site equipment.',
    subcategories: [
      { name: 'Bricks, Blocks & Masonry', slug: 'bricks-blocks-masonry' },
      { name: 'Cement, Concrete & Aggregates', slug: 'cement-concrete-aggregates' },
      { name: 'Doors, Windows & Glazing', slug: 'doors-windows-glazing' },
      { name: 'Electrical & Wiring Materials', slug: 'electrical-wiring-materials' },
      { name: 'Flooring & Tiles', slug: 'flooring-tiles', description: 'Ceramic, porcelain, vinyl, parquet and natural stone flooring.' },
      { name: 'Insulation & Waterproofing', slug: 'insulation-waterproofing' },
      { name: 'Landscaping & Site Work', slug: 'landscaping-site-work' },
      { name: 'Paints & Surface Finishes', slug: 'paints-surface-finishes' },
      { name: 'Plumbing & Sanitary Ware', slug: 'plumbing-sanitary-ware' },
      { name: 'Prefab & Modular Structures', slug: 'prefab-modular-structures' },
      { name: 'Roofing & Cladding', slug: 'roofing-cladding' },
      { name: 'Scaffolding & Formwork', slug: 'scaffolding-formwork' },
      { name: 'Steel Structures & Profiles', slug: 'steel-structures-profiles' },
      { name: 'Timber, Wood & Board', slug: 'timber-wood-board', description: 'Sawn timber, plywood, MDF, OSB and engineered wood products.' }
    ]
  },
  {
    name: 'Chemicals & Petrochemicals',
    slug: 'chemicals-petrochemicals',
    description: 'Industrial chemicals, specialty chemicals and chemical raw materials.',
    subcategories: [
      { name: 'Adhesives & Sealants', slug: 'adhesives-sealants' },
      { name: 'Agricultural Chemicals & Fertilizers', slug: 'agricultural-chemicals-fertilizers' },
      { name: 'Cleaning Agents & Detergents', slug: 'cleaning-agents-detergents' },
      { name: 'Coatings, Paints & Inks', slug: 'coatings-paints-inks' },
      { name: 'Cosmetic & Pharmaceutical Chemicals', slug: 'cosmetic-pharma-chemicals' },
      { name: 'Food Additives & Ingredients', slug: 'food-additives-ingredients' },
      { name: 'Industrial & Specialty Chemicals', slug: 'industrial-specialty-chemicals' },
      { name: 'Laboratory Chemicals & Reagents', slug: 'laboratory-chemicals-reagents' },
      { name: 'Petrochemicals & Derivatives', slug: 'petrochemicals-derivatives' },
      { name: 'Plastic Resins & Compounds', slug: 'plastic-resins-compounds' },
      { name: 'Rubber & Latex', slug: 'rubber-latex' },
      { name: 'Water Treatment Chemicals', slug: 'water-treatment-chemicals' }
    ]
  },
  {
    name: 'Consumer Electronics',
    slug: 'consumer-electronics',
    description: 'Personal electronics, gadgets and accessories for everyday use.',
    subcategories: [
      { name: 'Audio & Hi-Fi Equipment', slug: 'audio-hifi-equipment', description: 'Headphones, speakers, amplifiers and sound systems.' },
      { name: 'Cameras & Photography', slug: 'cameras-photography' },
      { name: 'Computers & Laptops', slug: 'computers-laptops' },
      { name: 'E-readers & Tablets', slug: 'ereaders-tablets' },
      { name: 'Gaming Consoles & Accessories', slug: 'gaming-consoles-accessories' },
      { name: 'Power Banks & Chargers', slug: 'power-banks-chargers' },
      { name: 'Smart Home & IoT Devices', slug: 'smart-home-iot', description: 'Smart speakers, thermostats, connected lighting and sensors.' },
      { name: 'Smartphones & Mobile Phones', slug: 'smartphones-mobile-phones' },
      { name: 'Television & Video', slug: 'television-video', description: 'Smart TVs, projectors, streaming devices and AV accessories.' },
      { name: 'Wearables & Fitness Trackers', slug: 'wearables-fitness-trackers' }
    ]
  },
  {
    name: 'Energy & Environment',
    slug: 'energy-environment',
    description: 'Energy production, storage, distribution and environmental technologies.',
    subcategories: [
      { name: 'Batteries & Energy Storage', slug: 'batteries-energy-storage' },
      { name: 'Biomass & Biofuels', slug: 'biomass-biofuels' },
      { name: 'Coal & Solid Fuels', slug: 'coal-solid-fuels' },
      { name: 'Environmental Monitoring Equipment', slug: 'environmental-monitoring' },
      { name: 'Natural Gas Equipment', slug: 'natural-gas-equipment' },
      { name: 'Oil & Gas Drilling Equipment', slug: 'oil-gas-drilling-equipment' },
      { name: 'Recycling & Waste Management', slug: 'recycling-waste-management' },
      { name: 'Solar Panels & Photovoltaics', slug: 'solar-panels-photovoltaics' },
      { name: 'Water Purification & Desalination', slug: 'water-purification-desalination' },
      { name: 'Wind Turbines & Components', slug: 'wind-turbines-components' }
    ]
  },
  {
    name: 'Furniture & Interior',
    slug: 'furniture-interior',
    description: 'Residential and commercial furniture, décor and interior accessories.',
    subcategories: [
      { name: 'Bathroom Furniture & Accessories', slug: 'bathroom-furniture-accessories' },
      { name: 'Bedroom Furniture', slug: 'bedroom-furniture', description: 'Beds, wardrobes, dressers, nightstands and bedroom storage.' },
      { name: 'Candles, Fragrance & Décor', slug: 'candles-fragrance-decor' },
      { name: 'Children\'s & Nursery Furniture', slug: 'children-nursery-furniture' },
      { name: 'Curtains, Blinds & Window Treatments', slug: 'curtains-blinds' },
      { name: 'Home Textiles & Bedding', slug: 'home-textiles-bedding', description: 'Bedsheets, duvets, pillows, towels and rugs.' },
      { name: 'Kitchen & Dining Furniture', slug: 'kitchen-dining-furniture' },
      { name: 'Living Room Furniture', slug: 'living-room-furniture', description: 'Sofas, armchairs, coffee tables and TV units.' },
      { name: 'Mirrors, Artwork & Wall Décor', slug: 'mirrors-artwork-wall-decor' },
      { name: 'Office & Study Furniture', slug: 'office-study-furniture' },
      { name: 'Outdoor & Garden Furniture', slug: 'outdoor-garden-furniture' },
      { name: 'Storage & Organisation', slug: 'storage-organisation' }
    ]
  },
  {
    name: 'Garden, Agriculture & Landscaping',
    slug: 'garden-agriculture-landscaping',
    description: 'Garden tools, plants, seeds, irrigation and outdoor landscaping.',
    subcategories: [
      { name: 'Fertilizers & Soil Amendments', slug: 'fertilizers-soil-amendments' },
      { name: 'Garden Furniture & Decor', slug: 'garden-furniture-decor' },
      { name: 'Garden Tools & Equipment', slug: 'garden-tools-equipment' },
      { name: 'Greenhouses & Grow Tents', slug: 'greenhouses-grow-tents' },
      { name: 'Irrigation & Watering Systems', slug: 'irrigation-watering-systems' },
      { name: 'Lawn Mowers & Outdoor Power Tools', slug: 'lawn-mowers-outdoor-power-tools' },
      { name: 'Pesticides & Plant Protection', slug: 'pesticides-plant-protection' },
      { name: 'Plants, Seeds & Bulbs', slug: 'plants-seeds-bulbs' },
      { name: 'Pots, Planters & Growing Media', slug: 'pots-planters-growing-media' }
    ]
  },
  {
    name: 'Healthcare & Medical',
    slug: 'healthcare-medical',
    description: 'Medical devices, hospital supplies, diagnostics and personal health products.',
    subcategories: [
      { name: 'Dental Equipment & Supplies', slug: 'dental-equipment-supplies' },
      { name: 'Diagnostic & Imaging Equipment', slug: 'diagnostic-imaging-equipment' },
      { name: 'Disposables & Hospital Consumables', slug: 'disposables-hospital-consumables' },
      { name: 'First Aid & Emergency Kits', slug: 'first-aid-emergency-kits' },
      { name: 'Home Health & Monitoring Devices', slug: 'home-health-monitoring-devices' },
      { name: 'Medical Furniture & Equipment', slug: 'medical-furniture-equipment' },
      { name: 'Orthopaedic & Rehabilitation', slug: 'orthopaedic-rehabilitation' },
      { name: 'Personal Protective Equipment (PPE)', slug: 'personal-protective-equipment' },
      { name: 'Pharmaceuticals & Supplements', slug: 'pharmaceuticals-supplements', description: 'OTC medicines, vitamins, minerals and nutritional supplements.' },
      { name: 'Surgical Instruments', slug: 'surgical-instruments' },
      { name: 'Veterinary Supplies', slug: 'veterinary-supplies' }
    ]
  },
  {
    name: 'Home Appliances',
    slug: 'home-appliances',
    description: 'Large and small household appliances for kitchen, laundry and climate control.',
    subcategories: [
      { name: 'Air Conditioning & Ventilation', slug: 'air-conditioning-ventilation' },
      { name: 'Coffee Machines & Kitchen Gadgets', slug: 'coffee-machines-kitchen-gadgets' },
      { name: 'Dishwashers', slug: 'dishwashers' },
      { name: 'Fridges & Freezers', slug: 'fridges-freezers' },
      { name: 'Heating & Radiators', slug: 'heating-radiators' },
      { name: 'Irons & Garment Care', slug: 'irons-garment-care' },
      { name: 'Kettles & Toasters', slug: 'kettles-toasters' },
      { name: 'Microwaves & Ovens', slug: 'microwaves-ovens' },
      { name: 'Vacuum Cleaners & Floor Care', slug: 'vacuum-cleaners-floor-care' },
      { name: 'Washing Machines & Dryers', slug: 'washing-machines-dryers' },
      { name: 'Water Heaters & Boilers', slug: 'water-heaters-boilers' }
    ]
  },
  {
    name: 'Industrial Equipment & Machinery',
    slug: 'industrial-equipment-machinery',
    description: 'Heavy machinery, manufacturing equipment and industrial systems.',
    subcategories: [
      { name: 'Agricultural Machinery', slug: 'agricultural-machinery', description: 'Harvesters, ploughs, seeding machines and irrigation pumps.' },
      { name: 'Compressors & Pneumatics', slug: 'compressors-pneumatics' },
      { name: 'Construction Machinery', slug: 'construction-machinery', description: 'Excavators, bulldozers, cranes, concrete mixers and pavers.' },
      { name: 'Food Processing & Packaging Machinery', slug: 'food-processing-packaging-machinery' },
      { name: 'Generators & Power Equipment', slug: 'generators-power-equipment' },
      { name: 'Lifting & Material Handling', slug: 'lifting-material-handling', description: 'Forklifts, hoists, conveyors and pallet jacks.' },
      { name: 'Manufacturing & CNC Machines', slug: 'manufacturing-cnc-machines' },
      { name: 'Mining & Quarrying Equipment', slug: 'mining-quarrying-equipment' },
      { name: 'Printing & Publishing Machinery', slug: 'printing-publishing-machinery' },
      { name: 'Pumps, Valves & Pipes', slug: 'pumps-valves-pipes' },
      { name: 'Textile Machinery', slug: 'textile-machinery' },
      { name: 'Woodworking Machinery', slug: 'woodworking-machinery' }
    ]
  },
  {
    name: 'IT, Networking & Telecom',
    slug: 'it-networking-telecom',
    description: 'Servers, networking hardware, software, telecoms and data centre equipment.',
    subcategories: [
      { name: 'Cables & Connectivity', slug: 'cables-connectivity' },
      { name: 'Cloud & Software Licences', slug: 'cloud-software-licences' },
      { name: 'Data Centre & Server Equipment', slug: 'data-centre-server-equipment' },
      { name: 'Electronic Components & Semiconductors', slug: 'electronic-components-semiconductors' },
      { name: 'Mobile & Wireless Telecom Equipment', slug: 'mobile-wireless-telecom' },
      { name: 'Networking Equipment', slug: 'networking-equipment', description: 'Routers, switches, access points and firewall appliances.' },
      { name: 'Office Phones & Unified Communications', slug: 'office-phones-unified-comms' },
      { name: 'Printers, Scanners & Peripherals', slug: 'printers-scanners-peripherals' },
      { name: 'Security & Surveillance Systems', slug: 'security-surveillance-systems' },
      { name: 'Storage Media & Memory', slug: 'storage-media-memory' },
      { name: 'UPS & Power Protection', slug: 'ups-power-protection' }
    ]
  },
  {
    name: 'Jewelry & Watches',
    slug: 'jewelry-watches',
    description: 'Fine jewelry, fashion jewelry, watches and accessories.',
    subcategories: [
      { name: 'Bracelets & Bangles', slug: 'bracelets-bangles' },
      { name: 'Earrings', slug: 'earrings' },
      { name: 'Fashion & Costume Jewelry', slug: 'fashion-costume-jewelry' },
      { name: 'Fine Jewelry & Precious Metals', slug: 'fine-jewelry-precious-metals' },
      { name: 'Gemstones & Diamonds', slug: 'gemstones-diamonds' },
      { name: 'Necklaces & Pendants', slug: 'necklaces-pendants' },
      { name: 'Rings', slug: 'rings' },
      { name: 'Watch Accessories', slug: 'watch-accessories' },
      { name: 'Watches — Luxury', slug: 'watches-luxury' },
      { name: 'Watches — Sport & Fashion', slug: 'watches-sport-fashion' }
    ]
  },
  {
    name: 'Kitchenware & Cookware',
    slug: 'kitchenware-cookware',
    description: 'Pots, pans, bakeware, cutlery and kitchen accessories.',
    subcategories: [
      { name: 'Bakeware & Oven Accessories', slug: 'bakeware-oven-accessories' },
      { name: 'Bars, Bottles & Beverage Accessories', slug: 'bars-bottles-beverage-accessories' },
      { name: 'Cookware Sets & Frying Pans', slug: 'cookware-sets-frying-pans' },
      { name: 'Cutlery & Serving Utensils', slug: 'cutlery-serving-utensils' },
      { name: 'Food Storage Containers', slug: 'food-storage-containers' },
      { name: 'Kitchen Knives & Chopping Boards', slug: 'kitchen-knives-chopping-boards' },
      { name: 'Kitchen Scales & Measuring Tools', slug: 'kitchen-scales-measuring-tools' },
      { name: 'Tableware & Dinnerware', slug: 'tableware-dinnerware' }
    ]
  },
  {
    name: 'Lighting & Electrical',
    slug: 'lighting-electrical',
    description: 'Indoor/outdoor lighting, electrical components and power distribution.',
    subcategories: [
      { name: 'Circuit Breakers & Switchgear', slug: 'circuit-breakers-switchgear' },
      { name: 'Commercial & Industrial Lighting', slug: 'commercial-industrial-lighting' },
      { name: 'Decorative & Designer Lighting', slug: 'decorative-designer-lighting' },
      { name: 'LED Bulbs & Luminaires', slug: 'led-bulbs-luminaires' },
      { name: 'Outdoor & Street Lighting', slug: 'outdoor-street-lighting' },
      { name: 'Smart Lighting Controls', slug: 'smart-lighting-controls' },
      { name: 'Solar Lighting', slug: 'solar-lighting' },
      { name: 'Transformers & Power Supplies', slug: 'transformers-power-supplies' },
      { name: 'Wires, Cables & Conduit', slug: 'wires-cables-conduit' }
    ]
  },
  {
    name: 'Logistics, Packaging & Warehousing',
    slug: 'logistics-packaging-warehousing',
    description: 'Packaging materials, warehouse equipment, containers and supply chain services.',
    subcategories: [
      { name: 'Cold Chain & Refrigerated Logistics', slug: 'cold-chain-refrigerated-logistics' },
      { name: 'Corrugated Boxes & Cartons', slug: 'corrugated-boxes-cartons' },
      { name: 'Flexible Packaging & Bags', slug: 'flexible-packaging-bags' },
      { name: 'Industrial Containers & IBCs', slug: 'industrial-containers-ibcs' },
      { name: 'Labels, Tags & RFID', slug: 'labels-tags-rfid' },
      { name: 'Pallets & Pallet Wrap', slug: 'pallets-pallet-wrap' },
      { name: 'Rack & Shelving Systems', slug: 'rack-shelving-systems' },
      { name: 'Shipping Containers', slug: 'shipping-containers' },
      { name: 'Strapping & Cushioning Materials', slug: 'strapping-cushioning-materials' },
      { name: 'Tape, Adhesives & Sealing', slug: 'tape-adhesives-sealing' }
    ]
  },
  {
    name: 'Metals & Minerals',
    slug: 'metals-minerals',
    description: 'Ferrous and non-ferrous metals, precious metals and industrial minerals.',
    subcategories: [
      { name: 'Aluminium & Aluminium Alloys', slug: 'aluminium-alloys' },
      { name: 'Copper, Brass & Bronze', slug: 'copper-brass-bronze' },
      { name: 'Ferroalloys & Special Alloys', slug: 'ferroalloys-special-alloys' },
      { name: 'Gold, Silver & Precious Metals', slug: 'gold-silver-precious-metals' },
      { name: 'Industrial Minerals & Chemicals', slug: 'industrial-minerals-chemicals', description: 'Silica, calcium carbonate, talc, kaolin and barite.' },
      { name: 'Iron & Steel (long products)', slug: 'iron-steel-long-products', description: 'Rebar, wire rod, beams, angles and channels.' },
      { name: 'Iron & Steel (flat products)', slug: 'iron-steel-flat-products', description: 'Hot-rolled coil, cold-rolled sheet, galvanised steel.' },
      { name: 'Lead & Zinc', slug: 'lead-zinc' },
      { name: 'Nickel & Stainless Steel', slug: 'nickel-stainless-steel' },
      { name: 'Ores, Concentrates & Scrap', slug: 'ores-concentrates-scrap' },
      { name: 'Titanium & Rare Earth Metals', slug: 'titanium-rare-earth-metals' }
    ]
  },
  {
    name: 'Office, Stationery & Printing',
    slug: 'office-stationery-printing',
    description: 'Office supplies, paper products, printing materials and business services.',
    subcategories: [
      { name: 'Business Forms & Envelopes', slug: 'business-forms-envelopes' },
      { name: 'Calendars & Planners', slug: 'calendars-planners' },
      { name: 'Filing & Archiving', slug: 'filing-archiving' },
      { name: 'Notebooks & Writing Instruments', slug: 'notebooks-writing-instruments' },
      { name: 'Office Furniture & Ergonomics', slug: 'office-furniture-ergonomics' },
      { name: 'Paper & Print Media', slug: 'paper-print-media', description: 'Copy paper, coated paper, cardboard and specialty papers.' },
      { name: 'Promotional & Branded Items', slug: 'promotional-branded-items' },
      { name: 'Stamps, Seals & Label Makers', slug: 'stamps-seals-label-makers' }
    ]
  },
  {
    name: 'Pets & Animal Supplies',
    slug: 'pets-animal-supplies',
    description: 'Products and supplies for companion animals and livestock.',
    subcategories: [
      { name: 'Aquarium & Fish Supplies', slug: 'aquarium-fish-supplies' },
      { name: 'Bird Supplies', slug: 'bird-supplies' },
      { name: 'Cat Accessories & Supplies', slug: 'cat-accessories-supplies' },
      { name: 'Dog Accessories & Supplies', slug: 'dog-accessories-supplies' },
      { name: 'Livestock Feed & Supplements', slug: 'livestock-feed-supplements' },
      { name: 'Small Animal Supplies', slug: 'small-animal-supplies' },
      { name: 'Veterinary & Grooming', slug: 'veterinary-grooming' }
    ]
  },
  {
    name: 'Safety, Security & Fire Protection',
    slug: 'safety-security-fire-protection',
    description: 'Personal protective equipment, security systems and fire safety.',
    subcategories: [
      { name: 'Access Control & Intercoms', slug: 'access-control-intercoms' },
      { name: 'CCTV & Video Surveillance', slug: 'cctv-video-surveillance' },
      { name: 'Fall Protection & Safety Harnesses', slug: 'fall-protection-safety-harnesses' },
      { name: 'Fire Detection & Alarm Systems', slug: 'fire-detection-alarm-systems' },
      { name: 'Fire Extinguishers & Suppression', slug: 'fire-extinguishers-suppression' },
      { name: 'Gas Detection Equipment', slug: 'gas-detection-equipment' },
      { name: 'Protective Clothing & High-Vis', slug: 'protective-clothing-high-vis' },
      { name: 'Respiratory Protection', slug: 'respiratory-protection', description: 'Masks, respirators and breathing apparatus.' },
      { name: 'Safety Helmets & Head Protection', slug: 'safety-helmets-head-protection' },
      { name: 'Security Locks & Safes', slug: 'security-locks-safes' }
    ]
  },
  {
    name: 'Sports, Fitness & Recreation',
    slug: 'sports-fitness-recreation',
    description: 'Equipment for sports, outdoor activities, fitness and leisure.',
    subcategories: [
      { name: 'Camping, Hiking & Survival', slug: 'camping-hiking-survival' },
      { name: 'Cycling', slug: 'cycling', description: 'Bicycles, e-bikes, helmets, clothing and accessories.' },
      { name: 'Fishing & Hunting', slug: 'fishing-hunting' },
      { name: 'Fitness & Gym Equipment', slug: 'fitness-gym-equipment', description: 'Weights, cardio machines, yoga mats and resistance bands.' },
      { name: 'Football, Basketball & Team Sports', slug: 'football-basketball-team-sports' },
      { name: 'Golf', slug: 'golf' },
      { name: 'Martial Arts & Combat Sports', slug: 'martial-arts-combat-sports' },
      { name: 'Racket Sports', slug: 'racket-sports', description: 'Tennis, badminton, squash and padel.' },
      { name: 'Snow Sports & Winter Equipment', slug: 'snow-sports-winter-equipment' },
      { name: 'Swimming & Water Sports', slug: 'swimming-water-sports' },
      { name: 'Watersports & Boating', slug: 'watersports-boating' }
    ]
  },
  {
    name: 'Textiles & Fabrics',
    slug: 'textiles-fabrics',
    description: 'Raw and processed textile materials, yarn, thread and technical fabrics.',
    subcategories: [
      { name: 'Cotton & Natural Fibres', slug: 'cotton-natural-fibres' },
      { name: 'Denim & Specialty Weaves', slug: 'denim-specialty-weaves' },
      { name: 'Geotextiles & Technical Fabrics', slug: 'geotextiles-technical-fabrics' },
      { name: 'Knitted Fabrics', slug: 'knitted-fabrics' },
      { name: 'Leather, Hide & Suede', slug: 'leather-hide-suede' },
      { name: 'Linen, Hemp & Jute', slug: 'linen-hemp-jute' },
      { name: 'Nonwoven & Spunbond Fabrics', slug: 'nonwoven-spunbond-fabrics' },
      { name: 'Silk & Luxury Fibres', slug: 'silk-luxury-fibres' },
      { name: 'Synthetic Fabrics (Polyester, Nylon)', slug: 'synthetic-fabrics' },
      { name: 'Yarn & Thread', slug: 'yarn-thread' }
    ]
  },
  {
    name: 'Tools & Hardware',
    slug: 'tools-hardware',
    description: 'Hand tools, power tools, fasteners, fixings and workshop equipment.',
    subcategories: [
      { name: 'Bearings & Transmission', slug: 'bearings-transmission' },
      { name: 'Cutting & Abrasive Tools', slug: 'cutting-abrasive-tools' },
      { name: 'Electrical Testing & Measurement', slug: 'electrical-testing-measurement' },
      { name: 'Fasteners — Bolts, Nuts & Screws', slug: 'fasteners-bolts-nuts-screws' },
      { name: 'Hand Tools', slug: 'hand-tools', description: 'Hammers, screwdrivers, spanners, pliers and levels.' },
      { name: 'Metalworking & Welding Equipment', slug: 'metalworking-welding-equipment' },
      { name: 'Power Tools — Corded', slug: 'power-tools-corded' },
      { name: 'Power Tools — Cordless & Battery', slug: 'power-tools-cordless' },
      { name: 'Seals, Gaskets & O-rings', slug: 'seals-gaskets-o-rings' },
      { name: 'Workshop & Workbench Equipment', slug: 'workshop-workbench-equipment' }
    ]
  },
  {
    name: 'Toys, Games & Baby Products',
    slug: 'toys-games-baby-products',
    description: 'Toys for all ages, board games, baby gear and child development products.',
    subcategories: [
      { name: 'Action Figures & Collectibles', slug: 'action-figures-collectibles' },
      { name: 'Baby Gear — Strollers & Car Seats', slug: 'baby-gear-strollers-car-seats' },
      { name: 'Baby Monitors & Safety', slug: 'baby-monitors-safety' },
      { name: 'Board Games & Puzzles', slug: 'board-games-puzzles' },
      { name: 'Building Blocks & Construction Toys', slug: 'building-blocks-construction-toys' },
      { name: 'Dolls & Soft Toys', slug: 'dolls-soft-toys' },
      { name: 'Educational & STEM Toys', slug: 'educational-stem-toys' },
      { name: 'Feeding & Nursing', slug: 'feeding-nursing' },
      { name: 'Nappies, Wipes & Baby Hygiene', slug: 'nappies-wipes-baby-hygiene' },
      { name: 'Outdoor Toys & Playsets', slug: 'outdoor-toys-playsets' },
      { name: 'RC Vehicles & Drones', slug: 'rc-vehicles-drones' },
      { name: 'Video Games & PC Games', slug: 'video-games-pc-games' }
    ]
  },
  {
    name: 'Travel, Hospitality & Experiences',
    slug: 'travel-hospitality-experiences',
    description: 'Travel accessories, hotel supplies, hospitality equipment and experiences.',
    subcategories: [
      { name: 'Hotel & Hospitality Supplies', slug: 'hotel-hospitality-supplies' },
      { name: 'Hotel Linen & Amenities', slug: 'hotel-linen-amenities' },
      { name: 'Luggage & Travel Accessories', slug: 'luggage-travel-accessories' },
      { name: 'Restaurant & Catering Equipment', slug: 'restaurant-catering-equipment' },
      { name: 'Travel Adapters & Gadgets', slug: 'travel-adapters-gadgets' }
    ]
  }
];
