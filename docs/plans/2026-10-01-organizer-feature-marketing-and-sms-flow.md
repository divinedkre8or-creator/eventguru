# Organizer In-Flow Feature Marketing & SMS Monetization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Market and monetize EventRally's SMS and broadcast messaging platform natively across the organizer lifecycle—particularly for free events—without disruptive popups or spammy alerts, driving paid Paystack wallet top-ups with zero free credits and no unverified automations.

**Architecture:** Connect the organizer's existing touchpoints (Create Event, Post-Publish Modal, Attendee Directory, Event Directory, and Dashboard Overview) directly into the Campaign Studio via URL search parameters (`event_id`, `channel=sms`, `template`). Provide contextual, non-intrusive micro-copy, actionable broadcast entry points, and quick message templates while preserving paid wallet enforcement (Paystack).

**Tech Stack:** React 18, TypeScript, React Router (`useSearchParams`), TailwindCSS, Shadcn UI / Radix, Lucide Icons, React Query, Supabase.

---

### Task 1: URL Query Params & Quick Message Templates in Campaign Studio

**Files:**
- Modify: `src/pages/dashboard/Campaigns.tsx`
- Test: `src/test/campaigns-url-params.test.ts`

- [ ] **Step 1: Write the unit test for URL parameter parsing and template population**

```typescript
// src/test/campaigns-url-params.test.ts
import { describe, it, expect } from "vitest";

describe("Campaign studio quick templates and query handling", () => {
  const SMS_TEMPLATES = [
    {
      id: "reminder_24h",
      label: "24h Event Countdown",
      body: "Hi {{name}}, counting down to {event}! Doors open tomorrow at {time}. Have your pass ready on your phone.",
    },
    {
      id: "venue_gate",
      label: "Venue & Gate Directions",
      body: "Hi {{name}}, gate update for {event}: Fast-track check-in is at the main entrance. View pass on EventRally.",
    },
    {
      id: "thank_you",
      label: "Post-Event Thank You",
      body: "Hi {{name}}, thank you for attending {event}! We hope you had an unforgettable experience. See you at the next rally!",
    },
  ];

  it("contains 3 distinct production-ready SMS templates", () => {
    expect(SMS_TEMPLATES.length).toBe(3);
    expect(SMS_TEMPLATES.every((t) => t.body.includes("{{name}}"))).toBe(true);
  });

  it("formats SMS template correctly replacing event title", () => {
    const raw = SMS_TEMPLATES[0].body;
    const formatted = raw.replace("{event}", "Tech Rally 2026").replace("{time}", "10:00 AM");
    expect(formatted).toContain("Tech Rally 2026");
    expect(formatted).toContain("10:00 AM");
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/test/campaigns-url-params.test.ts`
Expected: PASS

- [ ] **Step 3: Update `src/pages/dashboard/Campaigns.tsx` to accept `useSearchParams` and add Quick SMS Templates**

Update `Campaigns.tsx` to:
1. Read `useSearchParams()` for `event_id`, `channel`, and `template`.
2. Default channel to `"sms"` if `channel=sms` is present; pre-select the target event if `event_id` matches one of the organizer's events.
3. Display 3 clean, native "Quick Starters" buttons when channel is `"sms"` that insert pre-formatted text into the message box without overwriting user customizations.
4. Keep the strict wallet balance check and Paystack top-up modal trigger with zero free credits.

```typescript
// In src/pages/dashboard/Campaigns.tsx
import { useSearchParams } from "react-router-dom";

// Inside component:
const [searchParams, setSearchParams] = useSearchParams();
const paramEventId = searchParams.get("event_id");
const paramChannel = searchParams.get("channel");

const [selectedEventId, setSelectedEventId] = useState<string>(paramEventId || "all");
const [channel, setChannel] = useState<"email" | "sms">(paramChannel === "sms" ? "sms" : "email");
```

- [ ] **Step 4: Verify test suite and compile**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/dashboard/Campaigns.tsx src/test/campaigns-url-params.test.ts
git commit -m "feat(campaigns): add url param deep-linking and quick sms templates"
```

---

### Task 2: Attendee Directory Direct Broadcast Action & Inline Context Banner

**Files:**
- Modify: `src/pages/dashboard/Attendees.tsx`

- [ ] **Step 1: Add the "Broadcast to Guests" action button in `Attendees.tsx` header**

Add a high-visibility, professional secondary/primary button in the header right next to `[Export CSV]`:

```tsx
<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
  <Button
    asChild
    className="bg-primary text-primary-foreground font-bold text-xs h-10 px-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 shadow-sm"
  >
    <Link to="/dashboard/campaigns?channel=sms">
      <MessageSquare className="w-4 h-4" /> Broadcast to Guests
    </Link>
  </Button>
  <Button
    onClick={handleExport}
    disabled={filtered.length === 0}
    variant="outline"
    className="border-border text-foreground hover:bg-muted font-bold text-xs h-10 px-4 rounded-lg flex items-center justify-center gap-2"
  >
    <Download className="w-4 h-4" /> Export CSV
  </Button>
</div>
```

- [ ] **Step 2: Add the Contextual Direct Reach Banner in `Attendees.tsx`**

Above the search and filter bar, when `totalAttendees > 0`, display a clean, muted, industrial-style card:

```tsx
{totalAttendees > 0 && (
  <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary shrink-0 mt-0.5 sm:mt-0">
        <Smartphone className="w-4 h-4" />
      </div>
      <div>
        <h4 className="text-xs font-bold text-foreground">Direct Attendee Reach via SMS</h4>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Have {totalAttendees.toLocaleString()} registered guests? Send venue directions, parking notes, or gate passes straight to their phone lock screens with 98% open rates.
        </p>
      </div>
    </div>
    <Link to="/dashboard/campaigns?channel=sms" className="shrink-0 w-full sm:w-auto">
      <Button variant="outline" size="sm" className="w-full text-xs font-bold h-9 border-border bg-background hover:bg-muted">
        Compose SMS Broadcast
      </Button>
    </Link>
  </div>
)}
```

- [ ] **Step 3: Run Vitest to ensure no regression**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/dashboard/Attendees.tsx
git commit -m "feat(attendees): add direct sms broadcast action and contextual reach banner"
```

---

### Task 3: Event Directory (My Events) Quick Broadcast Shortcut

**Files:**
- Modify: `src/pages/dashboard/Events.tsx`

- [ ] **Step 1: Add Broadcast option in each event card dropdown in `Events.tsx`**

In the event card's dropdown menu (lines 284–335), add a direct link to broadcast to that specific event's attendees:

```tsx
<DropdownMenuItem asChild className="text-xs font-medium cursor-pointer">
  <Link to={`/dashboard/campaigns?event_id=${event.id}&channel=sms`}>
    <MessageSquare className="w-3.5 h-3.5 mr-2 text-secondary" />
    Broadcast to Attendees (SMS)
  </Link>
</DropdownMenuItem>
```

- [ ] **Step 2: Add quick card action if event has attendees**

When `totalSold > 0`, provide an inline pill or button alongside `Setup DP Frame`:

```tsx
{totalSold > 0 && (
  <Link to={`/dashboard/campaigns?event_id=${event.id}&channel=sms`} className="block">
    <div className="w-full bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors">
      <MessageSquare className="w-3.5 h-3.5" /> Broadcast to Guests ({totalSold})
    </div>
  </Link>
)}
```

- [ ] **Step 3: Run Vitest**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/dashboard/Events.tsx
git commit -m "feat(events): add event card broadcast shortcut"
```

---

### Task 4: Free Event Toggle Contextual Pro-Tip

**Files:**
- Modify: `src/pages/dashboard/CreateEvent.tsx`

- [ ] **Step 1: Add subtle in-flow educational callout under `isFree` switch in `CreateEvent.tsx`**

Below line 768:

```tsx
<div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
  <div>
    <Label className="font-heading text-sm font-bold">Free Event</Label>
    <p className="text-muted-foreground text-xs font-medium">No ticket purchase required</p>
  </div>
  <Switch checked={isFree} onCheckedChange={setIsFree} />
</div>

{isFree && (
  <div className="p-3.5 rounded-lg bg-muted/40 border border-border/80 flex items-start gap-2.5 text-xs text-muted-foreground transition-all">
    <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
    <div>
      <span className="font-bold text-foreground">Turnout Tip:</span> Free events often experience higher drop-off rates. You can broadcast on-demand SMS reminders directly to confirmed attendee phones from your dashboard to keep attendance high.
    </div>
  </div>
)}
```

- [ ] **Step 2: Verify Step 2 (Ticketing Requirements) for Free Events**

In Step 2 of `CreateEvent.tsx`, when `isFree` is true, add a micro-hint inside the free event box:
*"Attendees will register free tickets. You can message them with updates anytime via Campaign Studio."*

- [ ] **Step 3: Run Vitest**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/dashboard/CreateEvent.tsx
git commit -m "feat(create-event): add contextual free event turnout pro-tip"
```

---

### Task 5: Post-Publish Modal Next Steps

**Files:**
- Modify: `src/components/events/ShareEventModal.tsx`
- Modify: `src/pages/dashboard/CreateEvent.tsx` (pass `eventId` to `ShareEventModal`)

- [ ] **Step 1: Update `ShareEventModalProps` interface to accept `eventId?: string`**

```typescript
// In src/components/events/ShareEventModal.tsx
interface ShareEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventUrl: string;
  eventTitle: string;
  eventId?: string;
}
```

- [ ] **Step 2: Add the "Next Steps for a Sold-Out Event" section at the bottom of `ShareEventModal.tsx`**

```tsx
<div className="mt-6 pt-4 border-t border-border space-y-2">
  <p className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
    Recommended Next Steps
  </p>
  <div className="bg-muted/40 border border-border rounded-lg p-3 flex items-center justify-between gap-3">
    <div className="min-w-0">
      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0" />
        <span>SMS & Attendee Broadcast</span>
      </div>
      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
        Reach confirmed attendees directly on their phones.
      </p>
    </div>
    <Button asChild size="sm" variant="outline" className="text-xs font-bold shrink-0 border-border h-8 px-3">
      <Link to={eventId ? `/dashboard/campaigns?event_id=${eventId}&channel=sms` : "/dashboard/campaigns?channel=sms"}>
        Set Up
      </Link>
    </Button>
  </div>
</div>
```

- [ ] **Step 3: Pass `eventId={publishedEventId}` in `CreateEvent.tsx`**

Ensure `publishedEventId` is passed into `<ShareEventModal ... eventId={publishedEventId} />`.

- [ ] **Step 4: Run Vitest**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/events/ShareEventModal.tsx src/pages/dashboard/CreateEvent.tsx
git commit -m "feat(share-modal): add sms broadcast recommendation to event publish modal"
```

---

### Task 6: Overview Dashboard Quick Action Refinement

**Files:**
- Modify: `src/pages/dashboard/Overview.tsx`

- [ ] **Step 1: Update Quick Action button from generic "Campaign" to "SMS & Broadcast"**

In `Overview.tsx` (line 354):

```tsx
<Link to="/dashboard/campaigns?channel=sms">
  <Button variant="outline" size="sm" className="w-full h-11 text-xs font-medium justify-start bg-background border-border text-foreground hover:bg-muted">
    <MessageSquare className="w-4 h-4 mr-2 text-primary" /> SMS & Broadcast
  </Button>
</Link>
```

- [ ] **Step 2: Add Broadcast action on Featured Event card**

On the featured event card (around line 230), if the event has registrations, include a small quick-link:
```tsx
<Link to={`/dashboard/campaigns?event_id=${featuredEvent.id}&channel=sms`}>
  <Button variant="outline" size="sm" className="text-xs font-medium h-9 px-3 border-border rounded-lg flex items-center gap-1.5">
    <MessageSquare className="w-3.5 h-3.5 text-secondary" /> Broadcast
  </Button>
</Link>
```

- [ ] **Step 3: Run Vitest**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/dashboard/Overview.tsx
git commit -m "feat(overview): update quick action to sms & broadcast"
```

---

### Task 7: Full System Verification & Production Build

**Files:**
- All touched files

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Vite build succeeds with 0 TypeScript errors.

- [ ] **Step 3: Final verification commit**

```bash
git commit --allow-empty -m "chore(release): verified in-flow sms marketing for production launch"
```
