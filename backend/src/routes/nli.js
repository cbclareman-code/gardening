const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Zone → approximate spring/fall frost dates
const FROST_DATES = {
  '3':  { last: 'May 15',      first: 'September 1'  },
  '4':  { last: 'May 1',       first: 'October 1'    },
  '5':  { last: 'April 15',    first: 'October 15'   },
  '6':  { last: 'April 1',     first: 'November 1'   },
  '7':  { last: 'March 15',    first: 'November 15'  },
  '8':  { last: 'March 1',     first: 'December 1'   },
  '9':  { last: 'February 15', first: 'December 15'  },
  '10': { last: 'January 31',  first: 'none (frost-free)' },
};

function buildSystemPrompt(garden, plants) {
  const plantList = plants.map(p =>
    `- ${p.name}${p.notes ? ` (variety: ${p.notes})` : ''} (${p.emoji}) qty: ${p.quantity}`
  ).join('\n');

  return `You are ChatGRD, an expert garden planning assistant. You help users plan, optimize, and manage their gardens through natural conversation.

CURRENT GARDEN STATE:
- Name: ${garden.name}
- Type: ${garden.garden_type}
- Location: ${garden.location_city || 'Unknown'}, ${garden.location_state || ''}
- Hardiness Zone: ${garden.hardiness_zone || 'Unknown'}
- Dimensions: ${garden.width_ft || '?'} ft wide × ${garden.length_ft || '?'} ft long
- Sun Exposure: ${garden.sun_exposure}
- Irrigation: ${garden.irrigation_type}
- Has Fencing: ${garden.has_fencing ? 'Yes' : 'No'}

CURRENT PLANTS (${plants.length} varieties):
${plantList || '(No plants added yet)'}

AVAILABLE ACTIONS:
You can respond with structured actions to modify the garden. When suggesting changes, include a JSON block in your response with the following format:

\`\`\`json
{
  "actions": [
    {"type": "add_plant", "plant_name": "Tomato", "reason": "Great for zone 7"},
    {"type": "remove_plant", "plant_name": "Radish", "reason": "Need space for strawberries"},
    {"type": "update_garden", "field": "sun_exposure", "value": "part_shade", "reason": "Optimize for herbs"},
    {"type": "suggest_layout", "description": "Rearrange for companion planting"}
  ],
  "message": "Your conversational response explaining the changes"
}
\`\`\`

If no structural changes are needed (just answering a question), you can respond in plain text without a JSON block.

GUIDELINES:
- Be conversational, friendly, and encouraging
- Consider companion planting when making recommendations
- Account for the hardiness zone when suggesting plants
- Explain your reasoning briefly
- If there are conflicts (not enough space, incompatible companions), mention them
- For zone filtering: Zone 1-3 = very cold, 4-6 = cold/temperate, 7-9 = warm, 10-13 = tropical/subtropical
- Always consider sun exposure requirements
- Keep responses concise but helpful`;
}

// Send message to NLI
router.post('/chat', async (req, res) => {
  try {
    const { garden_id, message, conversation_history } = req.body;

    if (!message) return res.status(400).json({ error: 'Message is required' });

    let garden = null;
    let plants = [];

    if (garden_id) {
      garden = db.prepare('SELECT * FROM gardens WHERE id = ? AND user_id = ?')
        .get(garden_id, req.user.id);
      if (!garden) return res.status(404).json({ error: 'Garden not found' });

      plants = db.prepare(`
        SELECT gp.*, p.name, p.emoji, p.category
        FROM garden_plants gp
        JOIN plants p ON gp.plant_id = p.id
        WHERE gp.garden_id = ?
      `).all(garden_id);
    }

    // Build conversation for Claude
    const systemPrompt = garden
      ? buildSystemPrompt(garden, plants)
      : `You are ChatGRD, an expert garden planning assistant. Help users plan and build their gardens. Be conversational, friendly, and knowledgeable about plants, companion planting, hardiness zones, and garden layouts. If the user wants to create or work on a garden, let them know they can use the garden wizard or create a garden first.`;

    // Build messages array from history
    const messages = [];
    if (conversation_history && Array.isArray(conversation_history)) {
      for (const msg of conversation_history.slice(-10)) { // Keep last 10 messages for context
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }
    messages.push({ role: 'user', content: message });

    // Save user message
    const userMsgId = uuidv4();
    db.prepare(`
      INSERT INTO nli_conversations (id, garden_id, user_id, role, content)
      VALUES (?, ?, ?, 'user', ?)
    `).run(userMsgId, garden_id || null, req.user.id, message);

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages
    });

    const assistantContent = response.content[0].text;

    // Parse any JSON actions from response
    let actions = [];
    let displayMessage = assistantContent;

    const jsonMatch = assistantContent.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        actions = parsed.actions || [];
        displayMessage = parsed.message || assistantContent.replace(/```json\n[\s\S]*?\n```/, '').trim();

        // Execute actions on the database
        if (garden_id && garden) {
          for (const action of actions) {
            if (action.type === 'add_plant') {
              const plant = db.prepare('SELECT * FROM plants WHERE name LIKE ?')
                .get(`%${action.plant_name}%`);
              if (plant) {
                const existingCount = db.prepare('SELECT COUNT(*) as cnt FROM garden_plants WHERE garden_id = ?')
                  .get(garden_id).cnt;
                const id = uuidv4();
                db.prepare(`
                  INSERT INTO garden_plants (id, garden_id, plant_id, x_position, y_position, quantity)
                  VALUES (?, ?, ?, ?, ?, 1)
                `).run(id, garden_id, plant.id,
                  (existingCount % 5) * 2,
                  Math.floor(existingCount / 5) * 2);
              }
            } else if (action.type === 'remove_plant') {
              const plant = db.prepare('SELECT * FROM plants WHERE name LIKE ?')
                .get(`%${action.plant_name}%`);
              if (plant) {
                db.prepare('DELETE FROM garden_plants WHERE garden_id = ? AND plant_id = ?')
                  .run(garden_id, plant.id);
              }
            } else if (action.type === 'update_garden') {
              const allowedFields = ['sun_exposure', 'irrigation_type', 'notes', 'has_fencing'];
              if (allowedFields.includes(action.field)) {
                db.prepare(`UPDATE gardens SET ${action.field} = ?, updated_at = datetime('now') WHERE id = ?`)
                  .run(action.value, garden_id);
              }
            }
          }
        }
      } catch (e) {
        // JSON parse failed, just use full text
        console.warn('Failed to parse NLI JSON actions:', e.message);
      }
    }

    // Save assistant message
    const asstMsgId = uuidv4();
    db.prepare(`
      INSERT INTO nli_conversations (id, garden_id, user_id, role, content)
      VALUES (?, ?, ?, 'assistant', ?)
    `).run(asstMsgId, garden_id || null, req.user.id, displayMessage);

    // Return updated garden state if it changed
    let updatedGarden = null;
    let updatedPlants = [];
    if (garden_id && actions.length > 0) {
      updatedGarden = db.prepare('SELECT * FROM gardens WHERE id = ?').get(garden_id);
      updatedPlants = db.prepare(`
        SELECT gp.*, p.name, p.emoji, p.color, p.category, p.spacing_inches,
               p.days_to_maturity, p.sun_requirement, p.companions, p.antagonists
        FROM garden_plants gp
        JOIN plants p ON gp.plant_id = p.id
        WHERE gp.garden_id = ?
      `).all(garden_id);
    }

    res.json({
      message: displayMessage,
      actions,
      garden: updatedGarden,
      plants: updatedPlants.length > 0 ? updatedPlants : undefined,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      }
    });
  } catch (err) {
    console.error('NLI error:', err);
    if (err.status === 401) {
      return res.status(500).json({ error: 'Invalid Claude API key. Please check ANTHROPIC_API_KEY in .env' });
    }
    res.status(500).json({ error: 'NLI request failed: ' + err.message });
  }
});

// Get conversation history for a garden
router.get('/history/:gardenId', async (req, res) => {
  try {
    const garden = db.prepare('SELECT id FROM gardens WHERE id = ? AND user_id = ?')
      .get(req.params.gardenId, req.user.id);
    if (!garden) return res.status(404).json({ error: 'Garden not found' });

    const history = db.prepare(`
      SELECT role, content, created_at FROM nli_conversations
      WHERE garden_id = ? AND user_id = ?
      ORDER BY created_at ASC
      LIMIT 50
    `).all(req.params.gardenId, req.user.id);

    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ── AI-generated planting recommendation ─────────────────────────────────────
router.post('/recommend/:gardenId', async (req, res) => {
  // Fail fast if the API key is obviously a placeholder
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  if (!apiKey || apiKey.includes('your-') || apiKey === 'sk-ant-') {
    return res.status(500).json({
      error: 'Anthropic API key not configured — add your key to backend/.env as ANTHROPIC_API_KEY=sk-ant-... and restart the server'
    });
  }

  try {
    const garden = db.prepare('SELECT * FROM gardens WHERE id = ? AND user_id = ?')
      .get(req.params.gardenId, req.user.id);
    if (!garden) return res.status(404).json({ error: 'Garden not found' });

    let layoutData = {};
    try { layoutData = JSON.parse(garden.layout_data || '{}'); } catch {}
    const units = layoutData.units || [];
    if (units.length === 0) {
      return res.status(400).json({ error: 'No layout units found — complete the garden builder step first' });
    }

    const allPlants = db.prepare('SELECT * FROM plants ORDER BY name').all();
    const zone = String(garden.hardiness_zone || '6');
    const frost = FROST_DATES[zone] || FROST_DATES['6'];

    // Collect any variety notes the user added to pre-selected plants
    const varietyNotes = db.prepare(`
      SELECT p.name, gp.notes as variety_note
      FROM garden_plants gp JOIN plants p ON gp.plant_id = p.id
      WHERE gp.garden_id = ? AND gp.notes IS NOT NULL AND gp.notes != ''
    `).all(req.params.gardenId);
    const varietyContext = varietyNotes.length
      ? `\nGARDENER'S VARIETY PREFERENCES: ${varietyNotes.map(v => `${v.name} → ${v.variety_note}`).join('; ')}. Account for these varieties when estimating spacing, growth habit (determinate/indeterminate), and sun needs.`
      : '';

    // Group shared-soil units so the AI knows to treat them as one rotation zone
    const sharedSoilUnitIds = units.filter(u => u.shared_soil).map(u => u.id);
    const sharedSoilNote = sharedSoilUnitIds.length > 1
      ? `\nSHARED SOIL NOTE: Units ${sharedSoilUnitIds.join(', ')} share continuous soil. Treat them as ONE growing zone for crop rotation — do not repeat the same plant family across any of these units.`
      : '';

    // Build detailed per-unit summary including capacity, sun, and history
    const unitSummary = units.map(u => {
      const wft = parseFloat(u.width_ft) || 0;
      const lft = parseFloat(u.length_ft) || 0;
      const sqft = (wft * lft).toFixed(1);
      const sun = u.sun_exposure || garden.sun_exposure || 'full_sun';
      const prev = u.previous_plants ? `previously grew: ${u.previous_plants}` : 'no prior planting history';
      const fenced = u.has_fencing ? ', fenced' : '';
      const shared = u.shared_soil ? ' [SHARED SOIL]' : '';
      return `Unit ${u.id} "${u.label}" [${u.type_id}] ${wft}ft × ${lft}ft = ${sqft} sqft | sun: ${sun}${fenced}${shared} | ${prev}`;
    }).join('\n');

    // Plant catalog with capacity hints per spacing
    const plantCatalog = allPlants.map(p => {
      const sp = p.spacing_inches || 12;
      const spFt = sp / 12;
      const invasive = (p.name === 'Mint' || (p.antagonists || '').includes('spreads')) ? ' ⚠️INVASIVE' : '';
      return `${p.name}${invasive} | ${p.category} | spacing: ${sp}" (needs ${(spFt * spFt).toFixed(2)} sqft each) | ${p.days_to_maturity}d | sun: ${p.sun_requirement} | companions: ${p.companions || 'none'} | antagonists: ${p.antagonists || 'none'} | types: ${p.garden_types}`;
    }).join('\n');

    const prompt = `You are an expert organic garden planner. Create a precise, space-aware planting plan.

GARDEN: ${garden.name}
Zone: ${zone} | Last spring frost: ${frost.last} | First fall frost: ${frost.first}
Irrigation: ${garden.irrigation_type} | Notes: ${garden.notes || 'none'}${varietyContext}

GARDEN UNITS:
${unitSummary}${sharedSoilNote}

PLANT CATALOG (use exact names from this list only):
${plantCatalog}

TODAY: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

STRICT RULES — violations will produce a bad plan:

1. CAPACITY: Each unit can hold at most floor(sqft / (spacing_inches/12)²) plants of a single variety. Never exceed this. A 2 sqft container with Strawberry (18" spacing = 1.5ft → 2.25 sqft each) fits 0 Strawberry plants — do NOT assign Strawberry to a 2 sqft container. A 12 sqft raised bed fits floor(12/2.25)=5 Strawberries.

2. INVASIVE PLANTS: Mint MUST go in a container alone — never in raised beds or in-ground beds, and never mixed with other plants. Lemon Balm same rule.

3. SUN MATCHING: Only assign full_sun plants to full_sun units. Part_shade plants tolerate both full_sun and part_shade. Never assign full_sun plants to shade units.

4. COMPANION GROUPS: Place known companion pairs in the same unit (e.g., Tomato + Basil + Marigold, Three Sisters: Corn + Beans + Squash). This is the primary optimization goal.

5. ANTAGONIST AVOIDANCE: Never place antagonists together in the same unit (e.g., Tomato + Fennel, Onion + Beans).

6. CROP ROTATION: If a unit has previous plants listed, do NOT assign the same plant family. Tomato/Pepper/Eggplant = nightshades. Carrot/Parsley/Dill = umbellifers. Cabbage/Kale/Broccoli = brassicas. Onion/Garlic/Leek = alliums. Beans/Peas = legumes.

7. TYPE MATCHING: Container plants must be in container or raised_bed units. Plants with garden_types "in_ground,raised_bed" should NOT go in a 1-2 sqft container.

8. VARIETY: Use multiple different plant families across units for biodiversity. Spread crops by type (leaf/root/fruit/herb) across units.

9. SUCCESSION PLANTING: Maximize each unit's productivity across the season. Fast-maturing cool-season crops (Radish 25d, Lettuce 45d, Spinach 40d, Pea 60d) can occupy a unit early then be cleared before warm-season crops go in. When you plan this, assign BOTH the early and late crop to the unit. In the planting_schedule, mark the warm-season crop's succession_of field with the early crop's name. Example: Radish sown Feb, harvested May → Tomato transplanted May into the same unit.

10. CAPACITY WARNINGS: If the selected plants cannot all fit given the space constraints, list the issue in capacity_warnings. Be specific: "Unit 3 (8 sqft) can fit 3 Tomatoes but 5 were planned — reduced to 3."

Return ONLY valid JSON:
{
  "plant_assignments": {
    "1": ["Tomato", "Basil", "Marigold", "Radish"],
    "2": ["Lettuce", "Carrot", "Radish"]
  },
  "summary": "3-5 paragraphs: what's in each unit and why, companion pairs chosen, sun/space reasoning, rotation decisions, succession strategy, and any important cautions",
  "capacity_warnings": [],
  "planting_schedule": [
    {
      "plant_name": "Radish",
      "unit_id": 1,
      "area_name": "My Garden",
      "wave": 1,
      "sow_indoors": null,
      "transplant_outdoors": "${new Date().getFullYear()}-02-20",
      "first_harvest": "${new Date().getFullYear()}-03-17",
      "last_harvest": "${new Date().getFullYear()}-04-30",
      "notes": "Direct sow. Clear bed by May 1 to make way for tomatoes."
    },
    {
      "plant_name": "Tomato",
      "unit_id": 1,
      "area_name": "My Garden",
      "wave": 2,
      "succession_of": "Radish",
      "sow_indoors": "${new Date().getFullYear()}-03-15",
      "transplant_outdoors": "${new Date().getFullYear()}-05-01",
      "first_harvest": "${new Date().getFullYear()}-07-15",
      "last_harvest": "${new Date().getFullYear()}-09-30",
      "notes": "Transplant after radishes cleared. Start indoors 6-8 weeks before last frost."
    }
  ]
}
Omit sow_indoors for direct-sown crops. Use realistic ${new Date().getFullYear()} dates matching zone ${zone}.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].text.trim();
    // Strip any accidental markdown fences
    const jsonText = raw.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '');
    let rec;
    try {
      rec = JSON.parse(jsonText);
    } catch (e) {
      console.error('Recommend JSON parse error:', jsonText.slice(0, 500));
      return res.status(500).json({ error: 'AI returned unparseable response — please try again' });
    }

    const { plant_assignments = {}, summary = '', planting_schedule = [], capacity_warnings = [] } = rec;

    // Resolve plant names → IDs; add new plants to garden_plants if not already there
    const existingGP = db.prepare('SELECT plant_id FROM garden_plants WHERE garden_id = ?')
      .all(req.params.gardenId);
    const existingIds = new Set(existingGP.map(r => r.plant_id));

    const assignmentIds = {}; // { unit_id: [plant_db_id, ...] }
    for (const [uid, names] of Object.entries(plant_assignments)) {
      assignmentIds[uid] = [];
      for (const name of names) {
        const plant = db.prepare("SELECT * FROM plants WHERE LOWER(name) LIKE LOWER(?) LIMIT 1")
          .get(`%${name}%`);
        if (!plant) continue;
        assignmentIds[uid].push(plant.id);
        if (!existingIds.has(plant.id)) {
          db.prepare(
            'INSERT INTO garden_plants (id, garden_id, plant_id, x_position, y_position, quantity) VALUES (?, ?, ?, 0, 0, 1)'
          ).run(uuidv4(), req.params.gardenId, plant.id);
          existingIds.add(plant.id);
        }
      }
    }

    // Save back into layout_data
    const updatedLayout = { ...layoutData, plant_assignments: assignmentIds, summary, planting_schedule, capacity_warnings };
    db.prepare("UPDATE gardens SET layout_data = ?, updated_at = datetime('now') WHERE id = ?")
      .run(JSON.stringify(updatedLayout), req.params.gardenId);

    const updatedGarden = db.prepare('SELECT * FROM gardens WHERE id = ?').get(req.params.gardenId);
    const updatedPlants = db.prepare(`
      SELECT gp.*, p.name, p.emoji, p.color, p.category, p.spacing_inches,
             p.days_to_maturity, p.sun_requirement, p.companions, p.antagonists,
             p.description, p.planting_tips
      FROM garden_plants gp JOIN plants p ON gp.plant_id = p.id
      WHERE gp.garden_id = ?
    `).all(req.params.gardenId);

    res.json({ garden: updatedGarden, plants: updatedPlants, summary, planting_schedule, capacity_warnings });
  } catch (err) {
    console.error('Recommend error:', err);
    if (err.status === 401 || err.code === 'authentication_error') {
      return res.status(500).json({ error: 'Invalid Anthropic API key — set ANTHROPIC_API_KEY in backend/.env and restart the server' });
    }
    res.status(500).json({ error: 'Recommendation failed: ' + err.message });
  }
});

// ── AI feedback on a user-described planting plan ────────────────────────────
router.post('/feedback/:gardenId', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  if (!apiKey || apiKey.includes('your-')) {
    return res.status(500).json({ error: 'Anthropic API key not configured' });
  }

  try {
    const garden = db.prepare('SELECT * FROM gardens WHERE id = ? AND user_id = ?')
      .get(req.params.gardenId, req.user.id);
    if (!garden) return res.status(404).json({ error: 'Garden not found' });

    const { user_plan } = req.body;
    if (!user_plan?.trim()) return res.status(400).json({ error: 'user_plan is required' });

    let layoutData = {};
    try { layoutData = JSON.parse(garden.layout_data || '{}'); } catch {}
    const units = layoutData.units || [];
    const zone = String(garden.hardiness_zone || '6');
    const frost = FROST_DATES[zone] || FROST_DATES['6'];

    const unitSummary = units.map(u => {
      const wft = parseFloat(u.width_ft) || 0;
      const lft = parseFloat(u.length_ft) || 0;
      const sqft = (wft * lft).toFixed(1);
      const prev = u.previous_plants ? `previously grew: ${u.previous_plants}` : 'no prior history';
      return `Bed ${u.id} "${u.label}" ${wft}×${lft}ft = ${sqft} sqft | sun: ${u.sun_exposure || 'full_sun'} | ${prev}`;
    }).join('\n');

    const allPlants = db.prepare('SELECT name, category, spacing_inches, companions, antagonists, sun_requirement FROM plants ORDER BY name').all();
    const plantCatalog = allPlants.map(p =>
      `${p.name} | ${p.category} | spacing: ${p.spacing_inches}" | sun: ${p.sun_requirement} | companions: ${p.companions || 'none'} | antagonists: ${p.antagonists || 'none'}`
    ).join('\n');

    const prompt = `You are an expert organic garden planner reviewing a gardener's proposed planting plan.

GARDEN: ${garden.name}
Zone: ${zone} | Last spring frost: ${frost.last} | First fall frost: ${frost.first}
Irrigation: ${garden.irrigation_type}

BEDS:
${unitSummary || '(no beds defined yet)'}

PLANT REFERENCE:
${plantCatalog}

THE GARDENER'S PLAN:
${user_plan.trim()}

Evaluate this plan and respond with valid JSON only:
{
  "works_well": "2-4 bullet points (use \\n• to separate) of what the gardener got right — companion pairs, rotation choices, good space use, etc.",
  "suggestions": "2-4 bullet points (use \\n• to separate) of specific, actionable improvements — antagonist conflicts to fix, capacity issues, better companions, rotation improvements, succession ideas.",
  "overall": "1-2 sentence encouraging summary."
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].text.trim()
      .replace(/^```json?\n?/i, '').replace(/\n?```$/i, '');
    let feedback;
    try {
      feedback = JSON.parse(raw);
    } catch {
      return res.status(500).json({ error: 'AI returned unparseable response — try again' });
    }

    res.json(feedback);
  } catch (err) {
    console.error('Feedback error:', err);
    if (err.status === 401) return res.status(500).json({ error: 'Invalid Anthropic API key' });
    res.status(500).json({ error: 'Feedback failed: ' + err.message });
  }
});

module.exports = router;
