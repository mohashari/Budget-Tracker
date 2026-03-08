# Budget Tracker — Implementation Plan

**Version:** 1.0
**Date:** 2026-03-08
**Based on:** ARCHITECTURE.md v1.0

---

## Project Overview

| Item | Detail |
|---|---|
| Project | Budget Tracker with Expense Analysis |
| Stack | Next.js 14 + TypeScript + PostgreSQL + Redis |
| Total Sprints | 6 sprints (12 weeks) |
| Team | 1–2 developers |
| Repository | `/home/muklis/Documents/webapp/budget-tracker` |

---

## Milestones

```
Sprint 1 (Week 1–2)  → Project scaffold + Auth + DB schema
Sprint 2 (Week 3–4)  → Transaction CRUD + Categories
Sprint 3 (Week 5–6)  → Dashboard + Analytics charts
Sprint 4 (Week 7–8)  → Budget limits + Recurring transactions
Sprint 5 (Week 9–10) → Reports (PDF/CSV) + CSV Import
Sprint 6 (Week 11–12)→ Polish, PWA, testing, deployment
```

---

## Sprint 1 — Foundation & Authentication (Week 1–2)

**Goal:** Running app with auth, database, and base UI shell

### Tasks

#### Infrastructure Setup
- [ ] Initialize Next.js 14 project with TypeScript, Tailwind CSS, shadcn/ui
- [ ] Configure Docker Compose: postgres (5435), redis (6381), minio (9004/9005), mailhog (8025)
- [ ] Setup `.env.example` with all required variables
- [ ] Configure Prisma with PostgreSQL connection
- [ ] Write full Prisma schema (User, Workspace, WorkspaceMember, Category, Transaction, Budget, RecurringRule, Report)
- [ ] Run initial migration (`prisma migrate dev --name init`)
- [ ] Seed default categories (Food, Transport, Housing, Health, Entertainment, Shopping, Education, Income, Other)
- [ ] Configure GitHub Actions CI (lint, type-check, build)

#### Authentication
- [ ] Install and configure NextAuth.js v5 (credentials provider)
- [ ] Implement login page (`/login`) with React Hook Form + Zod validation
- [ ] Implement register page (`/register`)
- [ ] Create auth middleware for protected routes (`middleware.ts`)
- [ ] Auto-create personal Workspace on user registration
- [ ] Add JWT session handling with 7-day expiry
- [ ] Implement logout functionality

#### Base UI Shell
- [ ] Create dashboard layout with responsive sidebar (collapsible on mobile)
- [ ] Implement top navbar (user avatar, workspace switcher, logout)
- [ ] Setup route groups: `(auth)` and `(dashboard)`
- [ ] Add theme provider (light/dark mode with next-themes)
- [ ] Create loading skeletons for all data-heavy pages
- [ ] Implement toast notifications (sonner)
- [ ] Configure Zustand store (auth state, workspace state)

#### Utilities
- [ ] Currency formatting helper (IDR, USD, EUR with locale)
- [ ] Date helpers (date-fns: formatDate, getMonthRange, getDayRange)
- [ ] Zod validation schemas for all domain entities
- [ ] API response helper (consistent `{ data, error }` shape)
- [ ] Error boundary component

**Deliverable:** Auth-protected shell accessible at `http://localhost:3000`

---

## Sprint 2 — Transactions & Categories (Week 3–4)

**Goal:** Full CRUD for transactions and categories — core data entry

### Tasks

#### Categories
- [ ] Categories API (`GET /api/categories`, `POST`, `PUT/:id`, `DELETE/:id`)
- [ ] Categories management page (`/categories`)
  - [ ] List with icon, color, type badge
  - [ ] Create/edit modal (icon picker from Lucide set, color picker, type select)
  - [ ] Delete with validation (block if transactions exist)
- [ ] Subcategories support (parent/child relationship)
- [ ] Seed 20 default categories with icons and colors

#### Transactions — API
- [ ] `GET /api/transactions` with filters: date range, category, type, search, tags
- [ ] `POST /api/transactions` — create with validation
- [ ] `GET /api/transactions/:id` — get single
- [ ] `PUT /api/transactions/:id` — update
- [ ] `DELETE /api/transactions/:id` — delete (soft delete)
- [ ] Pagination (cursor-based for performance)
- [ ] Cache invalidation on mutation (Redis analytics keys)

#### Transactions — UI
- [ ] Transaction list page (`/transactions`)
  - [ ] TanStack Table: sortable, filterable columns
  - [ ] Filter bar: date range picker, category multi-select, type toggle, search
  - [ ] Amount colored by type (green=income, red=expense)
  - [ ] Quick delete with confirmation
  - [ ] Mobile card view (responsive)
- [ ] Add transaction form (`/transactions/new`)
  - [ ] Type selector (Income / Expense)
  - [ ] Amount input with currency symbol
  - [ ] Category select (grouped by type)
  - [ ] Date picker (default today)
  - [ ] Description + notes
  - [ ] Tags input (free-form)
  - [ ] Receipt image upload (store to MinIO)
- [ ] Edit transaction page (`/transactions/:id`)
- [ ] Transaction detail modal (click row to open)
- [ ] Keyboard shortcut: `N` to open new transaction form

#### Tags
- [ ] Tag input component (autocomplete from existing tags)
- [ ] Tags filter in transaction list
- [ ] Tags analytics endpoint (spending per tag)

**Deliverable:** Full transaction and category management working end-to-end

---

## Sprint 3 — Dashboard & Analytics (Week 5–6)

**Goal:** Main dashboard with charts and analytics pages

### Tasks

#### Analytics API
- [ ] `GET /api/analytics/summary` — total income, expense, balance, savings rate for period
- [ ] `GET /api/analytics/by-category` — spending per category (pie chart data)
- [ ] `GET /api/analytics/trend` — daily/weekly/monthly trend (line chart data)
- [ ] `GET /api/analytics/comparison` — current vs previous period comparison
- [ ] `GET /api/analytics/budget-vs-actual` — budget utilization per category
- [ ] `GET /api/analytics/top-transactions` — top 10 by amount for period
- [ ] Redis caching layer for all analytics endpoints (TTL: 5 min)
- [ ] Cache invalidation middleware (invalidate on transaction mutations)

#### Chart Components (Recharts)
- [ ] `ExpensePieChart` — category breakdown donut chart with legend
- [ ] `SpendingTrendLine` — income vs expense over time (area chart)
- [ ] `MonthlyComparisonBar` — current vs previous month bar chart
- [ ] `BudgetProgressBar` — horizontal progress bar with threshold indicator
- [ ] `CategoryBarChart` — top categories horizontal bar chart
- [ ] `DailySpendingBar` — daily expense bar for current month
- [ ] All charts: loading skeleton, empty state, responsive

#### Dashboard Page (`/dashboard`)
- [ ] Summary cards row:
  - Total Income (current month)
  - Total Expense (current month)
  - Net Balance
  - Savings Rate %
- [ ] Date range selector (This Month / Last Month / Last 3M / Last 6M / This Year / Custom)
- [ ] Spending by category donut chart
- [ ] Income vs Expense trend line (last 6 months)
- [ ] Budget status overview (top 5 budgets with progress bars)
- [ ] Recent transactions list (last 10)
- [ ] Quick add transaction button (floating action)
- [ ] Dashboard SSR with Suspense boundaries

#### Analytics Page (`/analytics`)
- [ ] Tabbed view: Overview | By Category | Trend | Comparison
- [ ] Overview tab: all summary charts
- [ ] By Category tab:
  - [ ] Period selector
  - [ ] Category breakdown table (sortable, with % of total)
  - [ ] Drilldown: click category → show transactions in that category
- [ ] Trend tab:
  - [ ] Monthly income/expense trend (12 months)
  - [ ] Daily spending heatmap (calendar view)
  - [ ] Average daily spending
- [ ] Comparison tab:
  - [ ] Month-over-month comparison bar chart
  - [ ] Year-over-year comparison

**Deliverable:** Fully interactive dashboard and analytics pages

---

## Sprint 4 — Budget & Recurring Transactions (Week 7–8)

**Goal:** Budget management with alerts, recurring transaction automation

### Tasks

#### Budget Management — API
- [ ] `GET /api/budgets` — list budgets for workspace + month
- [ ] `POST /api/budgets` — create budget for category+month
- [ ] `PUT /api/budgets/:id` — update limit or alert threshold
- [ ] `DELETE /api/budgets/:id` — remove budget
- [ ] Budget utilization computation (actual spent vs limit)
- [ ] Copy budgets from previous month endpoint

#### Budget Management — UI (`/budget`)
- [ ] Budget overview page with month selector
- [ ] Budget card for each category:
  - [ ] Progress bar (color coded: green <60%, yellow 60–85%, red >85%)
  - [ ] Amount spent vs limit
  - [ ] % remaining
  - [ ] "Add budget" button for categories without budget
- [ ] Create/edit budget modal
  - [ ] Category select
  - [ ] Limit amount input
  - [ ] Alert threshold slider (50–100%)
- [ ] "Copy from last month" bulk action
- [ ] Budget summary: total budgeted, total spent, surplus/deficit

#### Budget Alerts
- [ ] BullMQ notification queue setup
- [ ] Alert trigger: on transaction create, check if category budget > threshold
- [ ] Email notification template (Handlebars)
- [ ] Send via Nodemailer (Mailhog in dev, SMTP in prod)
- [ ] In-app notification indicator (bell icon in navbar)
- [ ] Notification preferences in settings (enable/disable email alerts)

#### Recurring Transactions — API
- [ ] `GET /api/recurring` — list recurring rules
- [ ] `POST /api/recurring` — create rule
- [ ] `PUT /api/recurring/:id` — update (change amount, frequency)
- [ ] `DELETE /api/recurring/:id` — deactivate (soft delete)
- [ ] `POST /api/recurring/:id/run-now` — manual trigger for testing

#### Recurring Transactions — Worker
- [ ] BullMQ `recurring` queue setup
- [ ] Cron job: daily at 00:01 process all `nextRunAt <= now()` recurring rules
- [ ] Create transaction from rule, update `nextRunAt` based on frequency
- [ ] Handle end dates: deactivate when `endDate < now()`
- [ ] Error handling + retry (3 attempts)

#### Recurring Transactions — UI
- [ ] Recurring rules list in settings or sidebar section
- [ ] Create recurring rule form:
  - [ ] All transaction fields +
  - [ ] Frequency selector (Daily/Weekly/Monthly/Yearly)
  - [ ] Start date / End date (optional)
  - [ ] Preview: "Next 5 occurrences"
- [ ] Enable/disable toggle per rule
- [ ] Show `isRecurring` badge on transactions created from rules

**Deliverable:** Budget tracking with alerts + automatic recurring transactions

---

## Sprint 5 — Reports & CSV Import (Week 9–10)

**Goal:** PDF/CSV report generation and CSV bank statement import

### Tasks

#### PDF Report Generation
- [ ] Install and configure Puppeteer in Docker container
- [ ] Handlebars report template (`templates/report.hbs`)
  - [ ] Cover page (workspace, period, generated date)
  - [ ] Executive summary section
  - [ ] Category breakdown table + embedded SVG pie chart
  - [ ] Monthly trend chart (SVG)
  - [ ] Budget vs Actual table (color-coded)
  - [ ] Top 10 transactions table
  - [ ] Full transaction list (paginated, 30/page)
- [ ] BullMQ `reports` queue setup
- [ ] `generate-pdf` worker: render HTML → Puppeteer → PDF → upload to MinIO
- [ ] `POST /api/reports/pdf` — enqueue report job, return `reportId`
- [ ] `GET /api/reports/:id/download` — get pre-signed S3 URL (24h)
- [ ] Status polling: `GET /api/reports/:id` returns status + url
- [ ] Report history page: list past reports with download links

#### CSV Export
- [ ] `POST /api/reports/csv` — generate CSV synchronously (< 10,000 rows)
- [ ] Use papaparse for CSV serialization
- [ ] Upload to MinIO, return pre-signed URL
- [ ] Column mapping: date, description, category, type, amount, currency, tags, notes

#### Reports UI (`/analytics/reports`)
- [ ] Report generator form:
  - [ ] Period selector (date range)
  - [ ] Type: PDF or CSV
  - [ ] Sections to include (checkboxes for PDF)
  - [ ] Filter by category/type
- [ ] Generate button → shows progress indicator
- [ ] Auto-download when ready
- [ ] Report history table with re-download buttons
- [ ] Cleanup worker: delete reports older than 30 days from MinIO

#### CSV Import
- [ ] Import wizard page (`/transactions/import`)
  - [ ] Step 1: Upload CSV file (drag & drop)
  - [ ] Step 2: Map columns (date, description, amount, type)
  - [ ] Step 3: Preview table with auto-categorization suggestions
  - [ ] Step 4: Review + confirm → bulk insert
- [ ] `POST /api/transactions/import` — validate + bulk create
- [ ] Column mapper component (drag to map CSV columns)
- [ ] Auto-categorization by keyword matching (configurable in settings)
- [ ] Duplicate detection (same date + amount + description = warn)
- [ ] Import result summary (inserted, skipped, errors)
- [ ] Preset parsers: Generic CSV, BCA, Mandiri, GoPay/OVO

**Deliverable:** Full reporting suite and CSV bank import

---

## Sprint 6 — Polish, PWA & Deployment (Week 11–12)

**Goal:** Production-ready with testing, performance optimization, and deployment

### Tasks

#### Multi-user / Workspace
- [ ] Invite member by email (`POST /api/users/invite`)
- [ ] Accept invitation flow (email link → join workspace)
- [ ] Workspace switcher in sidebar (user can have multiple workspaces)
- [ ] Role-based UI (hide edit/delete for VIEWER role)
- [ ] Settings → Members page (list members, change role, remove)

#### Settings Page
- [ ] Profile settings (name, avatar upload, email)
- [ ] Change password
- [ ] Currency preference (IDR, USD, EUR, SGD, MYR)
- [ ] Timezone preference
- [ ] Default category for new transactions
- [ ] Notification preferences (email alerts, weekly summary)
- [ ] Auto-categorization rules management (keyword → category mapping)
- [ ] Danger zone: delete workspace data, delete account

#### Performance & UX
- [ ] Implement SWR/React Query with optimistic updates on all mutations
- [ ] Virtual scrolling for transaction list > 500 rows (TanStack Virtual)
- [ ] Route prefetching (hover on sidebar links)
- [ ] Image optimization (receipt thumbnails via Next.js Image)
- [ ] Bundle analysis (`@next/bundle-analyzer`)
- [ ] Lighthouse audit — achieve ≥ 90 performance score

#### PWA
- [ ] Configure `next-pwa` with service worker
- [ ] App manifest (`manifest.json`)
- [ ] App icons (192×192, 512×512)
- [ ] Offline page for network errors
- [ ] Install prompt for mobile browsers

#### Testing
- [ ] Unit tests: currency formatters, date helpers, Zod schemas (Vitest)
- [ ] API route tests: transactions CRUD, analytics endpoints (Vitest + supertest)
- [ ] Component tests: TransactionForm, BudgetCard (React Testing Library)
- [ ] E2E tests: login → add transaction → view dashboard (Playwright)
- [ ] Test coverage target: ≥ 70%

#### Security Hardening
- [ ] Rate limiting on all API routes (`@upstash/ratelimit` or custom middleware)
- [ ] Helmet security headers (`next-safe-action` / CSP headers in next.config.ts)
- [ ] Input sanitization review (all Zod schemas)
- [ ] Workspace isolation audit (ensure all queries filter by workspaceId)
- [ ] File upload validation (MIME type magic bytes check)

#### Deployment
- [ ] Production Dockerfile (multi-stage build)
- [ ] Docker Compose production override
- [ ] GitHub Actions: build + push Docker image → deploy to VPS
- [ ] Environment variable checklist for production
- [ ] Database backup script (pg_dump cron)
- [ ] Health check endpoints (`/api/health`)
- [ ] Monitoring: Sentry error tracking integration
- [ ] README.md with setup instructions

**Deliverable:** Production-deployed application with CI/CD pipeline

---

## Environment Variables

```env
# App
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=change_me_32_chars_minimum

# Database
DATABASE_URL=postgresql://budget_user:budget_pass@localhost:5435/budget_db

# Redis
REDIS_URL=redis://localhost:6381

# MinIO / S3
S3_ENDPOINT=http://localhost:9004
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=budget-files
S3_REGION=us-east-1

# Email (Mailhog dev / SMTP prod)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@budget-tracker.local

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Postgres (Docker Compose)
POSTGRES_DB=budget_db
POSTGRES_USER=budget_user
POSTGRES_PASSWORD=budget_pass
```

---

## Default Categories (Seed Data)

| Category | Icon | Color | Type |
|---|---|---|---|
| 🍽️ Makan & Minum | utensils | #ef4444 | EXPENSE |
| 🚗 Transportasi | car | #f97316 | EXPENSE |
| 🏠 Tempat Tinggal | home | #84cc16 | EXPENSE |
| 💡 Tagihan & Utilitas | zap | #eab308 | EXPENSE |
| 🛒 Belanja | shopping-cart | #06b6d4 | EXPENSE |
| 🎮 Hiburan | gamepad | #8b5cf6 | EXPENSE |
| 💊 Kesehatan | heart-pulse | #ec4899 | EXPENSE |
| 📚 Pendidikan | book-open | #3b82f6 | EXPENSE |
| 👗 Pakaian | shirt | #f59e0b | EXPENSE |
| ✈️ Perjalanan | plane | #10b981 | EXPENSE |
| 💼 Bisnis | briefcase | #6366f1 | EXPENSE |
| 🎁 Hadiah & Donasi | gift | #14b8a6 | EXPENSE |
| 💰 Gaji | wallet | #22c55e | INCOME |
| 📈 Investasi | trending-up | #16a34a | INCOME |
| 🏦 Bisnis Sampingan | building | #15803d | INCOME |
| 🎰 Bonus & THR | star | #4ade80 | INCOME |
| 🔄 Transfer | arrows-right-left | #94a3b8 | TRANSFER |
| ❓ Lainnya | circle | #6b7280 | EXPENSE |

---

## Definition of Done (DoD)

A task is complete when:
- [ ] Feature works as described
- [ ] TypeScript: no `tsc` errors
- [ ] Responsive: works on mobile (375px) and desktop (1440px)
- [ ] Loading state: skeleton shown during data fetch
- [ ] Empty state: informative message when no data
- [ ] Error state: user-friendly error with retry option
- [ ] Accessibility: keyboard navigable, ARIA labels on interactive elements
- [ ] No `console.error` in browser

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Puppeteer memory issues in container | Medium | High | Set `--max-old-space-size`, use BullMQ concurrency limit of 1 |
| PostgreSQL Decimal precision | Low | High | Always use `Decimal` type, never `Float` for amounts |
| Redis cache stale data | Medium | Medium | Short TTL (5 min), explicit invalidation on mutations |
| CSV import format variations | High | Medium | Flexible column mapper, handle BOM, various encodings |
| BullMQ recurring job drift | Low | Medium | Use absolute `nextRunAt` timestamp, not relative intervals |

---

*Plan is subject to revision as implementation reveals complexity. Update sprint scope before each sprint start.*
