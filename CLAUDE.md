# CLAUDE.md — Mustanadak (مستندك)

## Project Overview

Arabic-first (RTL) SaaS business management platform for freelancers and small business owners in Arabic-speaking markets. Manages clients, contracts, invoices, projects, documents, and public profile pages. Currency is SAR with 15% VAT.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 7, TailwindCSS 3, ShadCN/Radix UI, Wouter (routing), TanStack Query |
| Backend | Express.js 5, Node.js 20+ |
| Database | PostgreSQL 16, Drizzle ORM |
| Auth | Custom email/password (bcryptjs, express-session, connect-pg-simple), Google/Facebook OAuth via Passport.js |
| Payments | Stripe (checkout, portal, webhooks) |
| Email | Resend (password reset, verification, notifications) |
| File Storage | Google Cloud Storage / Replit Object Storage |
| Rich Text | TipTap editor |
| AI | Anthropic Claude SDK |
| Validation | Zod schemas (shared between client and server) |

## Directory Structure

```
client/src/
├── App.tsx              # Root routing (Wouter), query client, theme provider
├── main.tsx             # React DOM entry
├── index.css            # Global styles, CSS variables, theme
├── components/
│   ├── ui/              # ShadCN/Radix primitives
│   ├── admin/           # Admin-specific components
│   ├── editor/          # TipTap rich text editor components
│   ├── app-sidebar.tsx  # Main navigation sidebar
│   └── ...
├── pages/               # Route page components
├── hooks/               # use-auth, use-mobile, use-toast, use-upload
└── lib/                 # queryClient, utils (cn), pdf-generator

server/
├── index.ts             # Express app setup, middleware, server start (port 5000)
├── routes.ts            # All API endpoints (~2800 lines)
├── customAuth.ts        # Session & password auth logic
├── db.ts                # Drizzle ORM + PostgreSQL pool
├── storage.ts           # IStorage interface, CRUD data layer
├── cache.ts             # Request-level caching
├── audit.ts             # Audit logging
├── migration.ts         # Bubble.io data migration tool
├── cluster.ts           # Multi-worker production mode
├── vite.ts              # Vite dev server integration
└── static.ts            # Static file serving (production)

shared/
├── schema.ts            # Drizzle table definitions + Zod insert/select types
└── models/auth.ts       # Auth-related schemas

script/build.ts          # Build: Vite (client→dist/public) + esbuild (server→dist/index.cjs)
```

## Commands

```bash
npm run dev          # Start dev server (tsx, hot reload, port 5000)
npm run build        # Build client (Vite) + server (esbuild) → dist/
npm run start        # Production single-worker server
npm run start:cluster # Production multi-worker server
npm run check        # TypeScript type checking (tsc)
npm run db:push      # Push Drizzle schema changes to PostgreSQL
```

## Key Architecture Patterns

### Layered Backend
Routes (`server/routes.ts`) → Storage (`server/storage.ts` via `IStorage` interface) → Database (`server/db.ts` via Drizzle ORM)

### API Convention
- All endpoints under `/api/` prefix
- RESTful CRUD: `GET /api/<resource>`, `POST /api/<resource>`, `PATCH /api/<resource>/:id`, `DELETE /api/<resource>/:id`
- Auth endpoints: `/api/auth/*`
- Webhook endpoints: `/api/webhooks/stripe`
- Admin endpoints: `/api/admin/*`

### Auth Flow
- Session-based authentication with PostgreSQL session store
- Middleware checks `req.isAuthenticated()` or `req.session.userId`
- Admin routes use `isAdmin` middleware
- Social login auto-verifies email; email/password requires verification

### Frontend Data Flow
- TanStack Query for all server state (fetch, cache, invalidation)
- `queryClient.invalidateQueries` after mutations
- React Context for theme (ThemeProvider) and auth (useAuth hook)
- Forms use react-hook-form + @hookform/resolvers + Zod schemas

## Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| TypeScript vars/functions | camelCase | `getInvoiceTotal` |
| React components | PascalCase | `InvoiceList` |
| Database tables | snake_case | `invoice_items` |
| Custom hooks | `use-` prefix (kebab-case files) | `use-auth.ts` |
| API routes | kebab-case paths | `/api/auth/verify-email` |
| CSS variables | `--` prefix, kebab-case | `--primary-blue` |

## Database Schema (shared/schema.ts)

**Auth:** users, sessions, email_verification_tokens, password_reset_tokens
**Core:** profiles, clients, contracts, invoices, invoice_items
**Projects:** projects, project_tasks
**Services:** services, portfolio_items, contact_messages
**Documents:** documents, document_fields, document_signatures
**Business:** subscriptions, notifications, content_library
**Admin:** audit_logs, platform_templates, platform_settings, admin_notifications, discount_coupons, tracking_scripts

## Environment Variables

**Required:**
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Session encryption key

**Optional (feature-dependent):**
- `PORT` — Server port (default: 5000)
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` — Stripe payments
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — Email service
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth
- `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` — Facebook OAuth
- `ANTHROPIC_API_KEY` — Claude AI integration

## Important Notes for AI Assistants

1. **All UI text is in Arabic.** Do not translate Arabic strings to English. New UI text must be in Arabic.
2. **RTL layout.** The sidebar is on the right. Use Tailwind RTL utilities (`rtl:`, `ltr:`) and directional classes as needed.
3. **No test framework.** There are no automated tests. Rely on TypeScript strict mode and Zod validation for correctness.
4. **No linter/formatter configured.** Follow existing code style by reading neighboring code.
5. **Large routes file.** `server/routes.ts` is ~2800 lines. When adding API endpoints, add them in the appropriate section (grouped by resource).
6. **Shared types.** Database schemas and Zod types live in `shared/schema.ts` and are imported by both client and server. Always update this file when modifying the data model.
7. **ShadCN components.** UI primitives are in `client/src/components/ui/`. Add new ShadCN components via the standard ShadCN CLI pattern if needed.
8. **Brand colors.** Primary: #3B5FE5 (blue), Accent: #E8752A (orange), Cream: #F5DFC0, Success: #27AE60.
9. **Font.** IBM Plex Sans Arabic.
10. **Currency.** SAR with 15% VAT auto-calculation on invoices.
11. **Build output.** `dist/public/` (client), `dist/index.cjs` (server), `dist/cluster.cjs` (multi-worker). The build script is in `script/build.ts`.
12. **Path aliases.** `@/` → `client/src/`, `@shared/` → `shared/` (configured in tsconfig.json and vite.config.ts).

## Deployment

- **Replit:** Primary platform. Uses `.replit` config, Node.js 20, PostgreSQL 16, autoscale deployment.
- **Railway:** Uses `railway.json`. Build: `npm install && npm run build`. Health check at `/api/health`.
- **Heroku:** Uses `Procfile` with cluster mode.
