# AGENTS.md — Benson Anson Loans System

## Project Overview

Mobile-first PWA for a Zambian collateral-based lending company.
Manages customers, collateral, loans, payments, collections, penalties,
accounting, reporting, and user management from one platform.

**Repository:** https://github.com/seantinashenyakutira-whatsblade/benson-anson-loan-management
**Supabase Project:** niheommcjshenlrzwnlj
**Vercel Account:** seantinashenyakutira-2100

## Tech Stack

| Layer        | Technology                                    |
|-------------|-----------------------------------------------|
| Frontend    | Next.js 16 (App Router) + TypeScript (strict) |
| Styling     | Tailwind CSS v4 + custom design tokens         |
| UI Primitives | shadcn/ui (to be initialized)                |
| Charts      | Recharts                                       |
| Validation  | Zod                                            |
| Database    | Supabase (PostgreSQL 17)                       |
| Auth        | Supabase Auth via @supabase/ssr                |
| Deployment  | Vercel (primary)                               |
| Testing     | Vitest (unit), Playwright (e2e)                |
| Node        | v22.17.1 (LTS)                                |

## Architecture Decisions

### Money Handling (NON-NEGOTIABLE)
- ALL financial arithmetic uses integer minor units (ngwee, K1 = 100)
- Single source of truth: `src/lib/money.ts`
- Database: `NUMERIC(18,2)` for all money columns
- Rounding: half-up, final instalment absorbs residual
- NEVER use JavaScript floating point for money
- Every UI figure is derived from transactions, never manually typed

### Security
- RBAC enforced at DATABASE layer via Supabase RLS
- Supabase service_role key NEVER in client bundles
- All financial actions write immutable audit logs
- Payments/disbursements/penalties are never hard-deleted

### Business Logic in PostgreSQL
- Push logic into DB: functions, views, RPCs, RLS
- Keep frontend thin
- Enables future cPanel migration

## Folder Structure

```
src/
  app/
    (auth)/          # Login, forgot-password, reset-password
    (app)/           # Authenticated app shell
      dashboard/     # KPIs, collections, health, tasks
      customers/     # Customer management
      collateral/    # Collateral vault
      loan-products/ # Product configuration
      applications/  # Loan applications
      loans/         # Active loans
      payments/      # Payment recording
      penalties/     # Penalty management
      arrears/       # Arrears report
      officers/      # Loan officer management
      branches/      # Branch management
      accounting/    # Cashbook, income, expenses, journal, PnL, balance sheet
      reports/       # All 14 reports
      users/         # User management
      settings/      # Business settings
      audit/         # Audit log viewer
      profile/       # Own profile
    pay/[loanNo]/    # Public payment page
  components/
    ui/              # shadcn/ui primitives
    layout/          # TopBar, BottomNav, Sidebar
    dashboard/       # KpiCard, ChartPanel, etc.
    customers/       # Customer-specific components
    loans/           # Loan-specific components
    payments/        # Payment-specific components
    reports/         # Report-specific components
  lib/
    money.ts         # Financial arithmetic (ngwee)
    utils.ts         # cn() utility for class merging
    loan/
      interest.ts    # Interest calculation
      schedule.ts    # Schedule generation
      position.ts    # Position calculations (arrears, shortfall)
      penalty.ts     # Penalty engine
      allocation.ts  # Payment allocation
      status.ts      # Loan status state machine
    supabase/
      client.ts      # Browser client (anon key)
      server.ts      # Server client (cookies + service role)
      middleware.ts   # Auth middleware
    validations/     # Zod schemas per entity
  hooks/             # Custom React hooks
  types/             # Shared TypeScript types
supabase/
  migrations/        # Versioned SQL migrations
  seed.sql           # Dev-only seed data
tests/
  unit/              # Unit tests (vitest)
  integration/       # Integration tests
  e2e/               # Playwright tests
  setup.ts           # Test setup
docs/                # Admin guide, API notes
scripts/             # Utility scripts
public/
  icons/             # PWA icons
  manifest.json      # PWA manifest
  sw.js              # Service worker
```

## Design System

Dark fintech theme. All tokens in `src/app/globals.css`.
CSS custom properties + Tailwind v4 @theme inline.

**Primary palette:** Deep navy (#0A1834) background, lavender (#C8B6F0) accent.
**Cards:** Glass morphism with backdrop-blur.
**Typography:** Inter (display/body), Geist Mono (code).
**Money:** Always tabular-nums. Always "K X,XXX.XX" format.

## Lending Workflow (Stage 1.5+)

Loans are ALWAYS created by converting approved applications.
There is no direct loan-creation form:
  1. `/applications/new` — officer creates a draft application
  2. `/applications/[id]` — owner/BM submits, approves (amount), or rejects
  3. Convert to Loan (owner/BM, approved only) → `rpc_convert_application_to_loan`
  4. Redirect to `/loans/[id]/disburse` — disbursement generates the schedule
  5. `/loans/new` redirects to `/applications/new` (route kept for old links)

## Roles & Permissions

| Role             | Scope                      | Key Permissions                    |
|-----------------|----------------------------|------------------------------------|
| owner           | Everything                  | Full access                        |
| branch_manager  | Branch-scoped               | Approve loans up to limit          |
| loan_officer    | Own portfolio only          | Register, apply, view, add notes   |
| cashier         | Payments only               | Record payments, issue receipts    |

Configurable via `permissions` + `role_permissions` tables.

## Testing Commands

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run lint:fix     # eslint --fix
npm run format       # prettier --write .
npm run format:check # prettier --check .
npm run test         # vitest run
npm run test:watch   # vitest
npm run test:e2e     # playwright test
npm run build        # next build
```

## Build Phases

| Phase | Focus                           | Status  |
|-------|---------------------------------|---------|
| 0     | Infrastructure                  | DONE    |
| 1     | Database (migrations, RLS)      | DONE    |
| 2     | Auth & RBAC                     | DONE    |
| 3     | Lending engine (money, interest)| DONE    |
| 4     | Customers & collateral          | DONE    |
| 5     | Loans, applications, disburse   | DONE    |
| 6     | Payments, collections, penalties| DONE    |
| 7     | Accounting (COA, journal, exp)  | DONE    |
| 8     | Dashboard, settings, reports    | DONE    |
| 9     | PWA & deployment                | PENDING |

## Environment Variables

See `.env.example` for the full list. Never echo values from `.env.local`.

## Known Issues

- **SWC native binary:** Not available for Win32 x64. Webpack mode used for builds. WASM fallback for dev.

## Standing Rules

1. Build ONLY what the current phase specifies. No feature code in infrastructure phases.
2. Commit to `develop` only. Never to `main`. Human handles main.
3. Financial arithmetic (money.ts, lib/loan/*) is Phase 3 work. Full unit test suite required.
4. Node stays at 22 LTS. Do not upgrade without asking.
5. Before every commit: confirm only `.env.example` is tracked (never `.env.local`).
6. Financial figures in UI must be derived from underlying records, never manually typed.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
