# Organizer Features Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Organizer Features Suite for EventGuru: (1) User $\leftrightarrow$ Organizer persona switcher and 1-click upgrade, (2) Standalone Bulk SMS contact importer & broadcast, and (3) Automated weekly organizer performance digest & promotion newsletter (Standard HTML, no AI).

**Architecture:** Client-side workspace persona toggle in `AuthContext` with desktop header pill and mobile drawer footer button; CSV/paste contact parser in `Campaigns.tsx` connected to `organiser_wallets` and `send-campaign`; and a Resend-powered standard editorial weekly newsletter function with in-dashboard digest widget and admin controls.

**Tech Stack:** React, TypeScript, Tailwind CSS, Supabase (Auth, Postgres, Edge Functions / Deno), Textflow/Termii SMS APIs, Resend Email API, Lucide Icons.

---

### Task 1: AuthContext Dual Persona & 1-Click Upgrade Logic

**Files:**
- Modify: `src/contexts/AuthContext.tsx`
- Test: Vitest / React unit check

- [ ] **Step 1: Define `ActiveWorkspaceMode` and extend `AuthContextType`**
Add `activeMode: "attendee" | "organiser"`, `switchMode: (mode: "attendee" | "organiser") => void`, and `upgradeToOrganiser: () => Promise<{ success: boolean; error: string | null }>` to `AuthContextType`.

- [ ] **Step 2: Implement persistent mode state and upgrade function**
```typescript
const ACTIVE_MODE_KEY = "eventguru_active_workspace_mode_v1";

function getInitialMode(roles: AppRole[]): "attendee" | "organiser" {
  try {
    const saved = localStorage.getItem(ACTIVE_MODE_KEY);
    if (saved === "attendee" || saved === "organiser") return saved;
  } catch {}
  return roles.includes("organiser") || roles.includes("admin") ? "organiser" : "attendee";
}
```
Implement `upgradeToOrganiser`:
Inserts `{ user_id: user.id, role: 'organiser' }` into `user_roles`.
Updates `roles` state to include `"organiser"`.
Sets `activeMode` to `"organiser"` and saves to `localStorage`.

- [ ] **Step 3: Export mode state and actions in Provider**
Provide `activeMode`, `switchMode`, and `upgradeToOrganiser` across `AuthProvider`.

- [ ] **Step 4: Commit**
```bash
git add src/contexts/AuthContext.tsx
git commit -m "feat(auth): add activeMode workspace state and upgradeToOrganiser action"
```

---

### Task 2: Desktop Header & Mobile Drawer Mode Switcher UI

**Files:**
- Modify: `src/layouts/DashboardLayout.tsx`
- Modify: `src/pages/dashboard/Overview.tsx`
- Create: `src/components/navigation/WorkspaceModeSwitcher.tsx`

- [ ] **Step 1: Create reusable `WorkspaceModeSwitcher` component**
Renders desktop pill and mobile drawer button variations:
- Desktop: Header button with bidirectional arrows icon (`⇄ Switch to Organizer` / `⇄ Switch to Attendee Mode` / `🎪 Organize an Event`).
- Mobile Drawer Footer: High-contrast blue button anchored at the bottom of the navigation drawer (`Switch to Organizer Mode` / `Switch to Attendee Mode`).
- If user is not yet an organizer, triggers an upgrade confirmation modal that calls `upgradeToOrganiser()`.

- [ ] **Step 2: Update `DashboardLayout.tsx`**
- Mount `WorkspaceModeSwitcher` in desktop top header next to the theme toggle.
- Mount `WorkspaceModeSwitcher` in mobile drawer at the footer bottom (`mt-auto border-t border-border p-3`).
- Update the route guard: if user is in `attendee` mode and navigates to `/dashboard`, render `AttendeeOverview`; if in `organiser` mode, render `Overview`.
- If an attendee directly visits organizer subroutes (e.g. `/dashboard/events`), offer instant 1-click organizer activation.

- [ ] **Step 3: Test mobile responsiveness and desktop toggle transitions**
Verify switcher appears correctly on mobile viewports (<768px) and desktop viewports.

- [ ] **Step 4: Commit**
```bash
git add src/components/navigation/WorkspaceModeSwitcher.tsx src/layouts/DashboardLayout.tsx src/pages/dashboard/Overview.tsx
git commit -m "feat(ui): add desktop header and mobile drawer workspace mode switcher"
```

---

### Task 3: Standalone Bulk SMS Contact Importer & Sanitizer

**Files:**
- Create: `src/lib/contactSanitizer.ts`
- Create: `src/components/campaigns/ContactImporter.tsx`
- Modify: `src/pages/dashboard/Campaigns.tsx`

- [ ] **Step 1: Implement `contactSanitizer.ts` phone normalization engine**
Normalizes numbers:
- Converts `080...`, `070...`, `081...`, `090...`, `091...` to `234...`.
- Strips non-digit characters.
- Detects and removes duplicates.
- Validates lengths (10 to 14 digits).
- Returns `{ validRecipients: { phone: string; name: string }[], duplicateCount: number, invalidCount: number }`.

- [ ] **Step 2: Create `ContactImporter.tsx`**
Provides two tabs:
1. File Upload (`.csv`, `.txt` drag-and-drop file parser).
2. Direct Raw Paste (multi-line textarea parsing comma/newline/space separated lists).
Displays real-time stats chips: Valid Contacts, Duplicates Filtered, Invalid Skipped.

- [ ] **Step 3: Integrate with `Campaigns.tsx`**
Add an audience source toggle in `Campaigns.tsx`:
- `[ Event Attendees | Custom / Imported Contacts ]`.
- When in "Custom / Imported Contacts" mode:
  - Bypasses event selection requirement.
  - Feeds imported phone numbers into live SMS counter and SMS lock-screen preview.
  - Calculates estimated cost using existing tiered rates and checks `currentSmsBalance`.

- [ ] **Step 4: Commit**
```bash
git add src/lib/contactSanitizer.ts src/components/campaigns/ContactImporter.tsx src/pages/dashboard/Campaigns.tsx
git commit -m "feat(sms): implement standalone bulk contact importer and direct audience toggle"
```

---

### Task 4: Backend Standalone SMS Dispatch Support in `send-campaign`

**Files:**
- Modify: `supabase/functions/send-campaign/index.ts`

- [ ] **Step 1: Add `target_type` support in `send-campaign`**
Support `target_type: "custom_list" | "event"`.
If `target_type === "custom_list"`:
- Accept `recipients: { contact: string; name?: string }[]` directly.
- Normalize and stage in `campaign_recipients`.
- Skip querying the `events` or `registrations` tables.

- [ ] **Step 2: Ensure wallet balance check and debiting work identically**
Validates that wallet balance $\ge$ needed cost, dispatches via Textflow/Termii, debits wallet, and logs transaction in `wallet_transactions`.

- [ ] **Step 3: Commit**
```bash
git add supabase/functions/send-campaign/index.ts
git commit -m "feat(campaigns): support standalone custom contact list dispatch in send-campaign edge function"
```

---

### Task 5: Weekly Organizer Event Performance Digest (Standard Newsletter, No AI)

**Files:**
- Create: `supabase/functions/send-organizer-digest/index.ts`
- Create: `src/lib/newsletterTips.ts`

- [ ] **Step 1: Create curated weekly event growth playbook tips (`src/lib/newsletterTips.ts`)**
Deterministic, battle-tested organizer promotional strategies (No AI):
- 4 weeks out: Early-bird pricing & speaker teasers.
- 2 weeks out: Custom Event DP generator campaign for WhatsApp statuses.
- 1 week out: Flash promotion & group ticket bundle.
- 48 hours out: SMS gate reminder & fast-track check-in directions.
- Post-event: Thank-you SMS and community retention.

- [ ] **Step 2: Build `send-organizer-digest` Edge Function**
- Queries all organizers with active events.
- Calculates tickets sold in the past 7 days, total revenue, and countdown to event.
- Formats standard, high-contrast, responsive HTML email newsletter (`MYEVENTGURU™ Organizer Weekly`).
- Includes unsubscribe link and direct dashboard CTA button.
- Sends via Resend API to organizers.

- [ ] **Step 3: Commit**
```bash
git add supabase/functions/send-organizer-digest/index.ts src/lib/newsletterTips.ts
git commit -m "feat(newsletter): create weekly organizer event digest edge function and newsletter tips"
```

---

### Task 6: In-App Weekly Digest Widget & Super Admin Controls

**Files:**
- Modify: `src/pages/dashboard/Overview.tsx`
- Modify: `src/pages/admin/Overview.tsx`
- Create: `src/components/dashboard/WeeklyDigestWidget.tsx`

- [ ] **Step 1: Create `WeeklyDigestWidget.tsx`**
Renders a compact, high-contrast card on the Organizer Overview displaying:
- Current week's growth playbook tip.
- Quick link to launch a 48h SMS broadcast or generate DP flyer.

- [ ] **Step 2: Add Weekly Newsletter Controls in Super Admin Portal**
In `/admin`, add an action card to preview the newsletter template and trigger a test or broadcast send to organizers.

- [ ] **Step 3: Commit**
```bash
git add src/components/dashboard/WeeklyDigestWidget.tsx src/pages/dashboard/Overview.tsx src/pages/admin/Overview.tsx
git commit -m "feat(digest): add in-app weekly digest widget and super admin trigger controls"
```

---

### Task 7: Full Verification, Mobile Audit & Build Test

**Files:**
- Test all modified files across project

- [ ] **Step 1: Run project typecheck and production build**
Execute `npm run build` to verify there are zero TypeScript or bundling errors.

- [ ] **Step 2: Mobile responsiveness audit**
Verify drawer button alignment, touch targets, and campaign importer on mobile dimensions.

- [ ] **Step 3: Commit & Final Verification Report**
```bash
git commit -am "chore: complete verification for organizer features suite"
```
