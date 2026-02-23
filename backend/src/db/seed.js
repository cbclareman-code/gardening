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
    height_inches: 12, color: '#f97316', lifecycle: 'biennial'
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
    height_inches: 8, color: '#f43f5e', lifecycle: 'perennial'
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
    height_inches: 24, color: '#6ee7b7', lifecycle: 'perennial'
  },
  {
    id: uuidv4(), name: 'Chives', scientific_name: 'Allium schoenoprasum',
    category: 'herb', emoji: '🌱', min_zone: 3, max_zone: 9,
    spacing_inches: 6, days_to_maturity: 60, sun_requirement: 'full_sun',
    water_needs: 'low', garden_types: 'in_ground,raised_bed,container',
    companions: 'Carrot,Tomato,Apple', antagonists: 'Beans,Peas',
    description: 'Mild onion flavor. Deters aphids and Japanese beetles.',
    planting_tips: 'Divide clumps every 3 years. Cut back flowering to maintain flavor.',
    height_inches: 12, color: '#a3e635', lifecycle: 'perennial'
  },
  {
    id: uuidv4(), name: 'Rosemary', scientific_name: 'Salvia rosmarinus',
    category: 'herb', emoji: '🌿', min_zone: 6, max_zone: 11,
    spacing_inches: 24, days_to_maturity: 90, sun_requirement: 'full_sun',
    water_needs: 'low', garden_types: 'in_ground,container,raised_bed',
    companions: 'Beans,Carrot,Cabbage,Sage', antagonists: 'Mint,Pumpkin',
    description: 'Drought-tolerant perennial herb. Repels cabbage moths.',
    planting_tips: 'Excellent drainage is essential. Prune after flowering.',
    height_inches: 36, color: '#475569', lifecycle: 'perennial'
  },
  {
    id: uuidv4(), name: 'Thyme', scientific_name: 'Thymus vulgaris',
    category: 'herb', emoji: '🌿', min_zone: 4, max_zone: 9,
    spacing_inches: 12, days_to_maturity: 60, sun_requirement: 'full_sun',
    water_needs: 'low', garden_types: 'in_ground,raised_bed,container',
    companions: 'Tomato,Eggplant,Strawberry,Cabbage', antagonists: 'Basil',
    description: 'Low-growing perennial. Deters cabbage worms.',
    planting_tips: 'Excellent ground cover between taller plants. Well-drained soil.',
    height_inches: 12, color: '#7c3aed', lifecycle: 'perennial'
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
  },
  // ── More vegetables ───────────────────────────────────────────────────────
  {
    id: uuidv4(), name: 'Arugula', scientific_name: 'Eruca vesicaria',
    category: 'vegetable', emoji: '🥗', min_zone: 3, max_zone: 11,
    spacing_inches: 6, days_to_maturity: 30, sun_requirement: 'part_shade',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed,container',
    companions: 'Lettuce,Spinach,Radish,Carrot', antagonists: null,
    description: 'Peppery salad green. Bolts quickly in summer heat.',
    planting_tips: 'Sow every 2–3 weeks for continuous harvest. Shade extends season.',
    height_inches: 8, color: '#4d7c0f'
  },
  {
    id: uuidv4(), name: 'Bok Choy', scientific_name: 'Brassica rapa var. chinensis',
    category: 'vegetable', emoji: '🥬', min_zone: 3, max_zone: 10,
    spacing_inches: 9, days_to_maturity: 45, sun_requirement: 'part_shade',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed,container',
    companions: 'Celery,Beet,Onion,Dill', antagonists: 'Strawberry,Tomato',
    description: 'Fast-growing Asian green. Great for spring and fall.',
    planting_tips: 'Direct sow or transplant. Harvest outer leaves or cut whole head.',
    height_inches: 14, color: '#65a30d'
  },
  {
    id: uuidv4(), name: 'Swiss Chard', scientific_name: 'Beta vulgaris var. cicla',
    category: 'vegetable', emoji: '🌈', min_zone: 3, max_zone: 10,
    spacing_inches: 12, days_to_maturity: 55, sun_requirement: 'part_shade',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed,container',
    companions: 'Beans,Cabbage,Onion,Tomato', antagonists: null,
    description: 'Colorful stems, nutritious leaves. Tolerates heat better than spinach.',
    planting_tips: 'Harvest outer leaves regularly. Very ornamental — great for containers.',
    height_inches: 18, color: '#dc2626', lifecycle: 'biennial'
  },
  {
    id: uuidv4(), name: 'Beet', scientific_name: 'Beta vulgaris',
    category: 'vegetable', emoji: '🟣', min_zone: 2, max_zone: 10,
    spacing_inches: 4, days_to_maturity: 60, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed',
    companions: 'Kohlrabi,Lettuce,Onion,Brassicas', antagonists: 'Pole Beans,Mustard',
    description: 'Dual harvest: roots and nutritious greens. Earthy, sweet flavor.',
    planting_tips: 'Direct sow. Thin to 4" apart. Edible greens throughout season.',
    height_inches: 12, color: '#7e22ce', lifecycle: 'biennial'
  },
  {
    id: uuidv4(), name: 'Corn', scientific_name: 'Zea mays',
    category: 'vegetable', emoji: '🌽', min_zone: 4, max_zone: 10,
    spacing_inches: 12, days_to_maturity: 80, sun_requirement: 'full_sun',
    water_needs: 'high', garden_types: 'in_ground,raised_bed',
    companions: 'Beans,Squash,Pumpkin,Cucumber', antagonists: 'Tomato,Celery',
    description: 'Tall summer crop. Part of the Three Sisters with beans and squash.',
    planting_tips: 'Plant in blocks (not rows) for wind pollination. Needs lots of nitrogen.',
    height_inches: 84, color: '#eab308'
  },
  {
    id: uuidv4(), name: 'Broccoli', scientific_name: 'Brassica oleracea var. italica',
    category: 'vegetable', emoji: '🥦', min_zone: 3, max_zone: 10,
    spacing_inches: 18, days_to_maturity: 70, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed',
    companions: 'Celery,Onion,Potato,Rosemary', antagonists: 'Tomato,Strawberry,Pepper',
    description: 'Cool-season brassica. Harvest main head, then side shoots continue.',
    planting_tips: 'Start indoors 6 weeks before last frost. Mulch to retain moisture.',
    height_inches: 24, color: '#15803d'
  },
  {
    id: uuidv4(), name: 'Cabbage', scientific_name: 'Brassica oleracea var. capitata',
    category: 'vegetable', emoji: '🥬', min_zone: 1, max_zone: 9,
    spacing_inches: 18, days_to_maturity: 70, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed',
    companions: 'Dill,Celery,Onion,Potato', antagonists: 'Tomato,Strawberry,Grape',
    description: 'Dense heads in green, red, or savoy. Great for cool seasons.',
    planting_tips: 'Consistent watering prevents splitting. Use row cover against cabbage worms.',
    height_inches: 14, color: '#16a34a'
  },
  {
    id: uuidv4(), name: 'Cauliflower', scientific_name: 'Brassica oleracea var. botrytis',
    category: 'vegetable', emoji: '🤍', min_zone: 3, max_zone: 10,
    spacing_inches: 18, days_to_maturity: 75, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed',
    companions: 'Celery,Beans,Dill,Sage', antagonists: 'Tomato,Strawberry,Pepper',
    description: 'White, purple, or orange heads. Needs consistent temps to form tight curds.',
    planting_tips: 'Blanch by folding leaves over head when it\'s golf-ball size.',
    height_inches: 20, color: '#f5f5f4'
  },
  {
    id: uuidv4(), name: 'Leek', scientific_name: 'Allium ampeloprasum',
    category: 'vegetable', emoji: '🧅', min_zone: 3, max_zone: 9,
    spacing_inches: 6, days_to_maturity: 120, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed',
    companions: 'Carrot,Celery,Onion,Parsnip', antagonists: 'Beans,Peas',
    description: 'Mild onion-family member. Harvest in fall through winter.',
    planting_tips: 'Start indoors early. Hill soil around stems to blanch and extend edible length.',
    height_inches: 30, color: '#86efac', lifecycle: 'biennial'
  },
  {
    id: uuidv4(), name: 'Parsnip', scientific_name: 'Pastinaca sativa',
    category: 'vegetable', emoji: '⬜', min_zone: 3, max_zone: 9,
    spacing_inches: 4, days_to_maturity: 120, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed',
    companions: 'Peas,Lettuce,Radish,Rosemary', antagonists: 'Carrot,Celery',
    description: 'Sweet root that improves after frost. Excellent winter keeper.',
    planting_tips: 'Direct sow early — slow to germinate. Deep loose soil for long roots.',
    height_inches: 20, color: '#fef9c3', lifecycle: 'biennial'
  },
  {
    id: uuidv4(), name: 'Green Onion', scientific_name: 'Allium cepa',
    category: 'vegetable', emoji: '🌿', min_zone: 3, max_zone: 10,
    spacing_inches: 3, days_to_maturity: 60, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed,container',
    companions: 'Carrot,Tomato,Lettuce,Strawberry', antagonists: 'Beans,Peas',
    description: 'Mild scallions harvested young. Quick-growing and compact.',
    planting_tips: 'Sow densely and harvest thinnings. Regrows from roots if cut above bulb.',
    height_inches: 12, color: '#84cc16'
  },
  {
    id: uuidv4(), name: 'Turnip', scientific_name: 'Brassica rapa var. rapa',
    category: 'vegetable', emoji: '🟤', min_zone: 2, max_zone: 9,
    spacing_inches: 6, days_to_maturity: 45, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed',
    companions: 'Peas,Beans,Lettuce', antagonists: 'Potato,Hedge Mustard',
    description: 'Fast root crop with edible greens. Sweetens after light frost.',
    planting_tips: 'Direct sow in spring or fall. Harvest at tennis-ball size for best flavor.',
    height_inches: 12, color: '#d4d4aa'
  },
  {
    id: uuidv4(), name: 'Pumpkin', scientific_name: 'Cucurbita pepo',
    category: 'vegetable', emoji: '🎃', min_zone: 3, max_zone: 9,
    spacing_inches: 60, days_to_maturity: 100, sun_requirement: 'full_sun',
    water_needs: 'high', garden_types: 'in_ground,raised_bed',
    companions: 'Corn,Beans,Nasturtium,Marigold', antagonists: 'Potato,Fennel',
    description: 'Space-hungry vining squash. Cures well for long storage.',
    planting_tips: 'Give 5×5 ft minimum. Direct sow after last frost. Mulch heavily.',
    height_inches: 18, color: '#ea580c'
  },
  {
    id: uuidv4(), name: 'Butternut Squash', scientific_name: 'Cucurbita moschata',
    category: 'vegetable', emoji: '🟧', min_zone: 3, max_zone: 11,
    spacing_inches: 48, days_to_maturity: 110, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed',
    companions: 'Corn,Beans,Nasturtium,Borage', antagonists: 'Potato,Fennel',
    description: 'Sweet, nutty winter squash that stores for months.',
    planting_tips: 'Start indoors 3–4 weeks before last frost. Train vines to save space.',
    height_inches: 16, color: '#d97706'
  },
  {
    id: uuidv4(), name: 'Celery', scientific_name: 'Apium graveolens',
    category: 'vegetable', emoji: '🟢', min_zone: 5, max_zone: 10,
    spacing_inches: 12, days_to_maturity: 120, sun_requirement: 'part_shade',
    water_needs: 'high', garden_types: 'in_ground,raised_bed',
    companions: 'Tomato,Beans,Leek,Brassicas', antagonists: 'Parsnip,Carrot,Corn',
    description: 'Requires consistent moisture and cool temps. Very rewarding if patient.',
    planting_tips: 'Start indoors 10–12 weeks before transplant. Never let soil dry out.',
    height_inches: 24, color: '#86efac', lifecycle: 'biennial'
  },
  {
    id: uuidv4(), name: 'Hot Pepper', scientific_name: 'Capsicum annuum (hot)',
    category: 'vegetable', emoji: '🌶️', min_zone: 5, max_zone: 11,
    spacing_inches: 18, days_to_maturity: 90, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed,container',
    companions: 'Basil,Tomato,Carrot,Marigold', antagonists: 'Fennel,Kohlrabi',
    description: 'Heat-loving nightshade. Hotter in hotter climates and drier conditions.',
    planting_tips: 'Start 8–10 weeks indoors. Stress slightly (reduce water) to increase heat.',
    height_inches: 30, color: '#dc2626'
  },
  {
    id: uuidv4(), name: 'Asparagus', scientific_name: 'Asparagus officinalis',
    category: 'vegetable', emoji: '🌿', min_zone: 3, max_zone: 8,
    spacing_inches: 18, days_to_maturity: 730, sun_requirement: 'full_sun',
    water_needs: 'low', garden_types: 'in_ground',
    companions: 'Tomato,Parsley,Basil,Marigold', antagonists: 'Onion,Garlic,Potato',
    description: 'Perennial that produces for 20+ years. Plant once, harvest forever.',
    planting_tips: 'Plant crowns 8" deep. Don\'t harvest first 2 years. Dedicate a permanent bed.',
    height_inches: 60, color: '#4ade80', lifecycle: 'perennial'
  },
  {
    id: uuidv4(), name: 'Kohlrabi', scientific_name: 'Brassica oleracea var. gongylodes',
    category: 'vegetable', emoji: '🟢', min_zone: 3, max_zone: 10,
    spacing_inches: 6, days_to_maturity: 50, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed,container',
    companions: 'Beet,Onion,Lettuce,Cucumber', antagonists: 'Tomato,Pepper,Beans',
    description: 'Crisp, mild, alien-looking brassica. Eaten raw or cooked.',
    planting_tips: 'Harvest when bulb is 2–3" diameter. Gets woody if too large.',
    height_inches: 14, color: '#a3e635'
  },
  // ── Herbs ────────────────────────────────────────────────────────────────────
  {
    id: uuidv4(), name: 'Parsley', scientific_name: 'Petroselinum crispum',
    category: 'herb', emoji: '🌿', min_zone: 3, max_zone: 9,
    spacing_inches: 9, days_to_maturity: 70, sun_requirement: 'part_shade',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed,container',
    companions: 'Tomato,Asparagus,Carrot,Rose', antagonists: 'Mint,Alliums',
    description: 'Biennial herb packed with vitamins. Attracts beneficial insects.',
    planting_tips: 'Slow to germinate. Soak seeds overnight. Great container herb.',
    height_inches: 14, color: '#22c55e', lifecycle: 'biennial'
  },
  {
    id: uuidv4(), name: 'Dill', scientific_name: 'Anethum graveolens',
    category: 'herb', emoji: '🌿', min_zone: 2, max_zone: 11,
    spacing_inches: 12, days_to_maturity: 45, sun_requirement: 'full_sun',
    water_needs: 'low', garden_types: 'in_ground,raised_bed',
    companions: 'Cabbage,Lettuce,Cucumber,Onion', antagonists: 'Carrot,Tomato,Fennel',
    description: 'Feathery annual. Attracts beneficial wasps and pollinators.',
    planting_tips: 'Direct sow only — dislikes transplanting. Keep away from fennel (cross-pollinates).',
    height_inches: 36, color: '#86efac'
  },
  {
    id: uuidv4(), name: 'Sage', scientific_name: 'Salvia officinalis',
    category: 'herb', emoji: '🌿', min_zone: 4, max_zone: 10,
    spacing_inches: 24, days_to_maturity: 75, sun_requirement: 'full_sun',
    water_needs: 'low', garden_types: 'in_ground,raised_bed,container',
    companions: 'Rosemary,Beans,Brassicas,Carrot', antagonists: 'Basil,Onion,Garlic',
    description: 'Perennial herb with silvery leaves. Repels cabbage moths and carrot flies.',
    planting_tips: 'Cut back by 1/3 each spring. Excellent drought tolerance.',
    height_inches: 20, color: '#9ca3af', lifecycle: 'perennial'
  },
  {
    id: uuidv4(), name: 'Oregano', scientific_name: 'Origanum vulgare',
    category: 'herb', emoji: '🌿', min_zone: 4, max_zone: 10,
    spacing_inches: 12, days_to_maturity: 55, sun_requirement: 'full_sun',
    water_needs: 'low', garden_types: 'in_ground,raised_bed,container',
    companions: 'Tomato,Pepper,Basil,Squash', antagonists: null,
    description: 'Perennial Mediterranean herb. Gets stronger after cutting.',
    planting_tips: 'Cut back before flowering for best flavor. Spreads — divide every 3 years.',
    height_inches: 12, color: '#4d7c0f', lifecycle: 'perennial'
  },
  {
    id: uuidv4(), name: 'Cilantro', scientific_name: 'Coriandrum sativum',
    category: 'herb', emoji: '🌿', min_zone: 3, max_zone: 11,
    spacing_inches: 6, days_to_maturity: 45, sun_requirement: 'part_shade',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed,container',
    companions: 'Spinach,Peas,Tomato,Beans', antagonists: 'Fennel',
    description: 'Love it or hate it herb. Both leaves and seeds (coriander) are useful.',
    planting_tips: 'Sow every 3 weeks for continuous supply. Bolt-resistant varieties recommended.',
    height_inches: 18, color: '#4ade80'
  },
  {
    id: uuidv4(), name: 'Lavender', scientific_name: 'Lavandula angustifolia',
    category: 'herb', emoji: '💜', min_zone: 5, max_zone: 10,
    spacing_inches: 24, days_to_maturity: 90, sun_requirement: 'full_sun',
    water_needs: 'low', garden_types: 'in_ground,raised_bed,container',
    companions: 'Tomato,Brassicas,Marigold,Rose', antagonists: null,
    description: 'Drought-tolerant perennial. Repels pests, attracts pollinators.',
    planting_tips: 'Excellent drainage is essential — will rot in wet soil. Trim after flowering.',
    height_inches: 24, color: '#a855f7', lifecycle: 'perennial'
  },
  {
    id: uuidv4(), name: 'Chamomile', scientific_name: 'Matricaria chamomilla',
    category: 'herb', emoji: '🌼', min_zone: 3, max_zone: 9,
    spacing_inches: 9, days_to_maturity: 60, sun_requirement: 'full_sun',
    water_needs: 'low', garden_types: 'in_ground,raised_bed,container',
    companions: 'Cabbage,Onion,Cucumber,Apple', antagonists: null,
    description: 'Delicate white flowers used for tea. Calming companion plant.',
    planting_tips: 'Direct sow. Self-seeds freely. Harvest flowers when petals droop back.',
    height_inches: 18, color: '#fde68a'
  },
  {
    id: uuidv4(), name: 'Lemon Balm', scientific_name: 'Melissa officinalis',
    category: 'herb', emoji: '🍋', min_zone: 3, max_zone: 9,
    spacing_inches: 24, days_to_maturity: 60, sun_requirement: 'part_shade',
    water_needs: 'moderate', garden_types: 'container',
    companions: 'Tomato,Squash', antagonists: null,
    description: 'Lemony herb that spreads aggressively. Must be contained. Calms bees.',
    planting_tips: 'Plant ONLY in containers to prevent invasive spreading across the garden.',
    height_inches: 24, color: '#fef08a', lifecycle: 'perennial'
  },
  {
    id: uuidv4(), name: 'Fennel', scientific_name: 'Foeniculum vulgare',
    category: 'herb', emoji: '🌿', min_zone: 5, max_zone: 10,
    spacing_inches: 18, days_to_maturity: 65, sun_requirement: 'full_sun',
    water_needs: 'low', garden_types: 'in_ground,raised_bed',
    companions: 'Dill', antagonists: 'Tomato,Pepper,Beans,Peas,Carrot,Coriander,Kohlrabi',
    description: 'Anise-flavored herb. ALLELOPATHIC — inhibits most neighboring plants.',
    planting_tips: 'Plant away from almost everything. Isolate or grow in its own section.',
    height_inches: 60, color: '#84cc16', lifecycle: 'perennial'
  },
  // ── Fruits ───────────────────────────────────────────────────────────────────
  {
    id: uuidv4(), name: 'Blueberry', scientific_name: 'Vaccinium corymbosum',
    category: 'fruit', emoji: '🫐', min_zone: 3, max_zone: 7,
    spacing_inches: 60, days_to_maturity: 1095, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed,container',
    companions: 'Strawberry,Thyme,Basil', antagonists: 'Tomato,Pepper',
    description: 'Perennial shrub. Needs acidic soil (pH 4.5–5.5). Plant 2+ varieties for best yield.',
    planting_tips: 'Acidify soil with sulfur. Mulch with pine needles. Takes 3 years to full production.',
    height_inches: 60, color: '#6d28d9', lifecycle: 'perennial'
  },
  {
    id: uuidv4(), name: 'Raspberry', scientific_name: 'Rubus idaeus',
    category: 'fruit', emoji: '🍓', min_zone: 3, max_zone: 9,
    spacing_inches: 24, days_to_maturity: 365, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground',
    companions: 'Garlic,Marigold,Lavender', antagonists: 'Blackberry,Tomato,Potato',
    description: 'Perennial canes with summer and fall varieties. Spreads via suckers.',
    planting_tips: 'Trellis required. Prune old canes after fruiting. Remove suckers to control spread.',
    height_inches: 60, color: '#e11d48', lifecycle: 'perennial'
  },
  {
    id: uuidv4(), name: 'Watermelon', scientific_name: 'Citrullus lanatus',
    category: 'fruit', emoji: '🍉', min_zone: 5, max_zone: 10,
    spacing_inches: 72, days_to_maturity: 90, sun_requirement: 'full_sun',
    water_needs: 'high', garden_types: 'in_ground',
    companions: 'Nasturtium,Marigold,Radish,Corn', antagonists: null,
    description: 'Space-hungry summer fruit. Needs heat and a long growing season.',
    planting_tips: 'Start indoors 3 weeks before last frost. Needs 80+ warm days. Lift fruit on tiles.',
    height_inches: 18, color: '#16a34a'
  },
  {
    id: uuidv4(), name: 'Cantaloupe', scientific_name: 'Cucumis melo',
    category: 'fruit', emoji: '🍈', min_zone: 5, max_zone: 10,
    spacing_inches: 48, days_to_maturity: 80, sun_requirement: 'full_sun',
    water_needs: 'moderate', garden_types: 'in_ground,raised_bed',
    companions: 'Nasturtium,Marigold,Corn', antagonists: 'Potato,Cucumber',
    description: 'Sweet muskmelon that loves heat. Harvest when stem slips easily.',
    planting_tips: 'Start indoors 3 weeks before last frost. Reduce water as fruit matures.',
    height_inches: 18, color: '#d97706'
  },
  // ── Flowers ──────────────────────────────────────────────────────────────────
  {
    id: uuidv4(), name: 'Zinnia', scientific_name: 'Zinnia elegans',
    category: 'flower', emoji: '🌺', min_zone: 2, max_zone: 11,
    spacing_inches: 12, days_to_maturity: 60, sun_requirement: 'full_sun',
    water_needs: 'low', garden_types: 'in_ground,raised_bed,container',
    companions: 'Tomato,Cucumber,Pepper,Squash', antagonists: null,
    description: 'Vibrant annual. Attracts butterflies and pollinators all summer.',
    planting_tips: 'Direct sow after last frost. Deadhead to extend bloom. Plant in clusters.',
    height_inches: 24, color: '#f43f5e'
  },
];

// Additive seed — insert only plants not already in DB by name
const existingNames = new Set(
  db.prepare('SELECT name FROM plants').all().map(p => p.name)
);
const toInsert = plants.filter(p => !existingNames.has(p.name));

if (toInsert.length === 0) {
  console.log(`✅ Plants already seeded (${existingNames.size} plants in database)`);
  process.exit(0);
}

const insertPlant = db.prepare(`
  INSERT INTO plants
  (id, name, scientific_name, category, emoji, min_zone, max_zone, spacing_inches,
   days_to_maturity, sun_requirement, water_needs, garden_types, companions,
   antagonists, description, planting_tips, height_inches, color, lifecycle)
  VALUES
  (@id, @name, @scientific_name, @category, @emoji, @min_zone, @max_zone, @spacing_inches,
   @days_to_maturity, @sun_requirement, @water_needs, @garden_types, @companions,
   @antagonists, @description, @planting_tips, @height_inches, @color, @lifecycle)
`);

db.exec('BEGIN');
for (const plant of toInsert) {
  insertPlant.run({ lifecycle: 'annual', ...plant }); // default annual; plant object overrides if set
}
db.exec('COMMIT');
console.log(`✅ Seeded ${toInsert.length} new plants (total: ${existingNames.size + toInsert.length})`);
process.exit(0);
