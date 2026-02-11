# Lockhart - AI Health Advisor

Lockhart is a personal AI health advisor that provides personalized nutrition tracking, workout guidance, and health insights tailored to your goals.

## Features

- **AI-Powered Chat Advisor** - Get personalized health advice from an AI that learns about you
- **Nutrition Calibration** - 5-day calibration period to understand your eating habits
- **Calorie Estimation** - AI-powered calorie estimation for meals you describe
- **Activity Tracking** - Log workouts, sleep, and other activities
- **Weekly Focus Goals** - Set and track weekly health goals
- **Profile Switching** - Create multiple profiles for different users or test scenarios
- **Data Backup & Restore** - Export and import your data

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Backend**: Express.js API (for AI integration)
- **AI**: Anthropic Claude API
- **Database**: Supabase (optional, for cloud sync)
- **Auth**: Supabase Auth

## Prerequisites

- Node.js 18+
- npm or yarn
- Anthropic API key (for AI features)
- Supabase project (optional, for cloud sync)

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd health-coach
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory:
   ```env
   # Required for AI features
   ANTHROPIC_API_KEY=your_anthropic_api_key

   # Optional for cloud sync
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   # Start both frontend and backend
   npm run dev:full

   # Or start separately:
   npm run dev          # Frontend only (port 5173)
   npm run server       # Backend only (port 3001)
   ```

5. **Open the app**

   Navigate to http://localhost:5173

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run server` | Start Express backend |
| `npm run dev:full` | Start both frontend and backend |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test:e2e` | Run Playwright E2E tests |

## Project Structure

```
src/
  components/     # React components
  context/        # React context providers
  hooks/          # Custom React hooks
  lib/            # Utility libraries
  *.js            # Store modules (localStorage-based state)

server/
  index.js        # Express server with API routes

tests/
  e2e/            # Playwright E2E tests
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | API key for Claude AI |
| `VITE_SUPABASE_URL` | No | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | No | Supabase anonymous key |

## Testing

Run E2E tests with Playwright:
```bash
npm run test:e2e
```

## License

Private - All rights reserved
