# Focus Reader

A browser-based reading tool for students with ADHD. Read one line at a time, track progress, and verify retention with an AI-generated quiz.

## Status

| Sprint | Feature | Status |
|--------|---------|--------|
| S1 | Line-by-line reader, progress bar, pace calibration | ✅ Complete |
| S2 | PDF + DOCX file upload | Pending |
| S3 | AI section chunking + previews | Pending |
| S4 | Retention quiz + concept gap analysis | Pending |
| S5 | Syllabus parser + today view | Pending |
| S6 | Dashboard (3 zones) | Pending |
| S7 | Polish, error states, API proxy | Pending |

## Quick start

```bash
npm install
cp .env.example .env   # add your Anthropic key when Sprint 3 is ready
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Tech stack

- React 18 + Vite
- Tailwind CSS (DM Sans / DM Mono fonts)
- Anthropic Claude API (Sprint 3+)
- Vercel deployment (static site + Edge Function API proxy)

## Project structure

```
src/
  components/
    LandingView.jsx      # text input entry point
    FocusReader.jsx      # core line-by-line reading experience
    SyllabusParser.jsx   # Sprint 5
    Dashboard.jsx        # Sprint 6
    Quiz.jsx             # Sprint 4
  hooks/
    useReadingPace.js    # pace calibration + time estimate
  utils/
    textUtils.js         # pure text processing functions
  api/
    claude.js            # Sprint 3 — shared Anthropic API module
  storage/
    state.js             # Sprint 5 — localStorage schema wrapper
  styles/
    index.css            # Tailwind base + custom utilities
```

## Architecture

See `FocusReader-Architecture-v1.0.docx` in the project docs for full technical decisions, API contracts, and data flow.

## Portfolio artifacts

1. PRD — `FocusReader-PRD-v1.0.docx`
2. Architecture doc — `FocusReader-Architecture-v1.0.docx`
3. Backlog — `FocusReader-Backlog-v1.0.docx`
4. Code review — pending Sprint 1 complete
5. Portfolio deck — pending build complete
