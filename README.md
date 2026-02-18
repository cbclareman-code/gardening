# ChatGRD — Garden Planning App

A visual, AI-powered garden planning app for new and suburban gardeners.

## Quick Start (Localhost)

### Prerequisites
- Node.js 18+
- An Anthropic API key (for NLI chat features)

### 1. Backend Setup

```bash
cd backend
npm install
```

Copy the env file and add your API key:
```bash
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=your-key-here
```

Seed the plant database:
```bash
npm run seed
```

Start the backend:
```bash
npm run dev
# Runs on http://localhost:3001
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### 3. Open the app

Visit **http://localhost:5173** — create an account and start planning!

---

## Features (MVP)

- **Garden Wizard** — 5-step wizard: location/zone, garden type (7 icon types), dimensions, preferences, photo upload
- **Plant Database** — 25 plants with zone filtering, companion planting data, spacing & days-to-maturity
- **Visual Layout** — Canvas-based garden map showing plant placement and companion pairing lines
- **Plant Selection** — Zone-filtered plant cards with search and category filters
- **NLI Chat** — Always-available AI chat powered by Claude (Sonnet 4.6). Type commands like "Add basil" or "What grows in partial shade?" and the garden updates live
- **Auth** — Username/password registration and login with JWT sessions

## Tech Stack

- **Backend**: Node.js + Express + SQLite (better-sqlite3) + JWT
- **Frontend**: React 18 + Vite + Tailwind CSS + React Router + Zustand
- **AI**: Anthropic Claude Sonnet 4.6 via `@anthropic-ai/sdk`
- **Database**: SQLite (zero-config, file-based, perfect for local dev)
- **File uploads**: Multer (garden photos stored in `/backend/uploads/`)

## Project Structure

```
chatgrd/
├── backend/
│   ├── src/
│   │   ├── routes/       # auth, gardens, plants, nli
│   │   ├── middleware/   # JWT auth
│   │   ├── db/           # SQLite schema + seed data
│   │   └── index.js      # Express app
│   ├── data/             # SQLite database file (gitignored)
│   ├── uploads/          # Garden photos (gitignored)
│   └── .env              # API keys (gitignored)
└── frontend/
    └── src/
        ├── components/   # Navbar, PlantCard, GardenLayout, NLIChat
        ├── pages/        # Welcome, Login, Register, Dashboard, GardenWizard, GardenView
        ├── store/        # Zustand auth store
        └── utils/        # Axios API client, zone helpers
```

## NLI Examples

Once in a garden, open the chat (💬 button) and try:
- "Add strawberries and basil"
- "What can I plant that matures before June?"
- "Remove radishes — I want more space for tomatoes"
- "What are good companion plants for my tomatoes?"
- "Optimize my layout for companion planting"
