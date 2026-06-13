# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Focus Reader is a browser-based reading tool for students with ADHD. It provides line-by-line focused reading, progress tracking, pace calibration, AI-powered section analysis, retention quizzes, and syllabus parsing to help students stay organized with assignments.

## Development Commands

```bash
# Local development server (http://localhost:5173)
npm run dev

# Production build
npm run build

# Preview production build locally (http://localhost:3000)
npm run preview

# Build and preview
npm start
```

## Architecture

### View State Management

The app uses a view-based state machine managed in `App.jsx` with five possible views:
- `marketing` — Landing page for unauthenticated users
- `landing` — File/text input for starting a reading session
- `dashboard` — Assignment management and reading history
- `reader` — Core line-by-line reading experience (FocusReader.jsx)
- `review` — Flagged lines review across sessions

View transitions are controlled by handlers in App.jsx (`handleStartReading`, `handleExitReader`, etc).

### Dual-Mode Storage Pattern

The codebase implements a consistent dual-mode pattern for data persistence:

**Anonymous users** (no auth):
- Reading history → IndexedDB (`storage/history.js`)
- Assignments/courses → localStorage (`storage/state.js`)

**Authenticated users** (Clerk + Supabase):
- Reading history → Supabase `reading_sessions` table
- Assignments/courses → Supabase `assignments` and `courses` tables

Both storage modules export the same async API. Call `initHistory(userId)` and `initState(userId)` from App.jsx when auth state changes to switch modes. The modules check `SUPABASE_ENABLED && _userId && supabase` internally to route to cloud or local storage.

### Authentication System

Auth is optional. The app works in three modes:

1. **No Clerk** (local dev without `VITE_CLERK_PUBLISHABLE_KEY`):
   - AuthContext provides default values (not signed in)
   - All features work with local storage only

2. **Clerk without Supabase** (Clerk key set, but no Supabase):
   - User can sign in via Google OAuth
   - Still uses local storage (no cloud sync)

3. **Full SaaS mode** (Clerk + Supabase configured):
   - OAuth sign-in via Clerk
   - Cloud storage via Supabase
   - Rate-limited AI calls with BYOK support

**Key files:**
- `lib/AuthContext.jsx` — Provides `useAppAuth()` hook with uniform interface
- `lib/ClerkAuthBridge.jsx` — Bridges Clerk's hooks to AuthContext when Clerk is present
- `main.jsx` — Conditionally wraps app in ClerkProvider; handles OAuth callback route

### AI API Architecture

AI features (section analysis, quiz generation, syllabus parsing) use Claude Haiku via a proxy pattern:

1. **Development mode** (no Clerk):
   - Requests go directly from browser → Anthropic API
   - Uses `VITE_ANTHROPIC_API_KEY` or prompts for key stored in localStorage
   - Enabled for quick local development without infrastructure

2. **Production mode** (Clerk enabled):
   - All requests proxy through Vercel Edge Function at `api/claude.js`
   - Edge function handles:
     - JWT extraction from `Authorization` header
     - BYOK lookup in Supabase `user_settings.api_key`
     - Per-user daily rate limiting (default 25 calls/day)
     - Anonymous requests allowed (use operator key)

**Key files:**
- `src/api/claude.js` — Client-side module; exports `analyzeText()`, `generateQuiz()`, `parseSyllabus()`
- `api/claude.js` — Vercel Edge Function; handles auth, rate limiting, key management

### File Processing

`utils/fileUtils.js` handles PDF and DOCX uploads:
- **PDF**: Uses `pdfjs-dist` to extract text page by page
- **DOCX**: Uses `mammoth` to convert to HTML, then extracts text
- Both return raw text that's fed into the line-based reading system

### Text Processing

`utils/textUtils.js` contains pure functions for text manipulation:
- `parseLines()` — Converts raw text to line array, handling list detection (▸ prefix for multi-line items)
- `parseParagraphs()` — Groups lines into paragraphs for paragraph-mode reading
- `bionicize()` — Bolds first half of each word (accessibility feature)
- `countWords()`, `formatMinutes()` — Reading statistics

### Reading Session Flow

1. User inputs text or uploads file → `LandingView`
2. `handleStartReading()` creates history record → `storage/history.js`
3. App transitions to `reader` view → `FocusReader.jsx` component
4. FocusReader manages:
   - Line-by-line display with auto-scroll
   - Pace calibration (reading speed tracking)
   - Section detection (AI-powered)
   - Flagged lines (user marks important content)
   - Optional quiz generation
5. On exit, `handleExitReader()` saves progress and returns to dashboard

**Critical invariant**: `readingMeta` in App.jsx tracks `{ sessionId, initialLine, initialFlaggedLines }` during active session. This is the source of truth for resume/continue functionality.

## Environment Variables

**Development (.env file)**:
```bash
# Anthropic key for local AI features (dev only - never deploy this)
VITE_ANTHROPIC_API_KEY=sk-ant-...

# Optional: enable Clerk auth in dev
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

**Production (Vercel dashboard)**:
```bash
# Server-side Anthropic key (used by api/claude.js Edge Function)
ANTHROPIC_API_KEY=sk-ant-...

# Clerk auth
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...

# Supabase cloud storage
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI rate limiting
DAILY_AI_LIMIT=25
```

## Deployment

Deployed on Vercel as a Vite SPA + Edge Function:
- `vercel.json` configures SPA routing (all routes → `/index.html`)
- `api/claude.js` is automatically deployed as an Edge Function
- No build configuration needed beyond standard Vite

## Key Hooks

- `useReadingPace()` — Tracks WPM and provides time estimates
- `useDisplayPrefs()` — Font size, line spacing, dyslexia font, bionic mode (persisted to localStorage)
- `useTTS()` — Text-to-speech integration via Web Speech API
- `useFlaggedLines()` — Manages flagged line state and persistence

## Styling

Uses Tailwind with custom design tokens:
- **ink** — Brand neutral (slate-based); replaces default gray
- **focus** — Primary accent (teal/blue); used for CTAs, active states
- **sage** — Success states, calibration feedback

Custom fonts loaded via CDN (see `index.html`):
- DM Sans (body text)
- DM Mono (code, labels)
- Quicksand (wordmark)
- OpenDyslexic (accessibility option)

## Testing Approach

No test framework currently configured. When adding tests:
- Use Vitest (already Vite-based)
- Test pure functions in `utils/` first (text processing, file parsing)
- Mock Supabase client for storage tests
- Mock Clerk hooks for auth-dependent components

## Common Tasks

### Adding a new AI feature
1. Add prompt + extraction logic to `src/api/claude.js`
2. Add corresponding handler in `api/claude.js` Edge Function (update `requestType` logic if needed)
3. Update rate limit logic if this feature should count separately

### Adding a new storage entity
1. Add Supabase table with `user_id` column + RLS policies
2. Add corresponding functions to `storage/state.js` or `storage/history.js`
3. Follow dual-mode pattern: check `isCloud()` → Supabase query OR localStorage fallback

### Adding a new view
1. Create component in `src/components/`
2. Add view state to App.jsx state machine
3. Add navigation handler (e.g., `handleGoToNewView`)
4. Add conditional render in App.jsx return

## Migration Notes

Sprint 9 introduced cloud sync. The app handles migration from local → cloud storage:
- `MigrationPrompt.jsx` detects local sessions on first Clerk sign-in
- Offers one-time migration (copies IndexedDB → Supabase)
- Uses `{ localOnly: true }` flag on storage functions to force local reads during migration
