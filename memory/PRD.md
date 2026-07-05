# PRD — Customer Registry Pro

## Original Problem Statement
Build a world-class, enterprise-grade SaaS Customer Registry ("Customer Care Registry") web app inspired by HubSpot / Salesforce / Zoho / Linear / Stripe Dashboard. Dark theme, JWT auth, Kanban complaint management, dashboard analytics, seeded demo data.

## Architecture
- **Frontend**: React 19 + Tailwind + shadcn/ui + Recharts + Framer Motion + Lucide.
- **Backend**: FastAPI + Motor (async MongoDB), bcrypt + PyJWT auth, all routes under `/api`.
- **DB**: MongoDB (seeded at startup with 48 customers / 60 complaints / 24 tickets / 80 interactions / 5 notifications).
- **Auth**: Email/password + JWT bearer token (localStorage `crp_token`).
- **Preview**: https://support-hub-458.preview.emergentagent.com

## User Personas
- **Admin** — full workspace access, seeded on startup.
- **Agent** — self-registration path (default role); handles complaints & tickets.

## Core Requirements (Static)
1. Sidebar: Dashboard, Customers, Complaints, Support Tickets, Interactions, Reports, Analytics, Notifications, Settings, Help Center, Logout.
2. Top nav: Global Search (⌘K), Notifications badge, Profile menu, Quick Add.
3. Dashboard KPIs, area/pie/line/bar charts, recent activity, upcoming follow-ups.
4. Customers: searchable/filterable table, drawer profile with timeline, complaints, notes, docs tabs.
5. Complaints: Kanban (drag-drop) + Table toggle; drawer with status/priority/comments/timeline/attachments/resolution.
6. Reports: CSV/Excel/PDF exports.
7. Analytics: growth, categories, resolution trend, activity heatmap.
8. Notifications center with mark-all-read.
9. Settings: profile / security (change password) / roles / preferences.
10. Auth pages: Login (split-screen), Register, Forgot (OTP UI preview).

## Implemented — v1 (2026-02)
- Full JWT auth (register / login / me / forgot / profile / change password).
- Complete CRUD for Customers, Complaints, Tickets, Interactions with search/filter/pagination.
- Complaint comments, timeline, resolution, base64 attachments (5MB max).
- Dashboard stats + activity endpoints.
- In-app notifications system with unread badge.
- Global search across customers/complaints/tickets (⌘K palette).
- CSV / Excel (TSV) / printable-PDF exports.
- Dark-first design: Manrope headings, Plus Jakarta Sans body, custom Recharts theming, glassmorphism topbar, hero gradient, card-lift micro-interactions.
- Seeded demo data (~48 customers, 60 complaints, 24 tickets, 80 interactions).
- Fully responsive layout; Data test IDs on all interactive elements.
- **Tested**: 19/19 backend pytest cases pass, frontend flows verified via Playwright.

## Prioritized Backlog
### P1 (post-MVP polish)
- Real email delivery (Resend / SendGrid) — currently MOCKED (link logged to server console).
- Migrate attachments from base64-in-doc to object storage (S3 / GCS).
- Complete password-reset flow (POST /api/auth/reset-password endpoint) — token generation exists.
- Role-Based Access Control enforcement on backend (currently role stored, not enforced).

### P2 (nice-to-have)
- Split `server.py` into `routers/` package (auth, customers, complaints, tickets, notifications).
- Refresh-token flow.
- Real-time notifications via WebSocket.
- Bulk export selected rows only.
- Team/Workspace multi-tenancy.
- AI complaint auto-categorization (Claude / GPT via Emergent LLM key).
- Light theme polish (tokens defined, needs QA pass).

## Next Tasks List
1. Wire Resend/SendGrid for password reset & complaint status notifications (needs API key from user).
2. Add object-storage playbook integration for attachments.
3. Implement POST /api/auth/reset-password + reset-password page.
4. Add backend RBAC middleware and hide admin-only actions in UI.
