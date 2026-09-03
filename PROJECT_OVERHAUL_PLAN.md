# EVENTSTACK — PROJECT OVERHAUL MASTER PLAN & AGENT HANDOFF DOCUMENT

**Repository:** `c:\Users\Divine\Desktop\eventguru` (`dkre8or/eventstack`)  
**Status:** Planning & Ready for Design Input  
**Created:** September 2, 2026  

---

## 🎯 Executive Summary & Purpose

This document serves as the persistent single source of truth for the complete **Eventstack Platform Overhaul**. 

The goal of this initiative is to:
1. **Redesign the UI Entirely**: Apply incoming Stitch UI design references across all pages, layouts, and components.
2. **Migrate to New Supabase Backend**: Connect a new dedicated Supabase project with full database schema migrations, Row-Level Security (RLS) policies, and Deno Edge Functions.
3. **Refine Platform Copy**: Update marketing headlines, taglines, feature highlights, and call-to-actions.
4. **Preserve Core Functionalities**: Maintain 100% zero-regression on all existing features (Auth, Event Creation, Ticketing, Paystack Payments, Rapid Check-in, DP Generator, Admin Feedback).

---

## 📋 Pending Inputs Checklist (Required to Begin Execution)

- [ ] **Stitch UI Design Selection**: Pending user confirmation on the exact Stitch project/design reference.
- [ ] **New Supabase Credentials**:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (for Edge Functions)
- [ ] **Paystack Public Key**: `VITE_PAYSTACK_PUBLIC_KEY` (for production/test payments)
- [ ] **Resend API Key**: `RESEND_API_KEY` (for ticket email dispatches)

---

## 🔄 Flow-by-Flow Execution Matrix

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              FLOW TRACKING MATRIX                                      │
├────┬─────────────────────────────┬────────────────────────────────┬────────────────────┤
│ ID │ User Flow                   │ Target File Locations          │ Status             │
├────┼─────────────────────────────┼────────────────────────────────┼────────────────────┤
│ F1 │ Landing Page & Discovery    │ src/pages/Index.tsx            │ COMPLETED (Stitch) │
│ F2 │ Auth & Role Guard Routing   │ src/contexts/AuthContext.tsx   │ Active (Supabase)  │
│    │                             │ src/pages/Login.tsx, Signup.tsx│                    │
│ F3 │ Organiser Event Manager     │ src/pages/dashboard/           │ COMPLETED (Stitch) │
│    │                             │   Overview, Events, Tickets    │                    │
│ F4 │ Public Event & Checkout     │ src/pages/EventDetails.tsx     │ Pending            │
│    │                             │ src/components/events/         │                    │
│    │                             │   CheckoutModal.tsx            │                    │
│ F5 │ Rapid Venue Check-in        │ src/pages/dashboard/Checkin.tsx│ COMPLETED (Stitch) │
│ F6 │ Interactive DP Builder      │ src/pages/dashboard/DPGen.tsx  │ COMPLETED (Stitch) │
│    │ & Attendee Flyer Generator  │ src/pages/DPAttendeeView.tsx   │                    │
│ F7 │ Super Admin & Feedback      │ src/pages/admin/               │ Pending            │
│    │                             │   FeedbackList.tsx             │                    │
└────┴─────────────────────────────┴────────────────────────────────┴────────────────────┘
```

---

## 🛠️ Tech Stack & Key File References

* **Frontend:** React 18, TypeScript, Vite 5, Tailwind CSS, Radix UI, Lucide Icons.
* **Routing & Data Fetching:** React Router DOM (v6), TanStack Query (v5), React Context (`AuthContext.tsx`).
* **Database & Edge Functions:** Supabase JS v2 client (`src/integrations/supabase/client.ts`), Deno Edge Function (`supabase/functions/send-ticket/index.ts`).
* **Payments:** Paystack inline checkout (`react-paystack`).
* **Flyer Rendering:** `html2canvas` and `react-rnd`.

---

## 🚀 Execution Steps for Future Agents / Developers

When resuming work:

1. **Verify Design Input**: Read the specified Stitch design tokens (colors, typography, rounded corners, borders, shadows).
2. **Configure Environment**: Update `.env` with new Supabase project credentials.
3. **Database Schema Verification**: Apply migrations from `supabase/migrations/` to the new Supabase instance.
4. **Flow-by-Flow Overhaul**: Update UI layout & styling in order of flows F1 $\rightarrow$ F7.
5. **Quality Assurance Gate**:
   - Run `npm run build` to verify zero build errors.
   - Run `npm run lint` to fix any syntax/type warnings.
   - Run `npm run test` for unit tests.

---

## ⚠️ Non-Negotiable Rules for Agents

1. **Do Not Break Core Logic**: Keep all Supabase query logic, state handlers, Paystack hooks, and check-in mutations intact during UI refactoring.
2. **Preserve Database Contracts**: Do not modify table schema column names without updating `src/integrations/supabase/types.ts`.
3. **No Secret Printing**: Never log or commit secret environment variables.
4. **Verification Required**: Never declare a flow completed without running `npm run build` and testing the flow end-to-end.
