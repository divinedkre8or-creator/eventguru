# Online Events, Custom Questions Builder, and Super Admin Security Plan

> **Goal:** Support physical vs. online events with community/WhatsApp redirect links, integrate a DIY Google Forms-style drag-and-drop custom questions builder for organizers, and scrape fragile API key inputs from the Super Admin panel to ensure maximum security.
> **Architecture:** Zero-downtime metadata packing + optional SQL migrations for full backward/forward database compatibility. Component-driven modular questions builder with Radix/Lucide UI tokens. Strict separation of physical vs. online attendee journeys.
> **Tech Stack:** React 18, TypeScript, Tailwind CSS, Supabase, Lucide icons, Vitest.

---

### Task Tracker & Progress

- [x] **Task 1: Scrap Super Admin API Keys UI & Harden Configuration**
  - Removed editable key inputs from Super Admin panel (`Settings.tsx`)
  - Replaced with read-only system integration status indicators and security overview
  - Ensured `platformSettings.ts` safely resolves from environment/defaults without brittle localStorage overrides

- [x] **Task 2: Define Shared Data Types, Metadata Helpers & SQL Migration**
  - Created `src/lib/eventMetadata.ts` with TypeScript types (`CustomQuestion`, `OnlineSettings`, etc.)
  - Implemented bidirectional parser/serializer with zero-downtime metadata packing
  - Created `src/test/eventMetadata.test.ts` with 100% passing test coverage
  - Created `supabase/migrations/20261001000000_online_events_and_custom_questions.sql`

- [x] **Task 3: Build Custom Questions DIY Builder Component**
  - Created `src/components/events/CustomQuestionsBuilder.tsx`
  - Supported question types: Short Text, Long Text, Multiple Choice, Dropdown, Checkboxes
  - Implemented reordering, required toggle, option choices editor, duplicate and delete actions
  - Integrated preset question templates ("Who invited you?", "Referral Source", etc.)

- [x] **Task 4: Update Event Creation & Edit Flow**
  - Updated `src/pages/dashboard/CreateEvent.tsx`
  - Added Event Modality selector (Physical 🏢 vs. Online 🌐)
  - Configured conditional inputs: Venue/City for physical; Meeting Link, WhatsApp/Community Redirect Link, and Auto-Redirect toggle for online
  - Embedded `CustomQuestionsBuilder` into wizard Step 2 and handled draft/edit hydration via `parseEventMetadata` and `serializeEventDescription`

- [x] **Task 5: Update Public Event Landing Page for Online Events**
  - Updated `src/pages/EventDetails.tsx`
  - Added "Online Event" badge beside category
  - Replaced physical venue box with Virtual Location card highlighting online access notice and WhatsApp community presence
  - Updated Schema.org structured metadata to emit `OnlineEventAttendanceMode` and `VirtualLocation`

- [x] **Task 6: Dynamic Attendee Checkout with Custom Questions**
  - Updated `src/components/events/CheckoutModal.tsx`
  - Integrated `parseEventMetadata` to dynamically extract custom questions and online configuration
  - Rendered dynamic form fields: text, textarea, select, radio buttons, and multi-checkboxes
  - Added strict client-side validation ensuring all required organizer questions are filled
  - Updated `src/lib/registrationService.ts` to accept `customAnswers` and persist with resilient live database fallback

- [x] **Task 7: Post-Registration Online Attendee Journey & Ticket Pass**
  - Updated `CheckoutModal.tsx` success screen with "Join WhatsApp Attendee Community" and "Open Online Event Room" CTAs
  - Implemented 5-second auto-redirect countdown with cancel / "Stay Here" option (active only when organizer configured `auto_redirect: true`)
  - Updated `src/components/tickets/DigitalTicketCard.tsx` with "EVENTRALLY ONLINE PASS", virtual location indicator, and tailored admission verification stub
  - Updated `src/pages/TicketView.tsx` with verified attendee Online Event Access Card
  - Updated `src/lib/emailService.ts` to include virtual session & WhatsApp community links directly in the ticket confirmation email

- [x] **Task 8: Attendee CRM Directory & Custom Questions CSV Export**
  - Updated `src/pages/dashboard/Attendees.tsx`
  - Added "Answers" column in the directory table displaying response count
  - Integrated "View Answers" modal with full question labels and attendee responses
  - Updated `handleExport` to dynamically include columns for all custom questions in CSV exports with RFC 4180 escaping

- [x] **Task 9: End-to-End Verification & System Integrity Check**
  - Ran full vitest test suite (`npm run test`): 100% tests passed
  - Ran TypeScript strict compiler checks (`npx tsc --noEmit`): 0 errors
  - Ran production distribution build (`npm run build`): Successfully built in 17.85s
  - Confirmed physical event flow remains 100% backward-compatible (zero regression)
