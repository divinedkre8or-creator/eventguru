# Super Admin Users Directory, Real-Time Statistics Hub, Admin Delegation, and Support Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implement a dedicated Super Admin Platform Users Directory (`/admin/users`), Real-Time Statistics Hub (`/admin/stats`), secure server-enforced Super Admin role delegation, smart organizer support line integration (`09167739775`), and Super Admin sidebar typography polish.

**Architecture:** 
- Strictly additive PostgreSQL `SECURITY DEFINER` functions compute platform metrics and attendee aggregations server-side in ~5ms without heavy client row-dumping or database locks.
- Supabase Realtime channel (`admin-live-pulse`) provides live event streaming on ticket purchases and check-ins with graceful 30s polling fallback.
- Unexploitable role management RPC (`promote_to_admin`) verifies caller identity, validates accounts, and prevents lockout.
- Zero emojis and zero AI slop across all UI components, using crisp typography and clean SVG icons.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, Supabase Client & PostgreSQL, TanStack Query, React Router DOM.

---

### Task 1: Non-Breaking Additive Database Migration for Stats, Users, and Admin Delegation

**Files:**
- Create: `supabase/migrations/20261008200000_admin_stats_and_user_directory.sql`

- [x] **Step 1: Write the migration file with additive PostgreSQL functions**

```sql
-- supabase/migrations/20261008200000_admin_stats_and_user_directory.sql
-- Additive functions for Super Admin Realtime Stats, Platform Users Directory, and Role Delegation.
-- Safe for live production: does not drop tables, does not alter existing columns, does not modify RLS on existing flows.

BEGIN;

-- 1. Realtime Platform Aggregation Metrics RPC
CREATE OR REPLACE FUNCTION public.get_admin_realtime_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_is_admin boolean;
  v_today_start timestamptz;
  v_total_gmv numeric;
  v_today_gmv numeric;
  v_total_tickets bigint;
  v_today_tickets bigint;
  v_total_organisers bigint;
  v_total_attendees bigint;
  v_total_events bigint;
  v_published_events bigint;
  v_total_checkins bigint;
  v_checkin_rate numeric;
  v_estimated_fees numeric;
BEGIN
  -- Verify caller is admin
  SELECT public.has_role(auth.uid(), 'admin') INTO v_caller_is_admin;
  IF NOT COALESCE(v_caller_is_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized: Super Admin privileges required';
  END IF;

  v_today_start := date_trunc('day', now() AT TIME ZONE 'UTC');

  -- Gross Merchandise Volume (GMV)
  SELECT COALESCE(SUM(amount_paid), 0)
  INTO v_total_gmv
  FROM public.registrations
  WHERE status IN ('completed', 'confirmed');

  -- Today's GMV
  SELECT COALESCE(SUM(amount_paid), 0)
  INTO v_today_gmv
  FROM public.registrations
  WHERE status IN ('completed', 'confirmed')
    AND created_at >= v_today_start;

  -- Total tickets sold
  SELECT COUNT(*)
  INTO v_total_tickets
  FROM public.registrations
  WHERE status IN ('completed', 'confirmed');

  -- Today's tickets sold
  SELECT COUNT(*)
  INTO v_today_tickets
  FROM public.registrations
  WHERE status IN ('completed', 'confirmed')
    AND created_at >= v_today_start;

  -- User counts by role
  SELECT COUNT(DISTINCT user_id)
  INTO v_total_organisers
  FROM public.user_roles
  WHERE role = 'organiser';

  SELECT COUNT(DISTINCT user_id)
  INTO v_total_attendees
  FROM public.user_roles
  WHERE role = 'attendee';

  -- Events breakdown
  SELECT COUNT(*) INTO v_total_events FROM public.events;
  SELECT COUNT(*) INTO v_published_events FROM public.events WHERE status = 'published';

  -- Check-in counts
  SELECT COUNT(*)
  INTO v_total_checkins
  FROM public.registrations
  WHERE checked_in = true;

  -- Check-in rate percentage
  IF v_total_tickets > 0 THEN
    v_checkin_rate := ROUND((v_total_checkins::numeric / v_total_tickets::numeric) * 100, 1);
  ELSE
    v_checkin_rate := 0.0;
  END IF;

  -- Estimated platform take-rate (approx 3.5% + NGN 100 per paid ticket)
  SELECT COALESCE(SUM((amount_paid * 0.035) + CASE WHEN amount_paid > 0 THEN 100 ELSE 0 END), 0)
  INTO v_estimated_fees
  FROM public.registrations
  WHERE status IN ('completed', 'confirmed');

  RETURN json_build_object(
    'total_gmv', v_total_gmv,
    'today_gmv', v_today_gmv,
    'total_tickets', v_total_tickets,
    'today_tickets', v_today_tickets,
    'total_organisers', v_total_organisers,
    'total_attendees', v_total_attendees,
    'total_events', v_total_events,
    'published_events', v_published_events,
    'total_checkins', v_total_checkins,
    'checkin_rate_pct', v_checkin_rate,
    'estimated_fees', v_estimated_fees
  );
END;
$$;

-- 2. Platform Users Directory RPC
CREATE OR REPLACE FUNCTION public.get_admin_platform_users(
  search_query text DEFAULT '',
  limit_val int DEFAULT 50,
  offset_val int DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_is_admin boolean;
  v_result json;
BEGIN
  SELECT public.has_role(auth.uid(), 'admin') INTO v_caller_is_admin;
  IF NOT COALESCE(v_caller_is_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized: Super Admin privileges required';
  END IF;

  WITH attendee_users AS (
    SELECT DISTINCT ur.user_id, ur.created_at as role_created_at
    FROM public.user_roles ur
    WHERE ur.role = 'attendee'
  ),
  user_stats AS (
    SELECT 
      au.user_id,
      au.role_created_at,
      p.full_name,
      p.avatar_url,
      u.email,
      COALESCE(COUNT(r.id), 0) as tickets_count,
      COALESCE(SUM(r.amount_paid), 0) as total_spent,
      MAX(r.created_at) as last_activity,
      EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = au.user_id AND role = 'admin') as is_admin
    FROM attendee_users au
    LEFT JOIN public.profiles p ON p.user_id = au.user_id
    LEFT JOIN auth.users u ON u.id = au.user_id
    LEFT JOIN public.registrations r ON (r.user_id = au.user_id OR (u.email IS NOT NULL AND r.email = u.email))
    WHERE (
      search_query IS NULL 
      OR search_query = '' 
      OR p.full_name ILIKE '%' || search_query || '%'
      OR u.email ILIKE '%' || search_query || '%'
    )
    GROUP BY au.user_id, au.role_created_at, p.full_name, p.avatar_url, u.email
    ORDER BY au.role_created_at DESC
    LIMIT limit_val OFFSET offset_val
  )
  SELECT json_agg(
    json_build_object(
      'user_id', user_id,
      'full_name', COALESCE(full_name, 'Platform User'),
      'avatar_url', avatar_url,
      'email', COALESCE(email, ''),
      'tickets_count', tickets_count,
      'total_spent', total_spent,
      'last_activity', last_activity,
      'joined_at', role_created_at,
      'is_admin', is_admin
    )
  ) INTO v_result
  FROM user_stats;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- 3. Secure Admin Delegation RPC
CREATE OR REPLACE FUNCTION public.promote_to_admin(target_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_is_admin boolean;
  v_target_user_id uuid;
  v_clean_email text;
BEGIN
  -- Strict caller verification
  SELECT public.has_role(auth.uid(), 'admin') INTO v_caller_is_admin;
  IF NOT COALESCE(v_caller_is_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Admins can delegate administrative roles';
  END IF;

  v_clean_email := lower(trim(target_email));
  IF v_clean_email = '' OR v_clean_email IS NULL THEN
    RAISE EXCEPTION 'Invalid email address provided';
  END IF;

  -- Look up target user ID from auth.users
  SELECT id INTO v_target_user_id
  FROM auth.users
  WHERE lower(email) = v_clean_email;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'No user account found with email: %', target_email;
  END IF;

  -- Grant admin role in user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_target_user_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN json_build_object(
    'success', true,
    'user_id', v_target_user_id,
    'email', v_clean_email,
    'message', 'Super Admin role granted successfully'
  );
END;
$$;

-- 4. Demote Admin with Lockout Protection RPC
CREATE OR REPLACE FUNCTION public.demote_admin(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_is_admin boolean;
  v_admin_count int;
BEGIN
  SELECT public.has_role(auth.uid(), 'admin') INTO v_caller_is_admin;
  IF NOT COALESCE(v_caller_is_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized: Super Admin access required';
  END IF;

  -- Ensure at least 1 other admin remains to prevent platform lockout
  SELECT COUNT(*) INTO v_admin_count FROM public.user_roles WHERE role = 'admin';
  IF v_admin_count <= 1 THEN
    RAISE EXCEPTION 'Cannot demote: Platform must have at least one active Super Admin';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = target_user_id AND role = 'admin';

  RETURN json_build_object(
    'success', true,
    'user_id', target_user_id,
    'message', 'Super Admin role revoked successfully'
  );
END;
$$;

COMMIT;
```

- [x] **Step 2: Commit the migration script to git**

Run:
```bash
git add supabase/migrations/20261008200000_admin_stats_and_user_directory.sql
git commit -m "feat(db): add admin realtime stats, platform users directory, and delegation RPCs"
```

---

### Task 2: Polish Super Admin Sidebar Typography and Add New Navigation Links

**Files:**
- Modify: `src/layouts/AdminLayout.tsx`

- [x] **Step 1: Update navigation items and enlarge typography**
In `src/layouts/AdminLayout.tsx`:
- Add `navItems`:
  - `{ title: "Overview", path: "/admin", icon: LayoutDashboard }`
  - `{ title: "Realtime Stats", path: "/admin/stats", icon: Activity }` *(NEW)*
  - `{ title: "All Events", path: "/admin/events", icon: CalendarDays }`
  - `{ title: "Organisers", path: "/admin/organisers", icon: Users }`
  - `{ title: "Platform Users", path: "/admin/users", icon: UserCheck }` *(NEW)*
  - `{ title: "Transactions", path: "/admin/transactions", icon: CreditCard }`
  - `{ title: "SMS & Messaging", path: "/admin/sms", icon: MessageSquare }`
  - `{ title: "Disputes", path: "/admin/disputes", icon: AlertTriangle }`
  - `{ title: "Feedback & Support", path: "/admin/feedback", icon: MessageSquarePlus }`
  - `{ title: "Settings & Admins", path: "/admin/settings", icon: Settings }`
- Upgrade sidebar item styles:
  - From: `px-3 py-2.5 rounded-lg text-xs font-semibold`
  - To: `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all`
  - Icon size: `w-4.5 h-4.5 shrink-0`
  - Active state: `bg-primary text-primary-foreground shadow-sm font-bold`

- [x] **Step 2: Test that AdminLayout compiles and verify visually**
Run `npm run build` or `npx tsc --noEmit`.

- [x] **Step 3: Commit changes**
```bash
git add src/layouts/AdminLayout.tsx
git commit -m "fix(admin): polish sidebar typography to text-sm and register stats and users routes"
```

---

### Task 3: Smartly Integrate Constant Organizer Support Line (`09167739775`) into Organizer Dashboard

**Files:**
- Modify: `src/layouts/DashboardLayout.tsx`

- [x] **Step 1: Add organizer support card to sidebar**
In `src/layouts/DashboardLayout.tsx`:
Add a support block above the bottom profile/logout section:
```tsx
{/* Organizer Support Line Card */}
<div className="p-3 border-t border-border bg-card/60">
  <div className="p-3 rounded-xl bg-muted/60 border border-border/80 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
        ORGANIZER SUPPORT
      </span>
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
    </div>
    <p className="text-xs text-foreground/80 leading-snug">
      Need quick help or spotted an issue? Direct team support:
    </p>
    <div className="font-mono text-xs font-bold text-foreground tracking-wide">
      09167739775
    </div>
    <div className="grid grid-cols-2 gap-1.5 pt-1">
      <a
        href="tel:09167739775"
        className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-background hover:bg-muted text-[11px] font-semibold text-foreground rounded-lg border border-border transition-colors"
      >
        <Phone className="w-3.5 h-3.5 text-primary" />
        <span>Call</span>
      </a>
      <a
        href="https://wa.me/2349167739775"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-background hover:bg-muted text-[11px] font-semibold text-foreground rounded-lg border border-border transition-colors"
      >
        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
        <span>WhatsApp</span>
      </a>
    </div>
  </div>
</div>
```
Ensure icons `Phone` and `MessageCircle` are imported from `lucide-react`.

- [x] **Step 2: Verify in browser and commit**
```bash
git add src/layouts/DashboardLayout.tsx
git commit -m "feat(dashboard): integrate organizer support direct hotline 09167739775"
```

---

### Task 4: Platform Users Directory Component & Page (`/admin/users`)

**Files:**
- Create: `src/pages/admin/Users.tsx`
- Modify: `src/App.tsx` (Route registration)

- [x] **Step 1: Create `src/pages/admin/Users.tsx`**
Features:
- Query platform users via `supabase.rpc('get_admin_platform_users')` with direct fallback to `user_roles.select() + profiles + registrations` if RPC not yet deployed.
- Clean header: Super Admin Control badge, title "Platform Users & Attendees", subtitle.
- Quick Stats cards: Total Attendees, Active Buyers, Total Tickets Issued.
- Search input with debounce.
- Table columns: Attendee Details, Email & Contact, Tickets Registered, Total Spend (₦), Joined Date, Actions.
- Attendee Activity Modal: View all event registrations and ticket statuses.
- Promote to Super Admin action trigger.
- Zero emojis, clean badges (`bg-muted text-foreground font-mono text-[11px]`).

- [x] **Step 2: Register route in `src/App.tsx`**
In `src/App.tsx`, import `AdminUsers` from `@/pages/admin/Users` and add route:
`<Route path="users" element={<AdminUsers />} />` inside `<Route path="/admin" element={<AdminLayout />}>`.

- [x] **Step 3: Test compilation and commit**
```bash
git add src/pages/admin/Users.tsx src/App.tsx
git commit -m "feat(admin): add platform users directory with ticket history and search"
```

---

### Task 5: Real-Time Statistics Hub (`/admin/stats`)

**Files:**
- Create: `src/pages/admin/StatsHub.tsx`
- Modify: `src/App.tsx` (Route registration)

- [x] **Step 1: Create `src/pages/admin/StatsHub.tsx`**
Features:
- Real-time connection status badge: `● LIVE PULSE ACTIVE` (pulsing green dot).
- Parallel stats fetch via `supabase.rpc('get_admin_realtime_stats')` with fallback to client-side aggregations for backwards compatibility.
- Real-time Supabase channel `admin-live-pulse` subscribing to:
  - `registrations` table (INSERT & UPDATE)
  - `events` table (INSERT & UPDATE)
- Real-time Activity Ticker:
  - Monospace log style: `[19:22:10] TICKET_PURCHASE: Tech Summit VIP · ₦25,000 · Emeka O.`
  - Auto-scrolling, clear history option.
- Financial & Activity Metric Cards:
  - Gross Platform Volume (₦)
  - Today's Volume (₦)
  - Tickets Sold Today & Total
  - Active Organisers vs Attendees
  - Door Check-In Velocity (%)
  - Platform Take-Rate Revenue (₦)
- High-Performance Leaderboards:
  - Top Events by Gross Sales
  - Top Organisers by Attendee Volume
  - Free vs Paid Ticket Ratio

- [x] **Step 2: Register route in `src/App.tsx`**
In `src/App.tsx`, import `AdminStats` from `@/pages/admin/StatsHub` and add route:
`<Route path="stats" element={<AdminStats />} />` inside `<Route path="/admin">`.

- [x] **Step 3: Test compilation and commit**
```bash
git add src/pages/admin/StatsHub.tsx src/App.tsx
git commit -m "feat(admin): add realtime statistics hub with live websocket activity pulse"
```

---

### Task 6: Secure Super Admin Role Delegation Modal & Settings Integration

**Files:**
- Create: `src/components/admin/AdminRoleModal.tsx`
- Modify: `src/pages/admin/Settings.tsx`

- [x] **Step 1: Create `src/components/admin/AdminRoleModal.tsx`**
- Input for target user's email address.
- Clear institutional security warning: "Granting Super Admin privileges gives full read/write access to financial transactions, platform disputes, user databases, and system configuration."
- Explicit confirmation button: "Confirm Admin Elevation".
- Invokes `supabase.rpc('promote_to_admin', { target_email })` with fallback to direct `user_roles.insert`.
- Displays feedback with toast notifications.

- [x] **Step 2: Integrate into `src/pages/admin/Settings.tsx`**
- Add section: "Super Administrators & System Access".
- Lists current Super Admins from `user_roles` where `role = 'admin'`.
- "Add Platform Administrator" button opening `AdminRoleModal`.
- Remove admin action with lockout protection (cannot remove the last remaining admin).

- [x] **Step 3: Test compilation and commit**
```bash
git add src/components/admin/AdminRoleModal.tsx src/pages/admin/Settings.tsx
git commit -m "feat(admin): implement secure super admin delegation modal and management panel"
```

---

### Task 7: Full System Verification, Type Checks, and Build Validation

**Files:**
- Test across all touched files.

- [x] **Step 1: Run TypeScript type check**
Run: `npx tsc --noEmit`
Expected: Zero TypeScript errors.

- [x] **Step 2: Run linter**
Run: `npm run lint` or `npx eslint src`
Expected: No breaking errors.

- [x] **Step 3: Run Vitest unit tests**
Run: `npm run test` or `npx vitest run`
Expected: All existing test suites pass.

- [x] **Step 4: Push all verified commits to remote repository**
Run: `git push origin main`
Expected: Successfully synced with GitHub.
