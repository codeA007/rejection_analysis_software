# Foundry Rejection Tracker

A local-first web app for foundry teams to record daily production, log rejections by type, manage the parts catalog, and review monthly rejection analysis with Excel export.

Built for laptop and desktop use — all data is stored locally in SQLite on your machine.

## Features

- **Dashboard** — Current-month production, rejections, rejection rate, poured weight, and quick actions
- **Parts Catalog** — Add, edit, search, and import parts from Excel (rows without weight are skipped)
- **Production Entry** — Log cast quantity, heat numbers, and production dates (with live heat yield)
- **Rejection Entry** — Log rejected quantity by part and rejection type
- **Furnace Yield** — Per-heat and monthly yield % from poured weight vs metal charged
- **Monthly Analysis** — Charts, part-level breakdown, and downloadable Excel report
- **Settings** — Furnace charge per heat (default 350 kg) and rejection types

## Tech Stack

- **Frontend:** React 19, React Router, Tailwind CSS, Chart.js
- **Backend:** Vite dev middleware with a local SQLite API (`better-sqlite3`)
- **Export:** `xlsx-js-style` for formatted monthly Excel reports

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- npm

`better-sqlite3` compiles native bindings during `npm install`. If install fails, ensure you have Xcode Command Line Tools (macOS) or a C++ build toolchain (Windows/Linux).

## Getting Started

### One-click start (recommended)

Double-click the launcher in the project folder (after [Node.js](https://nodejs.org/) 18+ is installed):

| OS | File |
|---|---|
| **Windows** | `Start Foundry Tracker.bat` or `StartFoundryTracker.bat` |
| **macOS** | `Start Foundry Tracker.command` |

The app always runs at **http://localhost:5176**. The first launch runs `npm install` if needed, then opens your browser. Keep the terminal/command window open while you use the app; closing it stops the server.

**Windows:** Double-click the `.bat` file in File Explorer (same folder as this project). You can pin it to the desktop: right-click the file → **Show more options** → **Send to** → **Desktop (create shortcut)**. If SmartScreen warns you, choose **More info** → **Run anyway**. Install [Node.js 18 LTS](https://nodejs.org/) first if prompted.

**macOS:** If the `.command` file will not open, run once in Terminal:  
`chmod +x "Start Foundry Tracker.command"`

### Manual start

```bash
# Install dependencies
npm install

# Start the dev server (http://localhost:5176)
npm run dev
```

The SQLite database is created automatically at `data/rejection.db` on first run. Default rejection types are seeded when the app starts.

### Optional: load demo data

```bash
npm run db:seed-demo-month
```

Seeds sample parts, production, and rejections for September 2026.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server on **localhost:5176** |
| `Start Foundry Tracker.bat` / `.command` | One-click desktop launcher (same port) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run oxlint |
| `npm run test:integration` | Run database/API integration tests (31 tests) |
| `npm run db:seed-rejection-types` | Seed default rejection types |
| `npm run db:seed-demo-month` | Seed demo production and rejection data |
| `npm run export:demo-excel` | Generate a sample monthly Excel file |

## Furnace yield

Each distinct **heat number** in production is treated as one furnace heat. Yield is based on **poured weight** (part weight × quantity) from the parts catalog:

- **Per heat:** `yield % = poured kg for that heat ÷ metal charged per heat × 100`
- **Overall (period):** `total poured kg ÷ (number of heats × charge kg) × 100`

Configure **metal charged per heat** under **Settings → Furnace** (default **350 kg**). Production entry shows current and projected yield for the selected heat.

## Business Rules

- A rejection can only be logged for a part that has **production in the same calendar month**
- Total rejections for a part in a month **cannot exceed** that part's production quantity for the month
- Rejection rate: `(rejection qty / production qty) × 100`, rounded to 2 decimals
- Poured weight is calculated from part catalog weight × production quantity
- Parts are not auto-created when logging rejections — the part must exist in the catalog first

## Excel Export

From **Monthly Analysis**, download a formatted workbook with:

- **POURED DATA** — daily production rows with heat numbers and poured weight
- **REJECTION DATA** — per-part rejection breakdown by type, with REJ % linked to poured production

Single-month exports are named like `September-2026.xlsx`.

## Project Structure

```
rejection_analysis/
├── src/                    # React UI
│   ├── api/                # API client helpers
│   ├── components/         # Shared UI components
│   ├── features/           # Page modules (home, parts, production, etc.)
│   └── utils/              # Date helpers, Excel export
├── database/               # SQLite schema, queries, migrations
├── plugins/                # Vite plugin — local /api routes
├── scripts/                # Seed scripts and integration tests
└── data/                   # Local SQLite database (gitignored)
```

## API

During development, the Vite plugin serves REST endpoints under `/api`:

- `/api/parts` — parts catalog
- `/api/production` — production entries
- `/api/rejections` — rejection entries
- `/api/rejection-types` — rejection type settings
- `/api/analysis/monthly` — monthly analysis data
- `/api/analysis/dashboard` — dashboard summary
- `/api/analysis/yield` — furnace yield by heat
- `/api/settings/furnace` — get or update metal charged per heat

## Testing

```bash
npm run test:integration
```

Integration tests run against the database using transactions that roll back, so your local data is not modified.

## Data Storage

All application data lives in `data/rejection.db`. This file is gitignored. Back it up regularly if you use the app in production.

To reset completely, stop the dev server, delete `data/rejection.db` (and any `-wal` / `-shm` files), then restart — a fresh database will be created.

## License

Private project.
