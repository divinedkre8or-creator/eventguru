# Specification: Organizer Features Suite (Bulk SMS, Weekly Digest, User-Organizer Mode Switcher)

**Date:** 2026-10-10  
**Status:** Approved by User  
**Project:** EventGuru (`MYEVENTGURU`)  
**Scope:** 
1. User $\leftrightarrow$ Organizer Persona Switching & 1-Click Upgrade Flow.
2. Standalone Bulk SMS Contact Importer & Direct Broadcast (no event required).
3. Automated Weekly Organizer Event Report & Promotion Newsletter (No AI, standard editorial format).

---

## 1. System Overview & Architecture

This suite introduces three interconnected capabilities to EventGuru without modifying or breaking any live user data, ticket records, or wallet balances:

```
+--------------------------------------------------------------------------------+
|                               USER IDENTITY LAYER                              |
|                       (Supabase Auth + user_roles Table)                       |
+--------------------------------------------------------------------------------+
                                       |
              +------------------------+------------------------+
              |                                                 |
              v                                                 v
    [ATTENDEE MODE]                                    [ORGANIZER MODE]
    - Digital Ticket Wallet                            - Events & Ticketing Studio
    - Gate QR Passes                                   - Standalone Bulk SMS & Campaigns
    - Rally XP & Discover                              - Weekly Event Reports & Analytics
              |                                                 |
              +<======== [1-Click Mode Switcher] =============>+
                         (Desktop Header / Mobile Drawer)
```

---

## 2. Feature 1: User $\leftrightarrow$ Organizer Mode Switching & 1-Click Upgrade

### 2.1 Objectives
- Allow regular users (attendees) to activate Organizer privileges instantly without creating a separate account.
- Allow organizers who purchase tickets for external events to easily switch to Attendee mode to view their tickets and QR passes, and switch back to Organizer mode with one click.
- Maintain speed and zero disruption to live routes.

### 2.2 UI & Navigation Design
- **Desktop Top Navigation Header**:
  - Displays a mode switch button adjacent to the profile avatar:
    - In **Attendee Mode**: Shows `"⇄ Switch to Organizer"` (or `"🎪 Organize an Event"` if the user has not yet activated organizer role).
    - In **Organizer Mode**: Shows `"⇄ Switch to Attendee Mode"`.
- **Mobile Navigation Drawer (Hamburger Menu)**:
  - Cleanly placed at the **footer bottom of the drawer**:
    - High-visibility blue button: `"Switch to Organizer Mode"` / `"Switch to Attendee Mode"` / `"Organize an Event"`.
    - Ergonomic and thumb-friendly for one-handed mobile use.
- **Account Settings (`/dashboard/settings`)**:
  - Adds a dedicated *"Account Persona & Workspace"* card showing active mode and the ability to toggle or activate Organizer mode.

### 2.3 Data Layer & State Management
- `AuthContext`:
  - Tracks `activeMode: "attendee" | "organiser"`.
  - Persists preference in `localStorage` (`eventguru_active_mode_v1`). Defaults to `"organiser"` if user has organizer role, else `"attendee"`.
  - Method `switchMode(mode)` and `upgradeToOrganiser()`.
- `upgradeToOrganiser()`:
  - Inserts `{ user_id, role: 'organiser' }` into `user_roles`.
  - Updates in-memory roles and sets `activeMode = 'organiser'`.
  - Preserves all attendee tickets, registrations, and Rally score records.
- Route Guarding:
  - When in Attendee mode, `/dashboard` displays `AttendeeOverview`.
  - When in Organizer mode, `/dashboard` displays `OrganizerOverview`.
  - Navigating to `/dashboard/events`, `/dashboard/campaigns`, etc. automatically activates organizer mode if user has the role, or prompts the 1-click upgrade if they don't.

---

## 3. Feature 2: Standalone Bulk SMS Importer & Direct Broadcast

### 3.1 Objectives
- Enable organizers to import external contacts (CSV, Excel, or raw text) and send bulk SMS directly through their dashboard *without creating an event first*.
- Connect directly to the existing `organiser_wallets` and Textflow/Termii delivery pipeline.

### 3.2 Audience Selector in Campaign Studio (`/dashboard/campaigns`)
- Add an **Audience Source Selector**:
  - Option 1: **"Registered Event Attendees"** (existing behavior: choose event or all events).
  - Option 2: **"Import Contacts / Custom List"** (standalone mode: no event required).

### 3.3 Contact Import & Sanitization Engine
- **Input Channels**:
  1. **File Upload**: Supports `.csv` and `.txt`. Parses columns matching `phone`, `telephone`, `mobile`, `contact`, and optional `name` / `full_name`.
  2. **Direct Paste**: Multi-line textarea where users can paste numbers separated by commas, newlines, or spaces.
- **Smart Phone Number Normalization**:
  - Auto-normalizes Nigerian phone numbers:
    - `0803...` $\rightarrow$ `234803...`
    - `+234803...` $\rightarrow$ `234803...`
    - `070...`, `081...`, `090...`, `091...` handled properly.
  - Removes non-numeric characters, strips duplicates, and flags numbers with invalid digit counts (<10 or >14 digits).
  - Displays instant summary badges:
    - *Valid Unique Numbers*
    - *Duplicates Removed*
    - *Invalid Formats Skipped*
- **Saved Contact Lists (Optional Convenience)**:
  - Allow saving the imported list under a custom title (e.g. *"Youth Fellowship Leads"*, *"VIP Guests"*) for quick reuse.

### 3.4 SMS Dispatch, Pricing & Wallet Integration
- Uses existing `calculateSmsSegments` and `formatBrandedSms` utilities:
  - Live character and segment counter (160 chars per SMS, 153 chars for multi-part).
  - Displays total SMS units needed (`recipients * segments`).
  - Estimates total cost based on the existing tiered rates (₦10 standard rate, ₦9 for >100 units, ₦8 for >500 units).
  - Checks `organiser_wallets` balance. If insufficient, triggers the existing `MessagingWalletModal` (Paystack top-up).
- Backend dispatch:
  - Update `send-campaign` to support campaigns with `target_type = 'custom_list'`, taking recipients directly from payload/recipients table rather than querying `registrations`.

---

## 4. Feature 3: Weekly Event Organizer Newsletter & Performance Digest

### 4.1 Objectives
- Keep organizers regularly updated on their events with an automated weekly newsletter.
- Provide practical event promotion advice and weekly performance stats.
- **NO AI**: Standard, high-quality editorial email layout with deterministic metric calculations.

### 4.2 Newsletter Cadence & Targeting
- **Delivery Time**: Every Monday morning (e.g., 08:00 AM WAT).
- **Target Audience**: All registered event organizers.
- **Segmentation**:
  - **Organizers with Active Events**:
    - Performance summary: Total tickets sold, tickets sold in past 7 days, total revenue, countdown to event day.
    - Specific growth tips based on time until event (e.g. 30 days out: early bird pricing; 14 days out: viral DP campaign; 2 days out: SMS gate reminder).
  - **Organizers with No Active Events**:
    - Platform benchmark insights (e.g. "Most popular event days this month", "How to host high-conversion ticket sales").
    - Direct CTA button to create a new event.

### 4.3 Email Template Specifications
- Built with responsive HTML/CSS for universal email client compatibility (Gmail, Apple Mail, Outlook, mobile).
- Branding: `MYEVENTGURU™` header, clean typography, contrast stats cards, prominent CTA button back to the organizer dashboard.
- Unsubscribe compliance link included in footer.

### 4.4 In-App Companion Widget
- An unobtrusive *"Weekly Organizer Digest"* card on the top right of `/dashboard` (Organizer Overview).
- Shows the current week's tip and high-level weekly trajectory directly inside the app so organizers see it even if they do not open their email.

### 4.5 Super Admin Control (`/admin`)
- Add a *"Weekly Digest"* card in the Admin Overview / Email management panel:
  - Preview the template with sample data.
  - Test-send to admin email.
  - Trigger manual send to all organizers on demand.

---

## 5. Mobile Responsiveness & Speed Safeguards

1. **Zero Impact on Initial Bundle**:
   - Contact file parsing utilities are loaded on demand.
   - Mode switching uses client-side state without heavy rerenders.
2. **Mobile Drawer Layout**:
   - Mode switch button anchored at the drawer footer bottom (`p-3 bg-card border-t border-border mt-auto`).
   - Generous touch target (min 44px height) with active feedback.
3. **Data Integrity**:
   - No schema migrations break existing tables.
   - Backward compatible fallback for any user with existing roles.
