# OOPForge

> **Learn OOP. Practice C++. Master Interviews.**

**OOPForge** is a local-first, full-stack **C++17 Object-Oriented Programming (OOP)** learning and technical interview practice platform inspired by Striver's A2Z DSA sheet, LeetCode's problem workspace, and personal progress dashboards.

It transforms structured C++ OOP interview material into an interactive workbench featuring a 32-topic syllabus roadmap, 201 interview Q&As, 51 C++17 coding challenges, 52 tricky output puzzles, 22 side-by-side comparison tables, 20 real-world LLD system designs, SOLID & Modern C++17 deep dives, 10 timed mock interviews, and automated spaced repetition.

---

## Table of Contents

- [Features & Capabilities](#features--capabilities)
- [Screenshots](#screenshots)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Environment Variable Setup](#environment-variable-setup)
- [Local Installation & Database Setup](#local-installation--database-setup)
- [Running Frontend and Backend](#running-frontend-and-backend)
- [Using the C++17 Coding Sandbox & Security Notice](#using-the-c17-coding-sandbox--security-notice)
- [Project Structure](#project-structure)
- [Contribution Guidelines](#contribution-guidelines)
- [License](#license)

---

## Features & Capabilities

- **Dashboard & Progress Analytics**: Real SQLite-backed completion metrics, 7-day study activity bar chart, chapter mastery breakdown, daily study goal tracker, streak counter, weakest topic detection, and pending spaced-repetition alerts.
- **32-Topic Learning Roadmap**: Progressive 3-chapter syllabus with mental models, real-world analogies, C++17 code examples, interview traps, common candidate mistakes, personal revision notes, and cross-linked theory/coding/output/comparison exercises.
- **201 Interview Theory Questions**: `105` core interview questions + `96` topic-wise Q&As with hidden-until-revealed answers, hints, interviewer follow-ups, and 5 practice modes (`Sequential`, `Random`, `Topic-wise`, `Weak Topics`, `Revision Mode`).
- **51 C++17 Coding Problems (Monaco Editor)**: LeetCode-style split workspace with hints, starter templates, Run C++17 (with custom `stdin`), Submit & Verify against expected stdout, diff inspection, submission history, and toggleable reference solutions.
- **52 Output Prediction Puzzles**: Tricky vtable dispatch, object slicing, diamond inheritance, copy elision, Undefined Behavior (UB), and compile-error puzzles with line-by-line execution dry runs.
- **22 Side-by-Side Comparison Tables**: Structured difference tables with C++17 code examples and a Quick Recall flashcard toggle.
- **20 Real-World OOP System Designs (LLD)**: Class responsibilities, entity relationships, ASCII UML diagrams, interactive walkthrough checklists, C++17 interfaces, and scaling follow-ups.
- **SOLID & Modern C++17 Deep Dive**: Side-by-side Bad vs. Refactored C++17 architecture for S, O, L, I, D plus dedicated guides for **Rule of 3/5/0 & RAII**, **Copy Assignment Operator (Copy-and-Swap)**, and **C++17 `inline static`**.
- **10 Timed Mock Interviews (100 Questions)**: Countdown timer, question palette, Mark-for-Review flags, answer keys strictly locked until round submission, automated output grading, and 0–10 rubric sliders.
- **Spaced Repetition & 30-Day Study Plan**: Automatic `1d -> 3d -> 7d -> 14d` revision cycle tracking across missed or flagged items, interactive daily task checklists, Dark/Light theme switching, Global Search (`Ctrl+K`), and full JSON export/restore backups.

---

## Screenshots

> Add UI screenshots in `docs/screenshots/` before publishing and update the links below.

| Module | Preview |
| --- | --- |
| Dashboard & Study Analytics | `![Dashboard Placeholder](./docs/screenshots/dashboard.png)` |
| 32-Topic Learning Roadmap | `![Roadmap Placeholder](./docs/screenshots/roadmap.png)` |
| C++17 Coding Arena (Monaco + Console) | `![Coding Arena Placeholder](./docs/screenshots/coding-arena.png)` |
| Output Prediction & Mock Interviews | `![Mock Arena Placeholder](./docs/screenshots/mock-interviews.png)` |

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS v4, React Router v7, Monaco Editor (`@monaco-editor/react`), Recharts, Lucide Icons
- **Backend**: Node.js, Express 4, TypeScript, Zod, `cors`
- **Database**: SQLite + Prisma ORM (`@prisma/client` / `prisma` v6)
- **C++ Toolchain (Local Study Mode)**: System `g++` or `clang++` supporting `-std=c++17`

---

## Prerequisites

- **Node.js** `>= 20.0.0` and **npm** `>= 10.0.0`
- **Git** (for cloning)
- **C++17 Compiler** (`g++` or `clang++` on your `PATH`) — *Optional: if unavailable or disabled, OOPForge automatically runs in Editor-Only mode without crashing.*

---

## Environment Variable Setup

Environment templates are provided at `.env.example` and `backend/.env.example`.

Copy the templates before running locally (or run `npm run setup`, which copies them automatically if missing):

```bash
# Linux / macOS
cp .env.example .env
cp backend/.env.example backend/.env

# Windows PowerShell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
```

Available variables in `backend/.env`:

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4000` | Express API port |
| `NODE_ENV` | `development` | Set to `production` when deployed publicly |
| `DATABASE_URL` | `file:./oopforge.db` | SQLite file path resolved relative to `database/schema.prisma` |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173,http://localhost:4000,http://127.0.0.1:4000` | Comma-separated CORS origin allowlist |
| `ENABLE_LOCAL_CPP_SANDBOX` | `true` in dev / `false` in `production` | Enables host C++17 compilation & execution (**must stay `false` on public deployments**) |
| `CPP_COMPILER` | `""` | Optional explicit path to `g++` or `clang++` |

---

## Local Installation & Database Setup

`database/oopforge.db` is **excluded from version control** (`.gitignore`) so personal progress and notes are never committed. Each developer initializes a fresh local database from the Prisma schema and migrations.

### Option A: Automated One-Command Setup

```bash
git clone <your-repo-url> OOPForge
cd OOPForge
npm run setup
```

`npm run setup` copies `.env.example` files if missing, installs `backend` and `frontend` dependencies, generates the Prisma Client, and applies SQLite migrations (`database/oopforge.db`).

### Option B: Manual Step-by-Step Setup

```bash
git clone <your-repo-url> OOPForge
cd OOPForge

# 1. Create environment files
cp .env.example .env
cp backend/.env.example backend/.env

# 2. Install backend & frontend dependencies
npm run install:all

# 3. Generate Prisma client and run migrations to create database/oopforge.db
npm run db:generate
npm run db:migrate
```

---

## Running Frontend and Backend

### Development Mode (Both Servers Together)

```bash
npm run dev
```

- **Frontend (Vite)**: `http://localhost:5173` (proxies `/api` to `http://localhost:4000`)
- **Backend (Express + tsx)**: `http://localhost:4000`

### Run Separately

```bash
# Terminal 1 — Backend API
npm run dev:backend

# Terminal 2 — Frontend UI
npm run dev:frontend
```

### Production Build & Start (Local Single-Port Mode)

```bash
npm run build
npm run start
```

When `frontend/dist` is built, the Express server serves both `/api/*` and the production SPA at `http://localhost:4000`.

---

## Using the C++17 Coding Sandbox & Security Notice

1. Open **Coding Arena** (`/coding`) and select any of the 51 OOP coding problems.
2. Edit C++17 code in the Monaco Editor and optionally provide custom `stdin`.
3. Click **Run C++17** to compile (`-std=c++17 -O2 -Wall -Wextra`) and preview stdout, or **Submit & Verify** to compare normalized stdout against the verified expected output and save submission history to SQLite.

### ⚠️ CRITICAL SECURITY WARNING FOR PUBLIC DEPLOYMENT

- **Local Development Only**: The built-in runner compiles and spawns user-submitted C++ binaries directly on the host OS inside a temporary directory with timeouts (`10s` compile / `3s` run), output caps (`128 KB`), basic static regex checks, compiler template depth caps, concurrency throttling, and stripped environment secrets.
- **Regex checks do NOT make arbitrary C++ execution safe.** Determined attackers can bypass source regexes via preprocessor macro/token-pasting indirection, `#include` path leaks, inline assembly, `syscall()`, `std::thread`, socket APIs, `<fstream>`, or memory exhaustion.
- **Public Deployment Rule**: When `NODE_ENV=production`, host C++ execution is **disabled by default** (`HTTP 403` on `/api/code/:id/run` and `/api/code/:id/submit`) unless `ENABLE_LOCAL_CPP_SANDBOX="true"` is explicitly forced.
- **Do NOT expose code execution publicly** until you replace `backend/src/sandbox/cppRunner.ts` with real OS-level isolation such as:
  - Rootless **Docker / Podman** containers (`--network=none --read-only --pids-limit=32 --memory=128m --cpus=0.5 --cap-drop=ALL`)
  - **nsjail** / **isolate** (`cgroups` v2 + `seccomp-bpf` + PID/mount/network namespaces)
  - Dedicated **Firecracker / gVisor** microVMs running out-of-band worker queues

---

## Project Structure

```text
OOPForge/
├── backend/
│   ├── .env.example          # Backend environment variable template
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── lib/
│       │   ├── contentLoader.ts   # Loads JSON curriculum database
│       │   ├── env.ts             # Zero-dependency .env loader
│       │   └── prisma.ts          # Prisma client & activity logging helpers
│       ├── routes/
│       │   ├── content.ts         # Curriculum, search, and health routes
│       │   └── progress.ts        # Progress, spaced repetition, mocks, backup, execution
│       ├── sandbox/
│       │   └── cppRunner.ts       # Local C++17 compiler runner & safety controls
│       └── server.ts              # Express server, CORS allowlist, security headers
├── content/                  # Verified C++ OOP study datasets (JSON)
├── database/
│   ├── migrations/           # Prisma SQLite migrations
│   └── schema.prisma         # Database schema (uses env("DATABASE_URL"))
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/       # AppShell, Badge, MarkdownCode
│   │   ├── lib/              # Typed API client & domain types
│   │   └── pages/            # Dashboard, Roadmap, Arenas, Mocks, Revisions, Settings
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── public/                   # Root static assets
├── scripts/
│   ├── dev.mjs               # Runs backend + frontend dev processes
│   └── setup.mjs             # First-time local setup script
├── .env.example              # Root environment template
├── .gitignore
└── package.json              # Workspace orchestration scripts
```

---

## Contribution Guidelines

Contributions that improve accessibility, C++17 explanations, UI ergonomics, or container-based sandbox adapters are welcome:

1. **Fork** the repository and create a feature branch: `git checkout -b feat/your-feature`.
2. Never commit `.env`, `database/*.db`, `node_modules/`, build outputs (`dist/`), or personal study backups.
3. Keep TypeScript strict checks and production builds passing before opening a PR:
   ```bash
   npm run build
   ```
4. Preserve accuracy of all C++17 explanations, Undefined Behavior labels, and expected outputs in `content/`.
5. Open a Pull Request describing the problem solved, files changed, and how you verified it.

---

## License

`[LICENSE PLACEHOLDER — e.g., MIT License. Choose and add a LICENSE file in the repository root before public release.]`
