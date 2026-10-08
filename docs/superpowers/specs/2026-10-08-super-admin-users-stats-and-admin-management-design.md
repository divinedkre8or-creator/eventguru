# Super Admin Users Directory, Real-Time Statistics Hub, Secure Admin Delegation, and UI Polish Specification

- **Date:** 2026-10-08
- **Status:** Validated & Ready for Implementation Plan
- **Target Audience:** Super Admin, Platform Organizers, Platform Engineering
- **Design Principles:** Zero live-platform downtime, additive non-breaking database schema, zero emojis, zero AI slop, high-density financial data, crisp institutional UI.

---

## 1. Problem Statement & Objectives

### 1.1 Problems
1. **No Super Admin Visibility into Regular Platform Users:** Currently, the Super Admin dashboard only lists event organizers (`/admin/organisers`). There is no directory to view regular platform users and attendees who register for events, purchase tickets, or hold attendee accounts.
2. **Missing Real-Time Numbers & Operational Hub:** The existing admin overview calculates revenue by fetching raw registration rows into browser memory—an unsafe anti-pattern that creates network strain and cannot handle growing volume. The Super Admin needs an unshakeable, real-time metrics command center with instant financial figures, activity feeds, and ticket velocity.
3. **No Secure Mechanism to Grant Super Admin Access:** There is currently no administrative UI or server-side RPC to safely grant Super Admin access to another account without manually running raw SQL in Supabase.
4. **Organizer Support Friction:** Organizers who encounter setup questions or errors have no visible direct support channel inside their dashboard.
5. **Super Admin Sidebar Typography:** Sidebar menu items in the Super Admin panel use `text-xs` (12px), making navigation text feel cramped and tiny compared to the bold `text-sm` used in the organizer dashboard.

### 1.2 Core Objectives
- Create a dedicated **Platform Users Directory** (`/admin/users`) for non-organizers and attendees.
- Build a resilient **Real-Time Statistics Hub** (`/admin/stats`) and upgraded Overview powered by server-side PostgreSQL aggregation RPCs.
- Implement an **Unexploitable Super Admin Delegation Model** with server-side caller verification, audit logging, and lockout protection.
- Smartly integrate the constant **Organizer Support Contact** (`09167739775`) into the organizer dashboard sidebar and footer.
- Polish **Super Admin Sidebar Typography** to match the bold, visible `text-sm` hierarchy of the organizer portal.
- Ensure strict adherence to brand guidelines: **zero emojis**, **no AI icons or slop**, and **100% backward compatibility** with live transactions and events.

---

## 2. System Architecture & Backend Data Layer

### 2.1 Additive PostgreSQL Stored Procedures (RPCs)
To eliminate heavy client-side row downloading and prevent database lock contention on live production tables, all aggregations execute in PostgreSQL via `SECURITY DEFINER` functions with `search_path = public`.

#### A. Real-Time Stats RPC: `public.get_admin_realtime_stats()`
- **Execution Time:** ~5ms
- **Return Type:** JSON
- **Metrics Computed Server-Side:**
  - `total_gmv`: `COALESCE(SUM(amount_paid), 0)` from `public.registrations` where `status = 'completed'` or `amount_paid > 0`.
  - `today_gmv`: Sum of `amount_paid` for registrations created since midnight UTC today.
  - `total_tickets_sold`: Count of confirmed/completed registrations.
  - `today_tickets_sold`: Count of registrations created today.
  - `total_organisers`: Count of unique users with `role = 'organiser'` in `public.user_roles`.
  - `total_attendees`: Count of users with `role = 'attendee'` in `public.user_roles`.
  - `total_events`: Count of events broken down into `published`, `draft`, and `completed`.
  - `total_checkins`: Count of registrations where `checked_in = true`.
  - `checkin_rate_pct`: Calculated check-in percentage `(total_checkins / NULLIF(total_tickets_sold, 0)) * 100`.
  - `estimated_fees`: Estimated platform take-rate based on standard ticketing fees.
- **Security Check:** Caller must have `role = 'admin'` via `public.has_role(auth.uid(), 'admin')`. Unauthorized callers trigger `RAISE EXCEPTION 'Unauthorized: Super Admin access required'`.

#### B. Platform Users Query RPC: `public.get_admin_platform_users(search_query text, limit_val int, offset_val int)`
- **Return Type:** JSON array of attendee objects
- **Attributes Returned:**
  - `user_id`: UUID
  - `full_name`: string
  - `email`: string
  - `phone`: string (or null)
  - `created_at`: timestamp
  - `tickets_count`: total tickets registered under this user ID or email
  - `total_spent`: sum of `amount_paid` for registrations linked to this user
  - `last_activity`: timestamp of latest registration
  - `is_admin`: boolean flag indicating whether this user also holds an admin role
- **Filtering & Search:** Efficient ILIKE search against `profiles.full_name`, `auth.users.email`, or `registrations.email`.

#### C. Secure Admin Role Delegation RPC: `public.promote_to_admin(target_email text)`
- **Caller Verification:** `IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;`
- **Execution Logic:**
  1. Locates target user in `auth.users` matching `target_email` (case-insensitive trim).
  2. If user does not exist, raises an exception: `'User with this email does not exist on the platform'`.
  3. Inserts `(target_user_id, 'admin'::public.app_role)` into `public.user_roles` `ON CONFLICT DO NOTHING`.
  4. Records the delegation event in an audit table or log with `caller_id = auth.uid()` and `timestamp = now()`.
  5. Returns `{ "success": true, "user_id": target_user_id, "email": target_email }`.

#### D. Revocation Protection: `public.demote_admin(target_user_id uuid)`
- Prevents platform lockout by verifying `SELECT COUNT(*) FROM public.user_roles WHERE role = 'admin'` is strictly greater than 1 before permitting any demotion.
- A Super Admin cannot demote themselves if they are the sole remaining admin.

---

## 3. Real-Time Data Flow & WebSocket Management

### 3.1 Live Pulse Channel (`admin-live-pulse`)
- Uses Supabase Client `channel('admin-live-pulse')` subscribing to:
  - `postgres_changes` on `public.registrations` (`INSERT`, `UPDATE`)
  - `postgres_changes` on `public.events` (`INSERT`, `UPDATE`)
- **Incoming Event Handling:**
  - On `INSERT` to `registrations`:
    1. Prepends a structured activity item to the Live Activity Feed:
       `[HH:MM:SS] TICKET_PURCHASE: [Event Title] · ₦[Amount] · [Attendee Name]`
    2. Increments the in-memory Gross Volume and Today's Ticket Count instantly.
  - On `UPDATE` to `registrations` where `checked_in` transitions to `true`:
    1. Prepends: `[HH:MM:SS] CHECK_IN_CONFIRMED: [Event Title] · [Ticket ID / Ref]`
    2. Increments live check-in counter.
  - On `INSERT` or `UPDATE` to `events`:
    1. Prepends: `[HH:MM:SS] EVENT_PUBLISHED: [Event Title] · by [Organiser]`

### 3.2 Resiliency & Graceful Degradation
- If WebSocket drops or encounters rate limits, TanStack Query automatically polls every 30 seconds as a fallback.
- Manual refresh button allows one-click synchronous cache invalidation.

---

## 4. User Interface & Screen Specifications

### 4.1 Super Admin Navigation Typography Fix (`AdminLayout.tsx`)
- Update sidebar item typography from `text-xs font-semibold px-3 py-2.5` to `text-sm font-semibold px-3.5 py-2.5 rounded-xl`.
- Icon sizing updated from `w-4 h-4` to `w-4.5 h-4.5`.
- Active item states use distinct high-contrast fill matching `DashboardLayout.tsx`.
- Sidebar navigation entries:
  1. Overview (`/admin`)
  2. Realtime Stats (`/admin/stats`) *(NEW)*
  3. All Events (`/admin/events`)
  4. Organisers (`/admin/organisers`)
  5. Platform Users (`/admin/users`) *(NEW)*
  6. Transactions (`/admin/transactions`)
  7. SMS & Messaging (`/admin/sms`)
  8. Disputes (`/admin/disputes`)
  9. Feedback & Support (`/admin/feedback`)
  10. Settings & Admins (`/admin/settings`)

### 4.2 Platform Users Directory (`/admin/users`)
- **KPI Summary Header:**
  - Total Platform Users (Attendees)
  - Active Ticket Buyers (Users with >= 1 ticket purchase)
  - Average Lifetime Value per Attendee (₦)
- **Search & Filters:**
  - Search input: Search by Name, Email, or User ID.
  - Filter pills: All Attendees | Paid Buyers | Free Attendees | Multiple Events.
- **Data Table:**
  - Columns:
    - User Identity (Full Name, User ID snippet)
    - Contact (Email, Phone)
    - Tickets Registered (Total ticket count and event count)
    - Total Spent (Formatted ₦ with currency formatting)
    - Joined Date (Formatted en-GB date)
    - Actions (View History modal, Promote to Super Admin button)
- **User History Slide-Over / Dialog:**
  - Displays all events attended by this user, tickets purchased, ticket tier, amount paid, payment reference, and door check-in status.

### 4.3 Real-Time Statistics Hub (`/admin/stats`)
- **Connection Header:**
  - Status indicator: `● LIVE PULSE ACTIVE` (green dot with subtle pulse animation).
  - Last synced timestamp + manual refresh button.
- **Primary Metric Cards (Grid):**
  1. Gross Platform Volume (₦)
  2. Today's Transaction Volume (₦) & Today's Tickets
  3. Total Tickets Issued across Platform
  4. Platform Accounts (Breakdown: Organisers vs Attendees)
  5. Door Check-In Rate (%)
  6. Estimated Platform Take-Rate Revenue (₦)
- **Live Activity Stream Console:**
  - High-density monospace feed (`font-mono text-xs`).
  - Strict format: `[HH:MM:SS] [ACTION_TYPE]: [Details] · [Context]`.
  - Zero emojis, clean status indicators, auto-scroll toggle.
- **Performance Breakdown Tables:**
  - Top Events by Revenue (Rank, Title, Organiser, Tickets Sold, Gross Volume).
  - Top Organisers by Volume (Rank, Organiser Name, Events Count, Total Sales).
  - Ticket Tier Split (Free vs Paid ratios).

### 4.4 Secure Super Admin Delegation Interface (`/admin/settings` & Modal)
- **Dedicated Section:** "Super Administrator Access & Permissions"
- **Active Administrators Table:**
  - Lists all users holding `role = 'admin'`.
  - Displays Administrator Name, Email, Granted Date, and Status badge.
- **Grant Super Admin Action:**
  - Modal triggered via button: "Add Platform Administrator".
  - Requires target user email.
  - Detailed warning prompt explaining the elevated permissions.
  - Confirmation button: "Confirm Admin Elevation".
  - Calls `promote_to_admin` RPC.
  - On success, triggers instant cache refresh and displays crisp success notification.

### 4.5 Organizer Support Integration (`DashboardLayout.tsx`)
- Constant support number: **09167739775**.
- **Smart Placement 1 (Sidebar Footer):**
  - Positioned above the user account drawer in the desktop and mobile sidebars.
  - Crisp support card:
    - Label: `ORGANIZER SUPPORT`
    - Text: `Need help or spotted an issue? Speak directly with our team.`
    - Number display: `09167739775`
    - Quick actions: `Call (tel:09167739775)` and `WhatsApp (https://wa.me/2349167739775)`.
    - Lucide icons: `Phone`, `MessageCircle` (clean SVG, no emojis).
- **Smart Placement 2 (Dashboard Bottom Bar):**
  - Subtle footer note on organizer overview: `Platform Support Line: 09167739775 · Available 24/7`.

---

## 5. Non-Breaking Migration & Safety Plan

1. **Database Migration (`supabase/migrations/20261008200000_admin_stats_and_user_directory.sql`):**
   - Purely additive: creates `get_admin_realtime_stats`, `get_admin_platform_users`, and `promote_to_admin`.
   - Modifies zero existing tables, drops zero columns, touches zero existing RLS policies.
   - Idempotent with `CREATE OR REPLACE FUNCTION`.
2. **Frontend Rollout:**
   - New routes (`/admin/users`, `/admin/stats`) are additive.
   - Existing organizer dashboard and attendee ticket checkout remain completely untouched and isolated.
3. **Validation & Verification:**
   - Execute TypeScript check (`tsc --noEmit`) to verify zero type mismatches.
   - Run linter (`eslint`) to guarantee clean build.
   - Verify Super Admin role enforcement: non-admins cannot access endpoints or execute RPCs.
