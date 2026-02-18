const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildSystemPrompt(garden, plants) {
  const plantList = plants.map(p =>
    `- ${p.name} (${p.emoji}) qty: ${p.quantity}`
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

module.exports = router;
