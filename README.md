# Budget Tracker

A full-stack personal finance web application built with Next.js 16, Prisma 7, and NextAuth v5. Track income and expenses, manage budgets, set recurring transactions, and visualize spending analytics — all within a multi-workspace architecture.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running with Docker](#running-with-docker)
  - [Running the App](#running-the-app)
- [Database](#database)
- [API Reference](#api-reference)
- [Pages Overview](#pages-overview)
- [Authentication](#authentication)
- [Roadmap](#roadmap)

---

## Features

- **Authentication** — Email/password sign-in with JWT sessions (NextAuth v5); Google OAuth ready
- **Multi-workspace** — Each user can belong to multiple workspaces with role-based access (Owner / Member / Viewer)
- **Transactions** — Create, edit, delete income/expense/transfer entries with tags, notes, and receipt uploads
- **Categories** — Custom categories with color picker, icon, and type (income/expense); supports subcategories
- **Budget Management** — Monthly budget limits per category with visual progress bars and configurable alert thresholds
- **Recurring Transactions** — Automated rules for daily/weekly/biweekly/monthly/quarterly/yearly entries
- **Analytics** — Interactive charts: spending breakdown (pie), monthly trend (area), category comparison (bar)
- **Settings** — Profile edit, currency & timezone preferences, workspace details
- **Dark Mode** — Full light/dark theme support via `next-themes`
- **Reverse-proxy ready** — Works behind ngrok, Cloudflare Tunnel, or any `X-Forwarded-Host` proxy

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Auth | NextAuth v5 (JWT, Credentials, Google OAuth) |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 + BullMQ |
| File Storage | MinIO (S3-compatible) |
| Email | Nodemailer + Mailhog (dev) |
| UI | Base UI (`@base-ui/react`) + Tailwind CSS v4 |
| Charts | Recharts |
| Forms | React Hook Form + Zod v4 |
| Data Fetching | SWR |
| State | Zustand |
| Table | TanStack Table |
| PDF | Puppeteer |
| CSV | PapaParse |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App Router                   │
│                                                         │
│  src/proxy.ts (middleware)                              │
│  ├── Auth guard (JWT check)                             │
│  ├── Redirect unauthenticated → /login                  │
│  └── Respects X-Forwarded-Host (ngrok / reverse proxy)  │
│                                                         │
│  src/app/(auth)/          src/app/(dashboard)/          │
│  ├── login/               ├── dashboard/                │
│  └── register/            ├── transactions/             │
│                           ├── categories/               │
│  src/app/api/             ├── budget/                   │
│  ├── auth/                ├── analytics/                │
│  ├── transactions/        ├── recurring/                │
│  ├── categories/          └── settings/                 │
│  ├── budgets/                                           │
│  ├── recurring/                                         │
│  ├── analytics/                                         │
│  └── users/                                             │
└─────────────────────────────────────────────────────────┘
         │                          │
┌────────▼──────────┐    ┌──────────▼────────┐
│  PostgreSQL 16     │    │   Redis 7          │
│  (Prisma 7 ORM)   │    │   (BullMQ queues)  │
└───────────────────┘    └───────────────────┘
         │
┌────────▼──────────┐    ┌───────────────────┐
│  MinIO (S3)        │    │  Mailhog (SMTP)   │
│  receipt storage   │    │  email delivery   │
└───────────────────┘    └───────────────────┘
```

### Auth split (edge-safe)

NextAuth v5 requires splitting the config for Next.js edge runtime (middleware):

| File | Runtime | Purpose |
|---|---|---|
| `src/lib/auth.config.ts` | Edge | Lightweight config — JWT callbacks, pages, `trustHost` |
| `src/lib/auth.ts` | Node.js | Full config — Prisma adapter, bcrypt `authorize` |
| `src/proxy.ts` | Edge | Middleware using `auth.config.ts` only |

---

## Project Structure

```
budget-tracker/
├── docker-compose.yml          # PostgreSQL, Redis, MinIO, Mailhog
├── prisma/
│   ├── schema.prisma           # Data models
│   ├── seed.ts                 # Demo data seeder
│   └── migrations/             # Migration history
├── prisma.config.ts            # Prisma 7 datasource config
├── next.config.ts              # Allowed origins for proxies
├── src/
│   ├── proxy.ts                # Next.js 16 middleware (auth guard)
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx      # Sidebar + Navbar shell
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── transactions/
│   │   │   │   ├── page.tsx    # Transaction list + filters
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/edit/page.tsx
│   │   │   ├── categories/page.tsx
│   │   │   ├── budget/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   ├── recurring/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── auth/register/route.ts
│   │       ├── transactions/route.ts
│   │       ├── transactions/[id]/route.ts
│   │       ├── categories/route.ts
│   │       ├── categories/[id]/route.ts
│   │       ├── budgets/route.ts
│   │       ├── budgets/[id]/route.ts
│   │       ├── recurring/route.ts
│   │       ├── recurring/[id]/route.ts
│   │       ├── analytics/summary/route.ts
│   │       ├── analytics/by-category/route.ts
│   │       ├── analytics/trend/route.ts
│   │       ├── users/me/route.ts
│   │       └── health/route.ts
│   ├── components/
│   │   ├── ui/                 # Base UI wrappers (button, card, dialog, …)
│   │   ├── dashboard/          # Chart components
│   │   └── shared/             # Sidebar, Navbar, ThemeProvider
│   ├── lib/
│   │   ├── auth.config.ts      # Edge-safe NextAuth config
│   │   ├── auth.ts             # Full NextAuth config (Node.js)
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── redis.ts            # Redis / BullMQ client
│   │   ├── currency.ts         # Currency formatting helpers
│   │   ├── workspace.ts        # Workspace resolver helper
│   │   ├── seed-data.ts        # Default category definitions
│   │   └── validations/        # Zod schemas (transaction, category, budget)
│   └── types/
│       └── index.ts            # Shared TypeScript types
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- `npm` or `pnpm`

### Environment Variables

Copy and edit the `.env` file for local development:

```bash
cp .env .env.local
```

| Variable | Default | Description |
|---|---|---|
| `NEXTAUTH_SECRET` | — | Random 32-char secret (required) |
| `AUTH_TRUST_HOST` | `true` | Trust `X-Forwarded-Host` from proxies |
| `DATABASE_URL` | `postgresql://budget_user:budget_pass@localhost:5435/budget_db` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6381` | Redis connection |
| `S3_ENDPOINT` | `http://localhost:9004` | MinIO / S3 endpoint |
| `S3_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `S3_SECRET_KEY` | `minioadmin` | MinIO secret key |
| `S3_BUCKET` | `budget-files` | S3 bucket name |
| `SMTP_HOST` | `localhost` | SMTP host |
| `SMTP_PORT` | `1025` | SMTP port (Mailhog) |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID (optional) |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth client secret (optional) |

### Running with Docker

Start all infrastructure services (PostgreSQL, Redis, MinIO, Mailhog):

```bash
docker compose up -d
```

| Service | URL |
|---|---|
| PostgreSQL | `localhost:5435` |
| Redis | `localhost:6381` |
| MinIO API | `http://localhost:9004` |
| MinIO Console | `http://localhost:9005` |
| Mailhog UI | `http://localhost:8025` |

### Running the App

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed demo data
npx tsx prisma/seed.ts

# Start development server
npm run dev
```

The app will be available at **http://localhost:3000**.

**Demo credentials:**
```
Email:    demo@example.com
Password: password123
```

---

## Database

### Schema Overview

```
User ─────────┬── WorkspaceMember ──── Workspace
              │                           │
              └── Transaction             ├── Category ──── Budget
                      │                  ├── Transaction
                      └── RecurringRule  ├── RecurringRule
                              │          └── Report
                              └── Category
```

### Key Models

| Model | Description |
|---|---|
| `User` | Auth user with currency & timezone preferences |
| `Workspace` | Isolated financial environment (shared across members) |
| `WorkspaceMember` | Join table with role: `OWNER`, `MEMBER`, `VIEWER` |
| `Category` | Income/expense category with color, icon, optional parent |
| `Transaction` | Financial entry with amount, type, tags, receipt URL |
| `Budget` | Monthly spending limit per category with alert threshold |
| `RecurringRule` | Automated transaction rule with frequency schedule |
| `Report` | PDF/CSV export job record |

### Migrations

```bash
# Create a new migration
npx prisma migrate dev --name your-migration-name

# Apply migrations in production
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

---

## API Reference

All endpoints require authentication (JWT cookie) except `/api/auth/*` and `/api/health`.

### Transactions

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/transactions` | List transactions (filter by type, category, date, search) |
| `POST` | `/api/transactions` | Create transaction |
| `GET` | `/api/transactions/:id` | Get single transaction |
| `PUT` | `/api/transactions/:id` | Update transaction |
| `DELETE` | `/api/transactions/:id` | Delete transaction |

### Categories

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/categories` | List workspace categories |
| `POST` | `/api/categories` | Create category |
| `PUT` | `/api/categories/:id` | Update category |
| `DELETE` | `/api/categories/:id` | Delete category |

### Budgets

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/budgets?month=2026-03` | List budgets with spending totals |
| `POST` | `/api/budgets` | Create budget limit |
| `PUT` | `/api/budgets/:id` | Update budget |
| `DELETE` | `/api/budgets/:id` | Delete budget |

### Recurring Rules

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/recurring` | List recurring rules |
| `POST` | `/api/recurring` | Create recurring rule |
| `PUT` | `/api/recurring/:id` | Toggle active / update rule |
| `DELETE` | `/api/recurring/:id` | Deactivate rule |

### Analytics

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/summary?month=2026-03` | Total income, expense, balance |
| `GET` | `/api/analytics/by-category?month=2026-03` | Spending breakdown per category |
| `GET` | `/api/analytics/trend?months=6` | Monthly income vs expense trend |

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user |
| `GET/POST` | `/api/auth/[...nextauth]` | NextAuth handlers |

---

## Pages Overview

| Route | Description |
|---|---|
| `/login` | Sign in with email/password |
| `/register` | Create new account |
| `/dashboard` | Overview: balance, recent transactions, mini charts |
| `/transactions` | Paginated transaction list with filters and search |
| `/transactions/new` | Create transaction form |
| `/transactions/:id/edit` | Edit existing transaction |
| `/categories` | Manage income/expense categories with color picker |
| `/budget` | Monthly budget limits with progress bars |
| `/analytics` | Charts: pie breakdown, area trend, bar comparison |
| `/recurring` | Recurring transaction rules with play/pause toggle |
| `/settings` | Profile, currency, timezone, workspace info |

---

## Authentication

This project uses **NextAuth v5** with a credentials provider and JWT sessions.

The config is split into two files for compatibility with the Next.js edge runtime:

- **`src/lib/auth.config.ts`** — edge-safe; used in `src/proxy.ts` (middleware)
- **`src/lib/auth.ts`** — Node.js only; includes Prisma adapter and bcrypt

### Reverse Proxy Support

To work correctly behind ngrok, Cloudflare Tunnel, or any reverse proxy that injects `X-Forwarded-Host`:

1. `trustHost: true` is set in `src/lib/auth.config.ts`
2. `AUTH_TRUST_HOST=true` is set in `.env`
3. `src/proxy.ts` uses `req.nextUrl.origin` (which respects forwarded headers) for redirect URLs
4. `next.config.ts` lists allowed origins in `serverActions.allowedOrigins`

To expose the app publicly via ngrok:

```bash
ngrok http 3000
```

---

## Roadmap

- [x] Sprint 1 — Auth, workspace setup, Prisma schema, Docker Compose
- [x] Sprint 2 — Transactions CRUD, categories management, dashboard
- [x] Sprint 3 — Budget management, analytics charts, recurring transactions
- [x] Sprint 4 — Settings, profile, recurring rule API
- [ ] Sprint 5 — Budget alerts via email (BullMQ + Nodemailer), PDF/CSV reports
- [ ] Sprint 6 — CSV import wizard, multi-workspace invites, members management
- [ ] Sprint 7 — PWA support, mobile-responsive polish, E2E tests, deployment

---

## License

MIT
