# Mustanadak (مستندك)

## Overview
Arabic-first (RTL) business management web application for freelancers and small business owners. Manages clients, contracts, invoices, and projects with customizable public profile pages.

## Tech Stack
- **Frontend**: React + Vite, TailwindCSS, ShadCN UI, Wouter routing, TanStack Query
- **Backend**: Express.js, Drizzle ORM, PostgreSQL
- **Auth**: Custom email/password auth (bcryptjs, express-session, connect-pg-simple)
- **Font**: IBM Plex Sans Arabic
- **Design**: RTL layout, dark/light mode, Mustanadak brand colors

## Brand Colors
- Primary (Blue): #3B5FE5 → HSL(228, 74%, 56%)
- Accent (Orange): #E8752A → HSL(22, 79%, 54%)
- Cream: #F5DFC0 → HSL(35, 79%, 85%)
- Success (Green): #27AE60 → HSL(145, 63%, 42%)
- Logo: attached_assets/Asset_1@4x (app icon), Asset_4@4x (star icon)

## Project Structure
```
shared/schema.ts        - Database schema + Zod types
server/storage.ts       - CRUD storage layer (IStorage interface)
server/routes.ts        - Express API routes
client/src/App.tsx      - Root app with routing & auth
client/src/components/  - Sidebar, ThemeProvider, ThemeToggle
client/src/pages/       - All page components
client/src/index.css    - Theme variables & custom styles
```

## Database Tables
profiles, clients, contracts, invoices, invoice_items, projects, project_tasks, services, portfolio_items, contact_messages, notifications, subscriptions

## Pages
- Landing (/) - Marketing page with login CTA
- Dashboard (/dashboard) - Stats, overdue/expiring items
- Clients (/dashboard/clients) - Client CRUD
- Contracts (/dashboard/contracts) - Contract CRUD with 3 Arabic templates
- Invoices (/dashboard/invoices) - Invoice CRUD with VAT (15%)
- Projects (/dashboard/projects) - Project CRUD with Kanban task board
- My Page (/dashboard/my-page) - Profile, services, portfolio, messages management
- Settings (/dashboard/settings) - Account, billing, appearance
- Notifications (/dashboard/notifications) - Notification center
- Public Profile (/p/:username) - Public-facing shareable page

## Key Features
- All UI text in Arabic
- RTL sidebar on the right
- Sequential invoice numbers (INV-0001, etc.)
- 3 pre-built Arabic contract templates
- 15% VAT auto-calculation
- Contact form on public profiles
- Dark/light mode toggle
- Services/Portfolio tabs locked until profile is created
- File upload for service images and portfolio items (images/videos) via Replit Object Storage

## File Upload
- Uses Replit Object Storage with presigned URL flow
- Upload endpoint: POST /api/uploads/request-url (authenticated)
- Object serving: GET /objects/* 
- Services accept image uploads only
- Portfolio accepts image and video uploads
- Files stored at /objects/uploads/<uuid> paths

## PDF Export
- Client-side PDF generation using jspdf + html2canvas
- Invoices: Download button in actions column, includes company info, items table, VAT, totals
- Contracts: Download button on card, includes contract content, signature areas
- PDFs use IBM Plex Sans Arabic font, Mustanadak brand colors, RTL layout
- Profile data (company name, address, tax number) shown in PDF headers

## Profile Customization
- Primary & accent color pickers (10 presets + custom hex/color input)
- Avatar, logo, and cover image upload
- Header styles: gradient, solid color, cover image, minimal
- Button styles: filled or outlined
- Theme mode: light or dark (applies to public profile page)
- Live preview of customizations in My Page editor
- Public profile dynamically renders all customization options
- Safe fallback: if headerStyle=image but no cover uploaded, falls back to gradient

## Stripe Subscriptions
- Plans: starter (29 SAR), pro (59 SAR), business (99 SAR)
- 14-day free trial on all plans
- Stripe Checkout for payment, Stripe Customer Portal for management
- Webhook endpoint: POST /api/webhooks/stripe (handles subscription lifecycle)
- API: GET /api/subscription, POST /api/subscription/checkout, POST /api/subscription/portal
- Settings page shows subscription status with manage/cancel via Stripe portal
- Landing page pricing buttons trigger Stripe Checkout (or login redirect if unauthenticated)
- Secrets: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY (STRIPE_WEBHOOK_SECRET optional for dev)

## Email Service
- Uses Resend (resend.com) for sending password reset and email verification emails
- Secret: RESEND_API_KEY (stored manually, not via Replit connector)
- From address: configured via RESEND_FROM_EMAIL env var, defaults to noreply@resend.dev
- Password reset tokens expire after 1 hour
- Email verification tokens expire after 24 hours

## Email Verification
- New users receive verification email on registration (24-hour expiry token)
- Social login users (Google/Facebook/Apple) are auto-verified
- Dashboard shows amber banner for unverified users with resend and dismiss options
- Verify endpoint: GET /api/auth/verify-email?token=xxx
- Resend endpoint: POST /api/auth/resend-verification (authenticated)
- Verify page: /auth/verify-email?token=xxx

## Social Login
- Google OAuth: Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET secrets
- Facebook OAuth: Requires FACEBOOK_APP_ID and FACEBOOK_APP_SECRET secrets
- Apple Sign-In: UI button present but not yet implemented (disabled)
- Social login buttons are conditionally enabled based on available credentials (GET /api/auth/providers)
- OAuth callbacks: /api/auth/google/callback, /api/auth/facebook/callback

## Document Editor (DocuSign-like)
- Upload PDF/image files, add drag-and-drop fields (text, date, signature)
- Share documents via public links for signing without account
- Field types: text, date, signature (using react-signature-canvas)
- Document status workflow: draft → sent → signed
- Email notification: Sends signing link via Resend when document is sent for signature
- Client linking: Documents can be linked to registered clients (clientId field)
- Send dialog auto-fills recipient name/email when a client is selected
- PDF preview: Server-side conversion using pdftoppm (/api/pdf-preview endpoint)
- Public signing page collects signer name, email, signature, and field values
- API: /api/documents (CRUD), /api/documents/:id/fields, /api/documents/sign/:shareToken
- Tables: documents (with clientId), document_fields, document_signatures
- Pages: /dashboard/documents (list), /dashboard/documents/:id (editor), /sign/:token (public)
- Sidebar nav: المستندات (FilePenLine icon)

## Recent Changes
- 2026-02-23: Added email notification on document send, client linking for documents
- 2026-02-23: Added document editor with drag-drop fields, signature pad, public signing links
- 2026-02-21: Added email verification on registration with dashboard banner and resend option
- 2026-02-20: Added forgot password flow (Resend email), phone field, social login buttons (Google/Facebook/Apple)
- 2026-02-20: Replaced Replit Auth with custom email/password auth (bcryptjs, session-based, /auth page)
- 2026-02-19: Added Stripe subscription payments (checkout, portal, webhooks, subscription tab in settings)
- 2026-02-19: Added profile customization (colors, logo, cover, themes, button styles, live preview)
- 2026-02-19: Added PDF download for invoices and contracts
- 2026-02-19: Added tab locking (services/portfolio require profile), file upload support for services and portfolio
- 2026-02-19: Initial full build of all pages and features
