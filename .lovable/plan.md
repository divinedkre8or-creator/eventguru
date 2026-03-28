

# EVENTSTACK — Build Plan

## Brand & Design System
**Name**: Eventstack (not Crowdstack)
**Fonts**: Syne (headings, buttons, labels, 700–800 weight) + DM Sans (body, 300–500)
**Colors**: Ink `#0A0D12`, Amber `#F5A623`, Coral `#E8473F`, Teal `#00B894`, Electric `#3B5BFF`, Ivory `#FDFAF4`, Surface `#F5F2EC`
**Rules**: Mobile-first, no text overflows, scroll-to-top on every page, kente-pattern dividers, subtle noise texture overlay, high contrast dark organiser dashboard, light ivory attendee pages.

---

## Phase A — Foundation (This Plan)

### 1. Design System Setup
- Update `index.css` with Eventstack color tokens (all HSL), import Syne + DM Sans from Google Fonts
- Set up Tailwind config with custom colors (`ink`, `amber`, `coral`, `teal`, `electric`, `ivory`, `surface`), border-radius tokens, and spacing scale
- Create reusable base components: Button variants (primary/amber/coral/ghost/teal), Input fields, Status badges, Pill/chip components — all following the UI/UX direction doc

### 2. Landing Page (`/`)
A bold, African-inspired marketing + event discovery page:
- **Hero Section** — Dark ink background with ambient gradient blobs, kente pattern strip at top, bold Syne headline ("Africa's Event Platform"), amber CTA buttons ("Create Your Event" / "Explore Events"), event category pills
- **Features Section** — 3-column grid showcasing core modules (Ticketing, Check-in, DP Generator, Analytics, etc.) with icon cards
- **How It Works** — 3-step visual flow (Create → Sell → Manage)
- **Featured Events** — Grid of event cards with banner images, dates, venue, ticket price, category badges (uses mock data)
- **Event Categories** — Browse by type: Conferences, Trade Shows, Church Events, Campus Events
- **Social Proof / Stats** — "8 Core Modules • 60+ Features • Built for Africa"
- **Footer** — with kente divider, links, Eventstack branding

### 3. Auth Setup (Hybrid)
- Set up Supabase/Lovable Cloud auth with email + password
- Login page (`/login`) and Sign Up page (`/signup`) — dark ink background, amber accent, Eventstack branding
- Role selection on signup: "Organiser" or "Attendee" (stored in user roles table)
- Protected route wrapper for dashboard pages
- Auth context provider throughout the app

### 4. Organiser Dashboard Shell (`/dashboard`)
Dark theme dashboard (ink background) matching the UI/UX direction:
- **Sidebar navigation** — Eventstack logo, links to: Overview, Events, Attendees, Tickets, Check-in, DP Generator, Campaigns, Analytics, Payments, Settings
- **Top bar** — greeting ("Good morning, Amaka"), notification bell, avatar, event selector dropdown
- **Overview page** — Metric cards (Total Events, Total Attendees, Revenue, Check-ins) with amber/teal accent values, sales velocity mini-chart, recent registrations list, upcoming events — all with realistic mock data
- **Mobile**: Collapsible sidebar → bottom tab navigation

### 5. Super Admin Dashboard Shell (`/admin`)
Platform-level admin for the Eventstack team:
- **Sidebar** — Platform Overview, All Events, All Organisers, All Transactions, Disputes, Platform Settings
- **Overview page** — Platform-wide stats: total organisers, total events, total revenue, active events today, pending payouts — mock data
- **Organisers list** — Table of organisers with name, events count, total revenue, status
- **Events list** — All events across the platform with filters

### 6. Shared Layout & Navigation
- Responsive app shell with sidebar (desktop) / bottom nav (mobile)
- Scroll-to-top on every route change
- 404 page styled with Eventstack branding
- Route structure: `/`, `/login`, `/signup`, `/dashboard/*`, `/admin/*`

---

## What Comes Next (after this plan)
After this foundation, we'll build out each module one at a time:
- **Event Creation & Page Builder** — create event form, event landing page
- **Ticketing Engine** — ticket types, pricing, checkout flow
- **Registration & Forms** — form builder, walk-in registration
- **DP Generator** — frame upload, photo upload, background removal
- **Attendee Management** — attendee list, filters, exports, CRM
- **Check-in App** — QR scanning, offline mode, multi-gate
- **Campaigns** — Email & SMS editor, automated triggers
- **Analytics** — Revenue charts, attendee insights, post-event reports
- **Payments** — Paystack/Flutterwave integration, payouts

Each module will be planned and built incrementally with your input.

