# Budget Tracker — Architecture Document

**Version:** 1.0
**Date:** 2026-03-08
**Author:** Senior Software Architect
**Status:** Approved for Implementation

---

## 1. Executive Summary

A personal and multi-user budget tracking web application that enables users to record income and expenses, categorize transactions, set budget limits per category, and analyze spending patterns through interactive dashboards and reports. Designed for simplicity in deployment (single Next.js application) while maintaining scalability through clean separation of concerns.

---

## 2. Goals & Non-Goals

### Goals
- Record and categorize income/expense transactions
- Set and monitor budget limits per category with alert notifications
- Visualize spending patterns via interactive charts (daily, weekly, monthly, yearly)
- Generate downloadable reports (PDF, CSV)
- Support recurring transactions (subscription, salary, bills)
- Multi-user with role-based access (Owner, Viewer/Family member)
- Import transactions from bank CSV exports
- Tag transactions for cross-category analysis
- Mobile-responsive UI (PWA-ready)

### Non-Goals (Phase 1)
- Direct bank API/Open Banking integration
- Investment portfolio tracking
- Cryptocurrency support
- Mobile native app (React Native)
- AI/ML spending prediction (Phase 3)
- Receipt OCR scanning (Phase 3)

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│              Next.js 14 App Router — React 18                   │
│   Dashboard | Transactions | Budget | Reports | Settings        │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────┐
│                    Next.js Server Layer                         │
│   ├── Server Components (SSR — dashboard, reports)             │
│   ├── API Routes (/api/*) — REST endpoints                     │
│   ├── NextAuth.js — authentication & session                   │
│   └── Server Actions — form mutations                          │
└────┬──────────────────┬──────────────────┬──────────────────────┘
     │                  │                  │
┌────▼────┐     ┌───────▼──────┐   ┌──────▼──────┐
│ Prisma  │     │   Redis       │   │  BullMQ     │
│   ORM   │     │  (cache +     │   │  (scheduled │
│         │     │   sessions)   │   │   jobs)     │
└────┬────┘     └──────────────┘   └──────┬──────┘
     │                                    │
┌────▼────────────────────────────────────▼──────┐
│              PostgreSQL 16                      │
│  users | transactions | categories | budgets   │
│  tags | recurring_rules | reports              │
└────────────────────────────────────────────────┘
     │
┌────▼──────────┐
│  MinIO (S3)   │
│  - Receipts   │
│  - PDF export │
│  - CSV export │
└───────────────┘
```

**Architecture Decision: Monolithic Next.js**
Unlike a microservice approach, this application uses a single Next.js 14 application with App Router. Budget tracking does not require async heavy processing (no OCR, no AI inference) making a monolith the right choice — simpler deployment, lower operational overhead, and faster development.

---

## 4. System Components

### 4.1 Frontend — Next.js 14 App Router

| Concern | Technology |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| State | Zustand (client) + React Query / SWR (server) |
| Tables | TanStack Table v8 |
| Date handling | date-fns |
| Icons | Lucide React |
| CSV export | papaparse |
| PWA | next-pwa |

**Key Pages/Views:**

```
/                     → Redirect to dashboard
/login                → Authentication
/dashboard            → Summary cards + charts overview
/transactions         → Full transaction list (filter, search, paginate)
/transactions/new     → Add transaction form
/transactions/:id     → Transaction detail + edit
/transactions/import  → CSV import wizard
/budget               → Budget limits per category + progress bars
/analytics            → Advanced charts (trends, category breakdown, comparison)
/analytics/reports    → Generate PDF/CSV reports
/categories           → Manage categories and subcategories
/settings             → Profile, currency, notification preferences
/settings/members     → Invite/manage family/team members (Owner only)
```

**Component Architecture:**

```
src/
├── app/                          # Next.js App Router pages
│   ├── (auth)/login/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── budget/
│   │   ├── analytics/
│   │   └── settings/
│   └── api/                      # API Route Handlers
├── components/
│   ├── ui/                       # shadcn/ui base components
│   ├── charts/                   # Recharts wrappers
│   │   ├── ExpensePieChart.tsx
│   │   ├── SpendingTrendLine.tsx
│   │   ├── BudgetProgressBar.tsx
│   │   └── MonthlyComparisonBar.tsx
│   ├── transactions/
│   │   ├── TransactionTable.tsx
│   │   ├── TransactionForm.tsx
│   │   └── ImportWizard.tsx
│   ├── budget/
│   │   └── BudgetCard.tsx
│   └── shared/
│       ├── DateRangePicker.tsx
│       ├── CurrencyInput.tsx
│       └── CategorySelect.tsx
├── lib/
│   ├── db.ts                     # Prisma client singleton
│   ├── auth.ts                   # NextAuth config
│   ├── redis.ts                  # Redis client
│   ├── s3.ts                     # MinIO/S3 client
│   └── validations/              # Zod schemas
├── server/
│   ├── actions/                  # Next.js Server Actions
│   └── queries/                  # Data fetching functions (server-side)
└── hooks/                        # Custom React hooks
```

---

### 4.2 API Layer — Next.js API Routes

All API routes are under `/api/` and follow REST conventions. Protected by NextAuth session middleware.

```
POST   /api/auth/[...nextauth]     # NextAuth endpoints (login, logout, refresh)

GET    /api/transactions           # List (filter: date, category, type, search)
POST   /api/transactions           # Create transaction
GET    /api/transactions/:id       # Get single
PUT    /api/transactions/:id       # Update
DELETE /api/transactions/:id       # Delete
POST   /api/transactions/import    # Bulk import from CSV

GET    /api/categories             # List categories
POST   /api/categories             # Create category
PUT    /api/categories/:id         # Update
DELETE /api/categories/:id         # Delete (only if no transactions)

GET    /api/budgets                # List budget limits
POST   /api/budgets                # Set budget for category+month
PUT    /api/budgets/:id            # Update budget limit
DELETE /api/budgets/:id            # Remove budget

GET    /api/analytics/summary      # Total income/expense/balance for period
GET    /api/analytics/by-category  # Spending grouped by category
GET    /api/analytics/trend        # Daily/weekly/monthly trend data
GET    /api/analytics/comparison   # Month-over-month comparison
GET    /api/analytics/budget-vs-actual  # Budget vs actual per category

POST   /api/reports/pdf            # Generate PDF report (async → BullMQ)
POST   /api/reports/csv            # Generate CSV export
GET    /api/reports/:id/download   # Download generated report

GET    /api/recurring              # List recurring rules
POST   /api/recurring              # Create recurring rule
PUT    /api/recurring/:id          # Update
DELETE /api/recurring/:id          # Delete

GET    /api/users/me               # Current user profile
PUT    /api/users/me               # Update profile
POST   /api/users/invite           # Invite member (Owner only)
```

---

### 4.3 Authentication — NextAuth.js v5

- **Strategy:** JWT sessions (stateless, no DB session table)
- **Providers:** Credentials (email + password), Google OAuth (optional)
- **Password hashing:** bcrypt (12 rounds)
- **Session duration:** 7 days (sliding expiry)
- **RBAC roles:**
  - `OWNER` — full access, can invite members, manage categories/budgets
  - `MEMBER` — can add/edit own transactions, view shared dashboard
  - `VIEWER` — read-only access to dashboard and reports

---

### 4.4 Database — PostgreSQL 16 + Prisma ORM

**Schema Design:**

```sql
-- Users & Auth
User          id, email, name, password_hash, role, currency, timezone, created_at
Workspace     id, name, owner_id, plan, created_at
WorkspaceMember  workspace_id, user_id, role, joined_at

-- Core financial data
Category      id, workspace_id, name, icon, color, type(INCOME|EXPENSE), parent_id
Transaction   id, workspace_id, user_id, category_id, type, amount, currency,
              description, date, notes, tags[], receipt_url, is_recurring,
              recurring_rule_id, created_at, updated_at

-- Budget management
Budget        id, workspace_id, category_id, month (YYYY-MM), limit_amount,
              alert_threshold(%), currency, created_at

-- Recurring transactions
RecurringRule id, workspace_id, category_id, type, amount, description,
              frequency(DAILY|WEEKLY|MONTHLY|YEARLY), start_date, end_date,
              next_run_at, is_active

-- Tags (many-to-many via Transaction.tags JSON or Tag table)
Tag           id, workspace_id, name, color
TransactionTag transaction_id, tag_id

-- Reporting
Report        id, workspace_id, user_id, type(PDF|CSV), period_start, period_end,
              filters, status(PENDING|DONE|FAILED), file_url, created_at
```

**Indexing Strategy:**

```sql
-- Hot query paths
CREATE INDEX idx_transactions_workspace_date    ON transactions(workspace_id, date DESC);
CREATE INDEX idx_transactions_category          ON transactions(category_id);
CREATE INDEX idx_transactions_type_date         ON transactions(workspace_id, type, date);
CREATE INDEX idx_budgets_workspace_month        ON budgets(workspace_id, month);
CREATE INDEX idx_recurring_next_run             ON recurring_rules(next_run_at) WHERE is_active = true;
```

---

### 4.5 Caching — Redis

| Cache Key Pattern | TTL | Contents |
|---|---|---|
| `analytics:summary:{workspaceId}:{period}` | 5 min | Income/expense totals |
| `analytics:by-category:{workspaceId}:{month}` | 5 min | Category breakdown |
| `analytics:trend:{workspaceId}:{year}` | 10 min | Monthly trend array |
| `budget:status:{workspaceId}:{month}` | 2 min | Budget utilization |
| `session:{userId}` | 7 days | Session data (NextAuth) |

Cache invalidation: on any transaction create/update/delete, invalidate analytics keys for affected workspace and period.

---

### 4.6 Background Jobs — BullMQ

| Queue | Job | Trigger | Description |
|---|---|---|---|
| `reports` | `generate-pdf` | User request | Render PDF report via Puppeteer + Handlebars |
| `reports` | `generate-csv` | User request | Export transactions as CSV via papaparse |
| `recurring` | `process-recurring` | Cron (daily 00:01) | Create transactions from active RecurringRules |
| `notifications` | `budget-alert` | Transaction created | Check budget threshold, send email if exceeded |
| `cleanup` | `expire-reports` | Cron (weekly) | Delete S3 files for reports older than 30 days |

---

### 4.7 Analytics Engine

Analytics queries are pre-aggregated and cached in Redis. Raw SQL via Prisma's `$queryRaw` for complex aggregations:

**Summary (income, expense, balance, savings rate):**
```sql
SELECT
  type,
  SUM(amount) as total,
  COUNT(*) as count
FROM transactions
WHERE workspace_id = $1 AND date BETWEEN $2 AND $3
GROUP BY type;
```

**Category Breakdown (pie chart data):**
```sql
SELECT
  c.name, c.color, c.icon,
  SUM(t.amount) as total,
  ROUND(SUM(t.amount) * 100.0 / SUM(SUM(t.amount)) OVER (), 1) as percentage
FROM transactions t
JOIN categories c ON c.id = t.category_id
WHERE t.workspace_id = $1 AND t.type = 'EXPENSE'
  AND t.date BETWEEN $2 AND $3
GROUP BY c.id, c.name, c.color, c.icon
ORDER BY total DESC;
```

**Monthly Trend (line chart):**
```sql
SELECT
  DATE_TRUNC('month', date) as month,
  SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as income,
  SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as expense
FROM transactions
WHERE workspace_id = $1 AND date >= NOW() - INTERVAL '12 months'
GROUP BY 1
ORDER BY 1;
```

**Budget vs Actual:**
```sql
SELECT
  b.id, c.name, c.color, b.limit_amount,
  COALESCE(SUM(t.amount), 0) as spent,
  b.limit_amount - COALESCE(SUM(t.amount), 0) as remaining,
  ROUND(COALESCE(SUM(t.amount), 0) * 100.0 / b.limit_amount, 1) as utilization_pct
FROM budgets b
JOIN categories c ON c.id = b.category_id
LEFT JOIN transactions t ON t.category_id = b.category_id
  AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', b.month::date)
WHERE b.workspace_id = $1 AND b.month = $2
GROUP BY b.id, c.name, c.color, b.limit_amount;
```

---

### 4.8 PDF Report Generation

- Template engine: **Handlebars** (HTML → PDF)
- Renderer: **Puppeteer** (headless Chromium)
- Storage: **MinIO** (S3-compatible) with pre-signed URL (24h expiry)
- Triggered asynchronously via BullMQ, status polled by frontend

**Report sections:**
1. Cover page (workspace name, period, generated date)
2. Executive summary (total income, expense, net balance, savings rate)
3. Category breakdown (table + pie chart as embedded SVG)
4. Monthly trend chart
5. Budget vs Actual table (with % utilization, traffic light coloring)
6. Top transactions (top 10 by amount)
7. Full transaction list (paginated, 30 per page)

---

### 4.9 CSV Import

Supports bank export formats:
- Generic CSV (date, description, amount, type columns — configurable mapping)
- BCA CSV format
- Mandiri CSV format
- OVO/GoPay CSV format

**Import Pipeline:**
1. Upload CSV → validate structure → preview first 10 rows
2. Map CSV columns to transaction fields (UI wizard)
3. Auto-categorize by keyword matching (configurable rules)
4. User confirms/edits → bulk insert via `prisma.transaction.createMany()`
5. Invalidate analytics cache

---

## 5. Infrastructure & Deployment

### Local Development (Docker Compose)

```
┌──────────────────────────────────────────┐
│           Docker Compose (dev)           │
│  - app (Next.js dev server, port 3000)   │
│  - postgres (port 5435)                  │
│  - redis (port 6381)                     │
│  - minio (port 9004/9005)                │
│  - mailhog (port 8025 — email preview)   │
└──────────────────────────────────────────┘
```

### Production Options

**Option A — Single VPS (recommended for small teams):**
```
Docker Compose on VPS
  - app (Next.js, port 3000)
  - postgres
  - redis
  - minio
  - nginx (reverse proxy + SSL)
```

**Option B — PaaS:**
- App: **Vercel** (Next.js native)
- DB: **Neon** (serverless PostgreSQL) or **Supabase**
- Cache: **Upstash Redis** (serverless)
- Storage: **Cloudflare R2** or **AWS S3**
- Jobs: **Vercel Cron** + **Inngest** (background jobs)

**Option C — Kubernetes (for scaling):**
- Deployment: app (3 replicas + HPA)
- StatefulSet: postgres, redis
- Job: cron for recurring transactions
- Ingress: Nginx

---

## 6. Security

| Concern | Approach |
|---|---|
| Authentication | NextAuth.js — JWT sessions, bcrypt hashing |
| Authorization | Middleware checks workspace membership on every request |
| CSRF | Next.js built-in CSRF protection for Server Actions |
| Input validation | Zod schemas on all API inputs |
| SQL injection | Prisma parameterized queries; `$queryRaw` uses tagged template literals |
| File upload | Type check (magic bytes), 10MB limit, store in private S3 (no public access) |
| Secrets | `.env` (dev) / Kubernetes Secrets / Doppler (prod) |
| Rate limiting | `@upstash/ratelimit` or `express-rate-limit` middleware on API routes |
| HTTPS | TLS termination at Nginx / Vercel edge |
| Sensitive data | Amounts stored as `Decimal` (no float precision loss) |

---

## 7. Project Folder Structure

```
budget-tracker/
├── ARCHITECTURE.md
├── PLAN.md
├── docker-compose.yml
├── .env.example
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout (font, theme provider)
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx            # Dashboard shell (sidebar, navbar)
│   │   │   ├── dashboard/page.tsx    # Overview page (SSR)
│   │   │   ├── transactions/
│   │   │   │   ├── page.tsx          # Transaction list
│   │   │   │   ├── new/page.tsx
│   │   │   │   ├── import/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── budget/page.tsx
│   │   │   ├── analytics/
│   │   │   │   ├── page.tsx
│   │   │   │   └── reports/page.tsx
│   │   │   ├── categories/page.tsx
│   │   │   └── settings/
│   │   │       ├── page.tsx
│   │   │       └── members/page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── transactions/route.ts
│   │       ├── transactions/[id]/route.ts
│   │       ├── transactions/import/route.ts
│   │       ├── categories/route.ts
│   │       ├── budgets/route.ts
│   │       ├── analytics/
│   │       │   ├── summary/route.ts
│   │       │   ├── by-category/route.ts
│   │       │   ├── trend/route.ts
│   │       │   └── budget-vs-actual/route.ts
│   │       ├── reports/route.ts
│   │       ├── reports/[id]/download/route.ts
│   │       └── recurring/route.ts
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── charts/
│   │   │   ├── ExpensePieChart.tsx
│   │   │   ├── SpendingTrendLine.tsx
│   │   │   ├── BudgetProgressBar.tsx
│   │   │   ├── MonthlyComparisonBar.tsx
│   │   │   └── CategoryBarChart.tsx
│   │   ├── transactions/
│   │   │   ├── TransactionTable.tsx
│   │   │   ├── TransactionForm.tsx
│   │   │   ├── TransactionFilters.tsx
│   │   │   └── ImportWizard.tsx
│   │   ├── budget/
│   │   │   ├── BudgetCard.tsx
│   │   │   └── BudgetForm.tsx
│   │   ├── dashboard/
│   │   │   ├── SummaryCards.tsx
│   │   │   └── RecentTransactions.tsx
│   │   └── shared/
│   │       ├── Sidebar.tsx
│   │       ├── Navbar.tsx
│   │       ├── DateRangePicker.tsx
│   │       ├── CurrencyInput.tsx
│   │       └── CategorySelect.tsx
│   │
│   ├── lib/
│   │   ├── db.ts                     # Prisma singleton
│   │   ├── auth.ts                   # NextAuth config
│   │   ├── redis.ts                  # Redis client (ioredis)
│   │   ├── s3.ts                     # MinIO/S3 (AWS SDK v3)
│   │   ├── queue.ts                  # BullMQ queues
│   │   ├── pdf.ts                    # Puppeteer PDF generator
│   │   ├── currency.ts               # Currency formatting helpers
│   │   └── validations/
│   │       ├── transaction.ts
│   │       ├── budget.ts
│   │       └── category.ts
│   │
│   ├── server/
│   │   ├── actions/                  # Server Actions (form mutations)
│   │   │   ├── transaction.actions.ts
│   │   │   ├── budget.actions.ts
│   │   │   └── category.actions.ts
│   │   └── queries/                  # Data fetching (server-side only)
│   │       ├── analytics.queries.ts
│   │       ├── transaction.queries.ts
│   │       └── budget.queries.ts
│   │
│   ├── workers/
│   │   ├── report.worker.ts          # PDF/CSV generation worker
│   │   ├── recurring.worker.ts       # Process recurring transactions
│   │   └── notification.worker.ts   # Budget alert emails
│   │
│   ├── hooks/
│   │   ├── useTransactions.ts
│   │   ├── useBudget.ts
│   │   └── useAnalytics.ts
│   │
│   └── types/
│       └── index.ts
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                       # Default categories + demo data
│
├── templates/
│   └── report.hbs                    # Handlebars PDF template
│
├── public/
│   └── icons/                        # Category icons (SVG)
│
├── Dockerfile
└── package.json
```

---

## 8. Database Schema (Prisma)

```prisma
enum TransactionType { INCOME EXPENSE TRANSFER }
enum UserRole        { OWNER MEMBER VIEWER }
enum JobStatus       { PENDING PROCESSING DONE FAILED }
enum Frequency       { DAILY WEEKLY BIWEEKLY MONTHLY QUARTERLY YEARLY }

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  passwordHash  String?
  avatar        String?
  currency      String   @default("IDR")
  timezone      String   @default("Asia/Jakarta")
  createdAt     DateTime @default(now())
  workspaces    WorkspaceMember[]
  transactions  Transaction[]
  reports       Report[]
}

model Workspace {
  id            String   @id @default(cuid())
  name          String
  currency      String   @default("IDR")
  createdAt     DateTime @default(now())
  members       WorkspaceMember[]
  categories    Category[]
  transactions  Transaction[]
  budgets       Budget[]
  recurringRules RecurringRule[]
}

model WorkspaceMember {
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  workspaceId String
  user        User      @relation(fields: [userId], references: [id])
  userId      String
  role        UserRole  @default(MEMBER)
  joinedAt    DateTime  @default(now())
  @@id([workspaceId, userId])
}

model Category {
  id          String          @id @default(cuid())
  workspaceId String
  workspace   Workspace       @relation(fields: [workspaceId], references: [id])
  name        String
  icon        String          @default("circle")
  color       String          @default("#6366f1")
  type        TransactionType
  parentId    String?
  parent      Category?       @relation("subcategory", fields: [parentId], references: [id])
  children    Category[]      @relation("subcategory")
  transactions Transaction[]
  budgets     Budget[]
  @@unique([workspaceId, name])
}

model Transaction {
  id              String          @id @default(cuid())
  workspaceId     String
  workspace       Workspace       @relation(fields: [workspaceId], references: [id])
  userId          String
  user            User            @relation(fields: [userId], references: [id])
  categoryId      String?
  category        Category?       @relation(fields: [categoryId], references: [id])
  type            TransactionType
  amount          Decimal         @db.Decimal(15, 2)
  currency        String          @default("IDR")
  description     String
  date            DateTime        @db.Date
  notes           String?
  tags            String[]
  receiptUrl      String?
  isRecurring     Boolean         @default(false)
  recurringRuleId String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  @@index([workspaceId, date(sort: Desc)])
  @@index([workspaceId, categoryId])
  @@index([workspaceId, type, date])
}

model Budget {
  id            String    @id @default(cuid())
  workspaceId   String
  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  categoryId    String
  category      Category  @relation(fields: [categoryId], references: [id])
  month         String    -- "2026-03" format
  limitAmount   Decimal   @db.Decimal(15, 2)
  alertAt       Int       @default(80) -- percentage threshold for alert
  createdAt     DateTime  @default(now())
  @@unique([workspaceId, categoryId, month])
}

model RecurringRule {
  id            String    @id @default(cuid())
  workspaceId   String
  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  categoryId    String?
  type          TransactionType
  amount        Decimal   @db.Decimal(15, 2)
  description   String
  frequency     Frequency
  startDate     DateTime  @db.Date
  endDate       DateTime? @db.Date
  nextRunAt     DateTime
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
}

model Report {
  id          String    @id @default(cuid())
  workspaceId String
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  type        String    -- "PDF" | "CSV"
  periodStart DateTime  @db.Date
  periodEnd   DateTime  @db.Date
  filters     Json      @default("{}")
  status      JobStatus @default(PENDING)
  fileUrl     String?
  createdAt   DateTime  @default(now())
}
```

---

## 9. Key Architecture Decisions

### ADR-001: Next.js Monolith over Microservices
- **Decision:** Single Next.js 14 application with API routes
- **Rationale:** Budget tracking has no async-heavy workloads (unlike OCR). Monolith reduces operational complexity, deployment friction, and cold start latency. App Router enables co-located server/client code with excellent DX.

### ADR-002: Decimal type for monetary amounts
- **Decision:** `Decimal @db.Decimal(15, 2)` in Prisma, not `Float`
- **Rationale:** Floating point arithmetic is unsuitable for financial calculations. Decimal preserves exact precision for IDR amounts up to 999,999,999,999.99.

### ADR-003: Redis cache for analytics queries
- **Decision:** Cache all analytics aggregations in Redis with 2–10 min TTL
- **Rationale:** Analytics queries involve multi-table aggregations that can be slow on large datasets. Caching eliminates redundant computation on dashboards that refresh frequently.

### ADR-004: BullMQ for PDF generation and recurring transactions
- **Decision:** Background job queue for PDF reports and recurring transaction processing
- **Rationale:** PDF generation via Puppeteer takes 2–5s and should not block HTTP responses. Recurring transactions must run on a schedule regardless of user activity.

### ADR-005: Workspace multi-tenancy model
- **Decision:** All data is scoped to a `Workspace`, not directly to a `User`
- **Rationale:** Enables family/team use case (husband + wife sharing one budget) without requiring separate accounts. One user can belong to multiple workspaces (personal + business).

### ADR-006: Server Components for analytics pages
- **Decision:** Dashboard and analytics pages use Next.js Server Components
- **Rationale:** Analytics data is read-heavy and benefits from server-side fetching and caching. Eliminates waterfall loading and reduces client-side JS bundle.

---

## 10. Performance Targets

| Metric | Target |
|---|---|
| Dashboard load (cold) | < 1.5s |
| Dashboard load (cached) | < 300ms |
| Transaction list (1000 records) | < 500ms |
| Analytics query (cached) | < 100ms |
| PDF report generation | < 8s |
| CSV export (10,000 rows) | < 3s |
| Lighthouse Performance score | ≥ 90 |

---

## 11. Technology Summary

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| State | Zustand + SWR |
| Auth | NextAuth.js v5 |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 (ioredis) |
| Queue | BullMQ |
| PDF | Puppeteer + Handlebars |
| Storage | MinIO (dev) / S3 (prod) |
| Email | Nodemailer + Mailhog (dev) |
| Container | Docker Compose |
| CI/CD | GitHub Actions |

---

*This document is the living architecture reference. Update when major technical decisions change.*
