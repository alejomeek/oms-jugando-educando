# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server (localhost:5173), proxies /api/* to localhost:3001
npm run build     # TypeScript check (tsc -b) then Vite bundle → dist/
npm run lint      # ESLint on all .ts/.tsx files
npm run preview   # Serve production build locally
```

No test framework is configured.

## Environment Setup

Copy `.env.example` to `.env.local` and fill in:
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — Supabase project credentials
- `VITE_ML_ACCESS_TOKEN`, `VITE_ML_REFRESH_TOKEN`, `VITE_ML_SELLER_ID`, `VITE_ML_CLIENT_ID`, `VITE_ML_CLIENT_SECRET` — Mercado Libre OAuth
- `VITE_WIX_API_KEY`, `VITE_WIX_SITE_ID` — Wix eCommerce API

Database: run `supabase/schema.sql` against a Supabase project to create the schema.

## Architecture

**OMS Jugando Educando** is an Order Management System that unifies orders from Mercado Libre and Wix into a single dashboard for an educational products business.

### Tech Stack
- **Frontend:** React 19 + TypeScript, Tailwind CSS v4, TanStack React Query v5
- **Backend:** Vercel Serverless Functions (Node.js, in `api/`)
- **Database:** Supabase (PostgreSQL with JSONB)
- **Build:** Vite 7

### Data Flow

```
Sync button → useSyncML/useSyncWix hook → POST /api/sync-ml or /api/sync-wix
  → Vercel serverless fetches from Mercado Libre or Wix API
  → Returns normalized orders to frontend
  → Frontend upserts to Supabase
  → React Query cache invalidates → UI refreshes
```

Direct data reads (order list, status updates) go from components → hooks → Supabase client (`src/services/supabase.ts`) — no server intermediary.

### Key Architectural Patterns

**Normalization layer** (`src/services/normalizer.ts`): Converts raw Mercado Libre (`MLOrder`) and Wix (`WixOrder`) API responses into the unified `Order` type defined in `src/lib/types.ts`. This is the critical seam for adding new channels.

**React Query for server state:** `useOrders` hook handles fetch, filter, and status-update mutations. Stale time is 5 minutes. Mutations invalidate the orders query on success. UI state (modal open/close, selected order, filter values) stays in local `useState`.

**JSONB flexibility:** `customer`, `items`, `shipping_address`, and `payment_info` columns are JSONB, letting each channel store its own fields without schema migrations. The TypeScript interfaces in `types.ts` define the expected shape.

**Serverless sync:** `api/sync-ml.js` handles Mercado Libre token refresh (auto-retries on 401). `api/sync-wix.js` fetches Wix eCommerce orders. Both return normalized data; the frontend is responsible for the Supabase upsert.

### Directory Layout

```
src/
  pages/          # Dashboard.tsx — single page app
  components/
    ui/           # Generic: Button, Badge, Modal, Input, Select, Spinner
    orders/       # Domain: OrdersTable, OrderRow, OrderDetailModal, OrderFilters, OrderStats, etc.
  hooks/          # useOrders, useSyncML, useSyncWix
  services/       # supabase.ts (client), normalizer.ts, mercadolibre.ts, wix.ts
  lib/            # types.ts, constants.ts, database.types.ts, formatters.ts
api/              # Vercel serverless: sync-ml.js, sync-wix.js
supabase/         # schema.sql, README.md
```

### Database Schema

Two tables:
- **`orders`** — primary table; `external_id + channel` is the unique key used for upserts. Status enum: `nuevo | preparando | listo | enviado | cancelado`.
- **`order_status_history`** — audit log; auto-populated via application logic on status change.

RLS is enabled but permissive (`USING (true)`) — this is intentional for MVP but must be restricted before multi-user production use.

### TypeScript Path Alias

`@/*` maps to `./src/*` (configured in `tsconfig.json` and `vite.config.ts`).
