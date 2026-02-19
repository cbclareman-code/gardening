const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

const plants = [
  // Vegetables
  {
    id: uuidv4(), name: 'Tomato', scientific_name: 'Solanum lycopersicum',
    category: 'vegetable', emoji: '🍅', min_zone: 3, max_zone: 11,
    spacing_inches: 24, days_to_maturity: 70, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed,container',
    companions: 'Basil,Marigold,Carrot,Parsley', antagonists: 'Fennel,Cabbage,Corn',
    description: 'The classic garden staple. Warm-season fruit that thrives in full sun.',
    planting_tips: 'Plant deep — bury 2/3 of stem. Needs staking or cage support.',
    height_inches: 60, color: '#ef4444'
  },
  {
    id: uuidv4(), name: 'Basil', scientific_name: 'Ocimum basilicum',
    category: 'herb', emoji: '🌿', min_zone: 4, max_zone: 11,
    spacing_inches: 12, days_to_maturity: 30, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed,container',
    companions: 'Tomato,Pepper,Oregano', antagonists: 'Sage,Fennel',
    description: 'Aromatic herb that repels pests and boosts tomato flavor.',
    planting_tips: 'Pinch flowers to keep leaves growing. Loves warmth.',
    height_inches: 18, color: '#22c55e'
  },
  {
    id: uuidv4(), name: 'Carrot', scientific_name: 'Daucus carota',
    category: 'vegetable', emoji: '🥕', min_zone: 3, max_zone: 10,
    spacing_inches: 3, days_to_maturity: 75, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed',
    companions: 'Tomato,Lettuce,Onion,Rosemary', antagonists: 'Dill,Parsnip',
    description: 'Root vegetable that needs loose, deep soil to grow straight.',
    planting_tips: 'Direct sow only — does not transplant. Thin to 3 inches apart.',
    height_inches: 12, color: '#f97316'
  },
  {
    id: uuidv4(), name: 'Lettuce', scientific_name: 'Lactuca sativa',
    category: 'vegetable', emoji: '🥬', min_zone: 2, max_zone: 11,
    spacing_inches: 8, days_to_maturity: 45, sun_requirement: 'part_shade',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed,container,vertical',
    companions: 'Carrot,Radish,Strawberry,Chives', antagonists: 'Celery',
    description: 'Cool-season crop. Great for spring and fall harvests.',
    planting_tips: 'Shade in summer heat. Cut outer leaves to keep producing.',
    height_inches: 10, color: '#86efac'
  },
  {
    id: uuidv4(), name: 'Radish', scientific_name: 'Raphanus sativus',
    category: 'vegetable', emoji: '🔴', min_zone: 2, max_zone: 10,
    spacing_inches: 2, days_to_maturity: 25, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed,container',
    companions: 'Lettuce,Carrot,Cucumber,Peas', antagonists: 'Hyssop',
    description: 'Fastest maturing vegetable — great for gap filling.',
    planting_tips: 'Direct sow every 2 weeks for continuous harvest. Plant between slower crops.',
    height_inches: 6, color: '#ec4899'
  },
  {
    id: uuidv4(), name: 'Cucumber', scientific_name: 'Cucumis sativus',
    category: 'vegetable', emoji: '🥒', min_zone: 4, max_zone: 11,
    spacing_inches: 12, days_to_maturity: 55, sun_requirement: 'full_sun',
    water_needs: 'high', garden_types: 'in_ground,raised_bed,vertical',
    companions: 'Radish,Beans,Peas,Sunflower', antagonists: 'Sage,Potato',
    description: 'Prolific summer producer. Loves to climb.',
    planting_tips: 'Train on trellis to save space. Keep soil consistently moist.',
    height_inches: 60, color: '#4ade80'
  },
  {
    id: uuidv4(), name: 'Zucchini', scientific_name: 'Cucurbita pepo',
    category: 'vegetable', emoji: '🟢', min_zone: 3, max_zone: 10,
    spacing_inches: 36, days_to_maturity: 50, sun_requirement: 'full_sun',
    water_needs: 'high', garden_types: 'in_ground,raised_bed',
    companions: 'Marigold,Nasturtium,Beans', antagonists: 'Potato,Fennel',
    description: 'High-yield summer squash. One plant can feed a family.',
    planting_tips: 'Plant in hills. Hand-pollinate if few bees are present.',
    height_inches: 24, color: '#16a34a'
  },
  {
    id: uuidv4(), name: 'Pepper', scientific_name: 'Capsicum annuum',
    category: 'vegetable', emoji: '🫑', min_zone: 5, max_zone: 11,
    spacing_inches: 18, days_to_maturity: 80, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed,container',
    companions: 'Tomato,Basil,Carrot,Spinach', antagonists: 'Fennel,Kohlrabi',
    description: 'Sweet or hot, peppers love heat and full sun.',
    planting_tips: 'Start indoors 8 weeks before last frost. Mulch to retain moisture.',
    height_inches: 30, color: '#84cc16'
  },
  {
    id: uuidv4(), name: 'Spinach', scientific_name: 'Spinacia oleracea',
    category: 'vegetable', emoji: '🌱', min_zone: 2, max_zone: 9,
    spacing_inches: 6, days_to_maturity: 40, sun_requirement: 'part_shade',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed,container',
    companions: 'Strawberry,Peas,Beans,Celery', antagonists: 'Potato',
    description: 'Nutritious cool-season green. Bolts in heat.',
    planting_tips: 'Plant in early spring or fall. Harvest outer leaves continuously.',
    height_inches: 10, color: '#166534'
  },
  {
    id: uuidv4(), name: 'Beans (Bush)', scientific_name: 'Phaseolus vulgaris',
    category: 'vegetable', emoji: '🫘', min_zone: 3, max_zone: 10,
    spacing_inches: 6, days_to_maturity: 55, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed',
    companions: 'Carrot,Cucumber,Strawberry,Marigold', antagonists: 'Onion,Fennel',
    description: 'Nitrogen-fixing legume. No staking needed for bush types.',
    planting_tips: 'Direct sow after last frost. Do not water overhead once flowering.',
    height_inches: 18, color: '#a3e635'
  },
  {
    id: uuidv4(), name: 'Peas', scientific_name: 'Pisum sativum',
    category: 'vegetable', emoji: '🟩', min_zone: 3, max_zone: 9,
    spacing_inches: 4, days_to_maturity: 60, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed,vertical',
    companions: 'Carrot,Lettuce,Radish,Spinach', antagonists: 'Onion,Garlic',
    description: 'Cool-season climber. Fix nitrogen in soil.',
    planting_tips: 'Plant as soon as soil can be worked. Provide trellis or netting.',
    height_inches: 48, color: '#65a30d'
  },
  {
    id: uuidv4(), name: 'Kale', scientific_name: 'Brassica oleracea',
    category: 'vegetable', emoji: '🥦', min_zone: 2, max_zone: 9,
    spacing_inches: 18, days_to_maturity: 60, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed,container',
    companions: 'Beet,Celery,Herbs', antagonists: 'Strawberry,Tomato',
    description: 'Hardy superfood. Sweetens after first frost.',
    planting_tips: 'Start 6 weeks before last frost. Harvest outer leaves.',
    height_inches: 24, color: '#14532d'
  },
  {
    id: uuidv4(), name: 'Strawberry', scientific_name: 'Fragaria × ananassa',
    category: 'fruit', emoji: '🍓', min_zone: 3, max_zone: 10,
    spacing_inches: 18, days_to_maturity: 60, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed,container,vertical',
    companions: 'Lettuce,Spinach,Borage,Thyme', antagonists: 'Fennel,Cabbage',
    description: 'Perennial berry that spreads via runners.',
    planting_tips: 'Plant in slightly raised rows. Remove runners first year for bigger harvest.',
    height_inches: 8, color: '#f43f5e'
  },
  {
    id: uuidv4(), name: 'Marigold', scientific_name: 'Tagetes spp.',
    category: 'flower', emoji: '🌼', min_zone: 2, max_zone: 11,
    spacing_inches: 12, days_to_maturity: 50, sun_requirement: 'full_sun',
    water_needs: 'low', garden_types: 'in_ground,raised_bed,container',
    companions: 'Tomato,Pepper,Squash,Cucumber', antagonists: 'Beans',
    description: 'Natural pest deterrent. Deters aphids, whiteflies, and nematodes.',
    planting_tips: 'Plant at garden perimeter. Deadhead to encourage blooming.',
    height_inches: 18, color: '#fbbf24'
  },
  {
    id: uuidv4(), name: 'Sunflower', scientific_name: 'Helianthus annuus',
    category: 'flower', emoji: '🌻', min_zone: 2, max_zone: 11,
    spacing_inches: 24, days_to_maturity: 80, sun_requirement: 'full_sun',
    water_needs: 'low', garden_types: 'in_ground,raised_bed',
    companions: 'Cucumber,Squash,Corn', antagonists: 'Potato,Fennel',
    description: 'Attracts pollinators. Seeds feed birds in fall.',
    planting_tips: 'Plant on north end to avoid shading other crops.',
    height_inches: 72, color: '#eab308'
  },
  {
    id: uuidv4(), name: 'Mint', scientific_name: 'Mentha spp.',
    category: 'herb', emoji: '🌿', min_zone: 3, max_zone: 9,
    spacing_inches: 18, days_to_maturity: 40, sun_requirement: 'part_shade',
    water_needs: 'moderate', garden_types: 'container,in_ground,raised_bed',
    companions: 'Tomato,Brassicas,Peas', antagonists: 'Chamomile',
    description: 'Vigorous spreader. Best grown in containers to control spread.',
    planting_tips: 'Plant in containers to prevent invasive spreading.',
    height_inches: 24, color: '#6ee7b7'
  },
  {
    id: uuidv4(), name: 'Chives', scientific_name: 'Allium schoenoprasum',
    category: 'herb', emoji: '🌱', min_zone: 3, max_zone: 9,
    spacing_inches: 6, days_to_maturity: 60, sun_requirement: 'full_sun',
    water_needs: 'low', garden_types: 'in_ground,raised_bed,container',
    companions: 'Carrot,Tomato,Apple', antagonists: 'Beans,Peas',
    description: 'Mild onion flavor. Deters aphids and Japanese beetles.',
    planting_tips: 'Divide clumps every 3 years. Cut back flowering to maintain flavor.',
    height_inches: 12, color: '#a3e635'
  },
  {
    id: uuidv4(), name: 'Rosemary', scientific_name: 'Salvia rosmarinus',
    category: 'herb', emoji: '🌿', min_zone: 6, max_zone: 11,
    spacing_inches: 24, days_to_maturity: 90, sun_requirement: 'full_sun',
    water_needs: 'low', garden_types: 'in_ground,container,raised_bed',
    companions: 'Beans,Carrot,Cabbage,Sage', antagonists: 'Mint,Pumpkin',
    description: 'Drought-tolerant perennial herb. Repels cabbage moths.',
    planting_tips: 'Excellent drainage is essential. Prune after flowering.',
    height_inches: 36, color: '#475569'
  },
  {
    id: uuidv4(), name: 'Thyme', scientific_name: 'Thymus vulgaris',
    category: 'herb', emoji: '🌿', min_zone: 4, max_zone: 9,
    spacing_inches: 12, days_to_maturity: 60, sun_requirement: 'full_sun',
    water_needs: 'low', garden_types: 'in_ground,raised_bed,container',
    companions: 'Tomato,Eggplant,Strawberry,Cabbage', antagonists: 'Basil',
    description: 'Low-growing perennial. Deters cabbage worms.',
    planting_tips: 'Excellent ground cover between taller plants. Well-drained soil.',
    height_inches: 12, color: '#7c3aed'
  },
  {
    id: uuidv4(), name: 'Garlic', scientific_name: 'Allium sativum',
    category: 'vegetable', emoji: '🧄', min_zone: 3, max_zone: 9,
    spacing_inches: 6, days_to_maturity: 240, sun_requirement: 'full_sun',
    water_needs: 'low', garden_types: 'in_ground,raised_bed',
    companions: 'Tomato,Pepper,Brassicas,Fruit trees', antagonists: 'Beans,Peas,Sage',
    description: 'Plant in fall, harvest in summer. Natural fungicide and pest deterrent.',
    planting_tips: 'Plant cloves pointy end up in fall. Mulch heavily for winter.',
    height_inches: 24, color: '#d4d4d4'
  },
  {
    id: uuidv4(), name: 'Onion', scientific_name: 'Allium cepa',
    category: 'vegetable', emoji: '🧅', min_zone: 3, max_zone: 10,
    spacing_inches: 4, days_to_maturity: 100, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed',
    companions: 'Carrot,Lettuce,Tomato,Strawberry', antagonists: 'Beans,Peas',
    description: 'Essential kitchen staple. Day-length sensitive for bulbing.',
    planting_tips: 'Choose short-day or long-day varieties based on your latitude.',
    height_inches: 18, color: '#fde68a'
  },
  {
    id: uuidv4(), name: 'Sweet Potato', scientific_name: 'Ipomoea batatas',
    category: 'vegetable', emoji: '🍠', min_zone: 6, max_zone: 11,
    spacing_inches: 18, days_to_maturity: 100, sun_requirement: 'full_sun',
    water_needs: 'low', garden_types: 'in_ground,raised_bed',
    companions: 'Parsnip,Beets', antagonists: 'Squash,Tomato',
    description: 'Heat-loving vine. Excellent ground cover.',
    planting_tips: 'Plant slips after soil warms to 65°F. Needs long growing season.',
    height_inches: 18, color: '#c2410c'
  },
  {
    id: uuidv4(), name: 'Nasturtium', scientific_name: 'Tropaeolum majus',
    category: 'flower', emoji: '🌺', min_zone: 2, max_zone: 11,
    spacing_inches: 10, days_to_maturity: 55, sun_requirement: 'full_sun',
    water_needs: 'low', garden_types: 'in_ground,raised_bed,container,vertical',
    companions: 'Squash,Cucumber,Tomato,Brassicas', antagonists: null,
    description: 'Edible flowers. Trap crop for aphids — draws them away from vegetables.',
    planting_tips: 'Direct sow. Lean soil = more flowers. Rich soil = more leaves.',
    height_inches: 18, color: '#f97316'
  },
  {
    id: uuidv4(), name: 'Borage', scientific_name: 'Borago officinalis',
    category: 'herb', emoji: '🫐', min_zone: 2, max_zone: 11,
    spacing_inches: 18, days_to_maturity: 55, sun_requirement: 'full_sun',
    water_needs: 'low', garden_types: 'in_ground,raised_bed',
    companions: 'Tomato,Squash,Strawberry', antagonists: null,
    description: 'Pollinator magnet. Edible blue star-shaped flowers.',
    planting_tips: 'Direct sow. Self-seeds prolifically. Tap-root dislikes transplanting.',
    height_inches: 24, color: '#60a5fa'
  },
  {
    id: uuidv4(), name: 'Eggplant', scientific_name: 'Solanum melongena',
    category: 'vegetable', emoji: '🍆', min_zone: 5, max_zone: 12,
    spacing_inches: 24, days_to_maturity: 80, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed,container',
    companions: 'Basil,Pepper,Marigold,Thyme', antagonists: 'Fennel',
    description: 'Heat-loving nightshade. Needs warmth to produce well.',
    planting_tips: 'Start indoors 8 weeks before last frost. Stake when fruiting.',
    height_inches: 36, color: '#7e22ce'
  }
];

// Only seed if plants table is empty
const existing = db.prepare('SELECT COUNT(*) as count FROM plants').get();
if (existing.count > 0) {
  console.log(`✅ Plants already seeded (${existing.count} plants in database)`);
  process.exit(0);
}

const insertPlant = db.prepare(`
  INSERT INTO plants
  (id, name, scientific_name, category, emoji, min_zone, max_zone, spacing_inches,
   days_to_maturity, sun_requirement, water_needs, garden_types, companions,
   antagonists, description, planting_tips, height_inches, color)
  VALUES
  (@id, @name, @scientific_name, @category, @emoji, @min_zone, @max_zone, @spacing_inches,
   @days_to_maturity, @sun_requirement, @water_needs, @garden_types, @companions,
   @antagonists, @description, @planting_tips, @height_inches, @color)
`);

db.exec('BEGIN');
for (const plant of plants) {
  insertPlant.run(plant);
}
db.exec('COMMIT');
console.log(`✅ Seeded ${plants.length} plants into database`);
process.exit(0);
