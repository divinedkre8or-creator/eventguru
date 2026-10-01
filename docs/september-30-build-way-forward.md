# September 30 Build Way Forward & Production Roadmap

> **Platform:** EventRally (eventguru)  
> **Date:** September 30 / October 1, 2026  
> **Status:** Live in Production — Active Users

---

## 1. Recently Completed & Committed Milestones (Commit: `aa2a10e`)
1. **Super Admin API Key Security:**
   - Scraped vulnerable client-editable key inputs (Paystack, Resend, Termii) from `src/pages/admin/Settings.tsx`.
   - Hardened `src/lib/platformSettings.ts` to strictly resolve from environment variables (`import.meta.env`) with safe fallbacks.
2. **Online vs. Physical Event Modalities:**
   - Added modality selector in `src/pages/dashboard/CreateEvent.tsx`.
   - Configurable meeting link (Zoom, Meet, YouTube Live), WhatsApp/community redirect link, and private access instructions.
   - Standard practice auto-redirect toggle (defaults to OFF; provides 5s countdown with cancel button if turned ON).
3. **DIY Custom Questions Builder:**
   - Component created at `src/components/events/CustomQuestionsBuilder.tsx` with presets and 5 field types.
   - Dynamic attendee rendering and validation in `src/components/events/CheckoutModal.tsx`.
4. **Post-Registration Pass & CRM:**
   - `src/components/tickets/DigitalTicketCard.tsx` and `src/pages/TicketView.tsx` render verified online attendee hubs.
   - `src/pages/dashboard/Attendees.tsx` includes an "Answers" column, an answer viewer modal, and RFC 4180 CSV export.
5. **Aesthetics & Code Cleanliness:**
   - Cleaned all emojis (no lightbulbs, globes, or speech bubble emojis) and removed all AI tropes (`Sparkles` icon) in favor of standard Lucide SVG icons.
   - Full Vitest test suite (`npm run test`) and strict TypeScript (`npx tsc --noEmit`) passing with 0 errors.

---

## 2. Strategic Roadmap & The Three Key Directions

### Direction 1: Enterprise Direct Email Infrastructure (Wholesale Reselling)
* **Goal:** Avoid reseller markups (Resend, SendGrid) and establish direct root cloud infrastructure.
* **Architecture:** **Amazon SES (Simple Email Service)**:
  - **Wholesale Price:** $0.10 per 1,000 emails ($0.0001/email).
  - **Monetization / Reselling:** EventRally acts as the master pool, debiting organizer wallet balances at standard rates (e.g. ₦5–₦10 per email), capturing 80%+ margins.
  - **Deliverability:** Custom domain DKIM, SPF, DMARC, dedicated IPs, bounce/complaint webhooks.
  - **Workload:** Powers transactional ticket passes and high-volume organizer broadcast marketing.

### Direction 2: SMS Delivery via Textflow.ng (Research & Integration Blueprint)
* **Official Provider:** [Textflow.ng](https://textflow.ng) (Replacing Termii)
* **Authentication:** Bearer token authentication:
  - Header: `Authorization: Bearer <TEXTFLOW_API_TOKEN>`
  - Format: `Accept: application/json`, `Content-Type: application/json`
* **Core API Endpoints:**
  1. `POST https://textflow.ng/api/v1/sms/send`:
     - Dispatches SMS to one or multiple recipients.
     - Payload:
       ```json
       {
         "sender_id": "EventRally",
         "recipients": "08012345678,08123456789",
         "message": "Your EventRally gate pass for Tech Summit is EVR-9982. Show at the entrance."
       }
       ```
     - Response (`202 Accepted`):
       ```json
       {
         "status": "success",
         "message": "Message sent successfully",
         "data": {
           "batch_id": 1452,
           "total_recipients": 2,
           "total_cost": 8.00,
           "balance_remaining": 492.00
         }
       }
       ```
  2. `GET https://textflow.ng/api/v1/balance`:
     - Retrieves account wallet balance.
     - Response: `{ "status": "success", "data": { "currency": "NGN", "balance": 500.00 } }`.
  3. `GET https://textflow.ng/api/v1/sender-ids`:
     - Returns approved alphanumeric sender IDs. Fallback sender ID: `"Textflow"`.
  4. `GET https://textflow.ng/api/v1/user`:
     - Returns developer account profile and approved senders.
  5. `GET https://textflow.ng/api/v1/sms/status?batch_id={id}`:
     - Returns delivery status (`completed`, `queued`, `failed`).
* **NCC & Sender ID Compliance:**
  - Sender IDs must be 3–11 alphanumeric characters (e.g. `EventRally`).
  - Requires pre-registration on Textflow.ng dashboard. System safely falls back to `"Textflow"` if unapproved.
* **Economics & Resale Margins:**
  - Wholesale cost: ₦4.00 – ₦6.40 per SMS unit.
  - Retail organizer price: ₦10.00 – ₦12.00 per SMS unit (debited from organizer wallet), delivering a ~50–60% gross profit margin.
* **Dual Pipeline Implementation:**
  1. *Transactional Gate Pass:* Dispatched to `phone` immediately upon successful attendee registration.
  2. *Broadcast Campaigns:* Dispatched from `supabase/functions/send-campaign` with bulk recipients.

### Direction 3: Mobile Navigation UI/UX Cleanup (Completed — Commit: `fea13df`)
* **Goal:** Clean up the mobile hamburger menu in `src/components/navigation/SiteHeader.tsx`.
* **Delivered:**
  - Removed bloated "PLATFORM CAPABILITIES" cards and `Sparkles` icons from the mobile drawer.
  - Replaced with a streamlined mobile menu: **Features** (`/features`), **Explore Events** (`/events`), **Guides & Resources** (`/guides`), **FAQ** (`/#faq`), and clean CTAs.

---

## 3. Bug Fix: Event Publish Runtime Error (Completed — Commit: `316c22e`)
* **Symptom:** User saw a red toast: `Cannot read properties of undefined (reading 'id')` when publishing an event.
* **Root Cause:**
  - In `src/pages/dashboard/CreateEvent.tsx`, lines 351 and 364 referenced `event.id` within ticket creation loops, but `event` was not in scope during submission.
  - Furthermore, relying on `insertRes.data.id` after insert was vulnerable to RLS select restrictions.
* **Resolution:**
  - Pre-generate UUID `newEventId = crypto.randomUUID()` before calling `supabase.from("events").insert()`.
  - Pass `id: newEventId` in event payload, and use `eventIdResult` reliably for `ticket_types.insert()`.
  - Tested with `vitest` and `tsc --noEmit` (0 errors).

---

## 4. UI/UX Fix: Checkout Modal Mobile Bottom Sheet & Question Visibility (Completed — Commit: `c78bb52`)
* **Issues Addressed:**
  1. **Missing Question Prompts:** Attendees only saw input answer boxes with no question text because `CheckoutModal` looked for `q.label` while the builder created `q.prompt`.
  2. **Mobile Dialog Cut-off & Missing Cancel Button:** The modal was too tall on mobile, with no viewport height ceiling or sticky headers, causing the header and `X` close button to be pushed off-screen.
* **Resolution:**
  - **Question Normalization:** Updated `parseEventMetadata` in `src/lib/eventMetadata.ts` to normalize all questions so that `q.prompt`, `q.label`, and `q.question` are guaranteed to exist.
  - **Prominent Question Rendering:** Rendered question prompts in bold with clear `* Required` badges.
  - **Mobile Bottom-Sheet Architecture:**
    - On mobile, modal mounts as a native-style slide-up bottom sheet (`items-end sm:items-center`, `rounded-t-3xl sm:rounded-2xl`, max height constrained to `92dvh`).
    - Top drag handle bar for mobile feel.
    - **Sticky Header with Permanent Cancel Button:** The header is `shrink-0` outside the scroll area, meaning the `X` button is ALWAYS visible on screen at all times.
    - **Smooth Inner Momentum Scrolling:** Uses `overflow-y-auto overscroll-contain touch-pan-y` so users can scroll through all fields without losing their header or footer.
    - **Pinned Sticky Action Footer:** The total amount and action button ("Confirm Free Registration" or "Pay ₦...") plus an explicit "Cancel" button are pinned at the bottom, so users never have to search or scroll to submit or dismiss.

---

## 5. Mobile Hamburger Header Simplification & Organizer Event Deletion (Completed — Commit: `52d33ca`)
* **Mobile Menu Streamlining:**
  - Placed the theme toggle button directly in the mobile top navigation bar right before the hamburger button.
  - Eliminated the cluttered, redundant `"APPEARANCE & THEME"` section inside the mobile drawer, making the drawer open directly into clean navigation links.
* **Organizer Event Cancellation (Delist) & Permanent Deletion:**
  - **Cancel / Delist Event:** Organizers can toggle event status to `cancelled` from both the event directory card actions (`src/pages/dashboard/Events.tsx`) and the event editor (`src/pages/dashboard/CreateEvent.tsx`). This immediately delists the event from public discovery.
  - **Re-Publish Event:** Cancelled events can be re-published back to active discovery at any time.
  - **Permanent Delete:** Organizers can permanently delete their events. Triggers a confirmation `AlertDialog` to prevent accidental clicks. Deleting an event delists it and cascades to delete associated ticket types and configurations.

---

## 6. Fix & Verification: Attendee Message & Custom Questions Bottom Sheet Display (Completed)
* **Problem Addressed:**
  - When users registered for an event, they were not seeing the organizer's notes/messages or the extra registration questions in the bottom sheet drawer.
  - Root causes identified:
    1. `parseEventMetadata` previously relied on sequential `.split()` calls that threw JSON parse errors if tags appeared out of order or if trailing tags were appended, discarding both custom questions and additional messages.
    2. If the Supabase database column `custom_questions` returned an empty array `[]` (table default), it was overriding the custom questions serialized in the description.
    3. `CheckoutModal` did not render the organizer's message (`meta.additionalInfo`) or online attendance instructions in the drawer.
    4. On mobile, questions were placed below contact fields without an explicit header badge or bottom clearance padding, making them easy to miss.
* **Resolution Implemented:**
  1. **Order-Agnostic Tag Parser (`src/lib/eventMetadata.ts`):**
     - Replaced fragile `.split()` with regex-based tag tokenization (`/\|\|\|([A-Z_]+)\|\|\|([\s\S]*?)(?=(?:\|\|\|[A-Z_]+\|\|\||$))/g`).
     - Safely parses JSON payloads without trailing delimiter contamination.
     - Preserves `cleanDescription` as all text preceding the first delimiter.
     - Hydrates `eventRow.custom_questions` from arrays or JSON strings, and safely falls back to description tags if the database column is empty `[]`.
  2. **Organizer Message Display (`src/components/events/CheckoutModal.tsx`):**
     - Rendered a dedicated "Message from Organizer" card right below the ticket summary card so attendees immediately see instructions before filling details.
     - Rendered an "Online Attendance Note" banner for virtual events.
  3. **Prominent Custom Questions UI in Bottom Sheet:**
     - Header displays an explicit badge: `{customQuestions.length} Questions` with `HelpCircle` icon.
     - Section divider clearly states `Organizer Questions ({count})` with `Required` or `Optional` label.
     - Every question is numbered (`#1`, `#2`) with bold prompt text, distinct input styling, and `* Required` badges.
     - Added `pb-8` bottom padding to ensure generous clearance above the pinned bottom action bar.
  4. **Comprehensive Unit Tests (`src/test/eventMetadata.test.ts`):**
     - Added tests for out-of-order tags, stringified JSON questions, empty array column fallback, and organizer notes.
     - All 7 tests passing.

---

## 7. Next Priorities
1. **Direction 2:** Textflow.ng SMS Integration (replacing Termii; configuring lookup and bulk/transactional SMS).
2. **Direction 1:** Amazon SES direct cloud root email infrastructure and organizer wallet unit-reselling.
