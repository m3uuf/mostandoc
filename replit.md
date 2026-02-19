# Mustanadak (مستندك)

## Overview
Arabic-first (RTL) business management web application for freelancers and small business owners. Manages clients, contracts, invoices, and projects with customizable public profile pages.

## Tech Stack
- **Frontend**: React + Vite, TailwindCSS, ShadCN UI, Wouter routing, TanStack Query
- **Backend**: Express.js, Drizzle ORM, PostgreSQL
- **Auth**: Replit Auth (OpenID Connect)
- **Font**: IBM Plex Sans Arabic
- **Design**: RTL layout, dark/light mode, Mustanadak brand colors

## Brand Colors
- Primary (Dark Blue): #1B4F72 → HSL(204, 61%, 28%)
- Secondary (Light Blue): #2E86C1 → HSL(204, 62%, 47%)
- Success (Green): #27AE60 → HSL(145, 63%, 42%)
- Accent (Orange): #E8752A → HSL(23, 81%, 54%)

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
profiles, clients, contracts, invoices, invoice_items, projects, project_tasks, services, portfolio_items, contact_messages, notifications

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

## Recent Changes
- 2026-02-19: Added PDF download for invoices and contracts
- 2026-02-19: Added tab locking (services/portfolio require profile), file upload support for services and portfolio
- 2026-02-19: Initial full build of all pages and features
