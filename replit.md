# RetinaGPT v6 — AI Ophthalmology Platform

## Architecture

```
frontend/   Next.js 16.2 — Premium Violet Glassmorphism Light UI (port 5000)
backend/    FastAPI AI engine — 24 endpoints (port 8000)
```

## Running the Project

### Frontend (active workflow)
```bash
cd frontend && npm run dev    # runs on port 5000
```

### Backend (requires ML packages)
```bash
cd backend
pip install -r requirements.txt
uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 2
```

## Design System v6 — `frontend/app/globals.css`

Premium light theme with violet/purple glassmorphism. Dark sidebar, light content area.

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#F5F3FF` | Light lavender page background |
| `--surface` | `#FFFFFF` | Card / panel background |
| `--ink` | `#1E1042` | Deep indigo text |
| `--ink-3` | `#7C6FAB` | Muted text |
| `--role-accent` | per-role | Primary accent color |
| `--sidebar-bg` | per-role | Dark gradient sidebar |

### Role system

Three completely independent systems with separate flows, pipelines and nav:

| Role | Accent | Sidebar | System Focus |
|------|--------|---------|-------------|
| `clinic` | Violet `#7C3AED` | Deep purple gradient | Patient journey: walk-in → scan → report → referral |
| `hospital` | Blue `#2563EB` | Navy gradient | Command centre: triage → batch → team → analytics |
| `ministry` | Royal Purple `#7C3AED` | Deep violet gradient | National intelligence: map → KPIs → WHO export |

Data-role attribute on body (`data-role="clinic|hospital|ministry"`) drives CSS overrides.

### Key CSS classes
- `.card` — white glass card, subtle shadow
- `.card-glass` — hero frosted glass with orb effects
- `.stat-tile.lime/.red/.blue/.amber/.role` — KPI stat blocks with colored top stripe
- `.grade-badge.g0-.g4` — DR grade classification badges (light on white)
- `.btn-primary/.btn-outline/.btn-ghost` — button variants using `--role-accent`
- `.pl-table` — data table with zebra stripe on hover
- `.status-chip` / `.s-pending/.s-completed` etc — status pills
- `.upload-zone` — drag & drop upload area
- `.pipeline` — step-by-step workflow pipeline indicator
- `.anim-up` thru `.anim-up-4` — staggered slide-up animations

## Pages
| Route | Purpose |
|-------|---------|
| `/onboarding/role` | Role selection — 3 cards, completely separate paths |
| `/onboarding/register` | Account + org setup |
| `/onboarding/org` | Demo data or first scan |
| `/dashboard` | Role-specific dashboard (3 completely different UIs) |
| `/patients` | Patient registry |
| `/analyze` | AI retinal scan + copilot |
| `/batch` | Batch analysis |
| `/reports` | Clinical report viewer |
| `/referrals` | Referral pipeline |
| `/progression` | Patient longitudinal tracking |
| `/triage` | Hospital triage queue |
| `/analytics` | Dept/national analytics |
| `/prevalence` | Ministry prevalence map |
| `/export` | WHO data export |
| `/search` | Case similarity search |
| `/settings` | Settings |
| `/passport/[token]` | Public patient passport (no auth) |

## API Proxy
Frontend rewrites `/api/retina/*` → `http://localhost:8000/*` via Next.js config.

## Stack
- **Frontend**: Next.js 16.2, React 18, TypeScript, Recharts, Lucide React
- **Backend**: FastAPI, PyTorch, torchvision, transformers, OpenCV
- **DB**: SQLite (`backend/database/retina_cases.db`)
- **Fonts**: Bebas Neue (display), Barlow Condensed (UI labels), Inter (body), JetBrains Mono

## Training
See `backend/TRAINING_GUIDE.md` for full dataset download and training instructions.
Hardware target: RTX 4060 8GB — configs in `backend/configs/training_config.yaml`.
