# Organizer Email Lifecycle & Superstar Engagement System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully automated, high-contrast, premium email lifecycle system for EventGuru organizers—including the Monday Morning Performance Digest, the Post-Event "Host Wrapped" Debrief with 1-click rating/feedback, a shareable professional Host Achievement Flyer, and full idempotent database tracking.

**Architecture:** 
- Supabase PostgreSQL for automated tracking (`organizer_email_logs`, `organizer_reviews`) and event status queries.
- Supabase Edge Functions (`send-organizer-digest`, `send-post-event-debrief`) for cron/webhook execution and Resend email delivery.
- Pure responsive HTML/CSS email templates adhering to the brand design system (Inter, JetBrains Mono, `#0058BE` royal blue, `#0F172A` deep black, crisp `#E2E8F0` borders, zero AI slop, zero rainbow gradients).
- React frontend components in the Organizer Command Center for viewing the Host Wrap-up, downloading the professional Host Achievement Flyer (via `html2canvas`), and handling the 1-click email review landing flow.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Supabase (Database, Auth, Edge Functions/Deno), Resend API, html2canvas, Lucide React.

---

### Task 1: Database Migration for Automation Tracking & Host Reviews

**Files:**
- Create: `supabase/migrations/20261110000000_organizer_email_lifecycle.sql`

- [ ] **Step 1: Write migration SQL file**
  - Create table `organizer_email_logs` (`id`, `event_id`, `organiser_id`, `email_type`, `status`, `recipient_email`, `metadata`, `sent_at`, `created_at`).
  - Create table `organizer_reviews` (`id`, `event_id`, `organiser_id`, `rating`, `highlight`, `feedback`, `created_at`).
  - Add index on `organizer_email_logs(event_id, email_type)` and `(organiser_id, email_type)`.
  - Add RLS policies allowing organizers to view their own logs/reviews and admins to view all.
  - Add idempotent trigger helper functions.

- [ ] **Step 2: Verify migration validity**
  - Check SQL syntax and ensure safe idempotent execution (`IF NOT EXISTS`).

- [ ] **Step 3: Commit migration**

---

### Task 2: Polish & Modernize Monday Performance Digest Edge Function

**Files:**
- Modify: `supabase/functions/send-organizer-digest/index.ts`

- [ ] **Step 1: Update configuration & URL resolution**
  - Replace hardcoded `https://www.geteventrally.com` URLs with configurable `APP_URL` env variable (fallback `https://eventguru.ng`).
  - Ensure Resend sender uses `EVENTGURU_SENDER_EMAIL` or fallback to `EventGuru <updates@eventguru.ng>`.

- [ ] **Step 2: Apply brand typography & styling guidelines**
  - Strict high-contrast styling: Deep slate `#0F172A`, royal blue `#0058BE`, crisp borders `#E2E8F0`.
  - Premium monospace telemetry badges (`PAST 7 DAYS`, `WEEKLY REVENUE`, `TOTAL ATTENDEES`).
  - Curated growth playbook recommendations based on nearest event proximity.
  - Record each sent email in `organizer_email_logs`.

- [ ] **Step 3: Test and verify edge function**
  - Verify JSON error handling and mock delivery fallback when no Resend key is present.

- [ ] **Step 4: Commit changes**

---

### Task 3: Build Post-Event "Host Wrapped & Feedback Debrief" Edge Function

**Files:**
- Create: `supabase/functions/send-post-event-debrief/index.ts`
- Modify: `supabase/config.toml`

- [ ] **Step 1: Register function in `supabase/config.toml`**
  - Add `[functions.send-post-event-debrief]` with `verify_jwt = false` (supports cron / service key execution).

- [ ] **Step 2: Implement query logic for concluded events**
  - Select events where `end_date` (or `date`) is within past 48 hours and no `post_event_debrief` entry exists in `organizer_email_logs`.
  - Fetch event stats: total tickets, total registrations, total checked in, gate check-in percentage, and total gross revenue.

- [ ] **Step 3: Build high-contrast, responsive HTML email template**
  - Celebration header: *"You pulled it off! 🎉 Here is your [Event Title] Host Summary."*
  - Key performance cards: Checked In Attendees, Check-in Rate %, Gross Revenue (₦), Top Ticket Tier.
  - 1-click rating buttons (1 to 5 stars) linking to `${APP_URL}/review?event_id=${eventId}&rating=${n}`.
  - "Download Your Host Achievement Flyer" CTA linking to the dashboard.
  - "Plan Your Next Event" CTA.

- [ ] **Step 4: Handle Resend delivery and logging**
  - Send email via Resend API (or mock log if secret missing).
  - Insert record into `organizer_email_logs`.

- [ ] **Step 5: Commit changes**

---

### Task 4: Build In-App Host Summary & Professional Flyer Generator Component

**Files:**
- Create: `src/components/events/EventHostSummaryModal.tsx`
- Create: `src/components/events/HostAchievementFlyer.tsx`
- Modify: `src/pages/EventManagement.tsx` (or event dashboard detail page)

- [ ] **Step 1: Create `HostAchievementFlyer.tsx`**
  - Professional Nigerian event agency style: High contrast, clean editorial typography, sharp geometry.
  - Monochrome with Royal Blue accent `#0058BE` and deep black `#0F172A`.
  - Features:
    - Event Title & Category
    - Host / Convener Name
    - Date & Venue (Lagos, Abuja, or City, Nigeria)
    - Verified Host Stamp with Official EventGuru Seal
    - Key metrics: Total Attendees Hosted, Verified Ticket Admissions
    - Clean footer: `VERIFIED EVENT OPERATING SYSTEM • EVENTGURU.NG`
  - Zero AI slop, zero wavy gradients, zero sparkles. Pixel-perfect alignment for 1:1 or 4:5 Instagram/WhatsApp dimensions.

- [ ] **Step 2: Create `EventHostSummaryModal.tsx`**
  - Displays host wrap-up statistics: Gate check-in rate, total tickets, gross revenue.
  - Live preview of the Host Achievement Flyer.
  - 1-click "Download Flyer (PNG)" using `html2canvas`.
  - 1-click "Share to WhatsApp / Copy Link".

- [ ] **Step 3: Integrate modal button into Event Management page**
  - Show "Host Summary & Badge" button for past or active events.

- [ ] **Step 4: Commit changes**

---

### Task 5: Build 1-Click Review & Feedback Landing Route

**Files:**
- Create: `src/pages/OrganizerReview.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/pages/OrganizerReview.tsx`**
  - Reads `event_id` and `rating` from URL query parameters (`/review?event_id=...&rating=5`).
  - Pre-fills the selected star rating with interactive touch/click adjustments.
  - Simple 2-field form:
    - "What was the best part of hosting with EventGuru?"
    - "Anything we can improve for your next event?"
  - Submits to `organizer_reviews` table.
  - Shows instant celebratory confirmation with "Host Your Next Event" quick launcher.

- [ ] **Step 2: Register `/review` route in `src/App.tsx`**

- [ ] **Step 3: Verify and commit**

---

### Task 6: Add Scheduling Script & Admin Test Trigger

**Files:**
- Create: `supabase/SCHEDULED_JOBS.sql`
- Create or modify admin tools / scripts to test email generation on demand.

- [ ] **Step 1: Write `supabase/SCHEDULED_JOBS.sql`**
  - SQL snippet using `pg_cron` and `pg_net` to call `send-organizer-digest` (every Monday at 08:00 UTC) and `send-post-event-debrief` (daily at 09:00 UTC).
  - Detailed instructions for Supabase dashboard cron or alternative external crons (GitHub Actions / Vercel Cron).

- [ ] **Step 2: Commit script**

---

### Task 7: Build Verification & Final Checks

- [ ] **Step 1: Run TypeScript check and test runner**
  - `npm run build` to ensure no compile errors or missing types.
- [ ] **Step 2: Verify responsive email HTML rendering and edge function syntax**
- [ ] **Step 3: Deliver comprehensive walkthrough to user**

