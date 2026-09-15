# EventRally Monetization Streams Roadmap & Implementation Blueprint

> **System Architecture Document**  
> **Platform**: EventRally (`https://www.geteventrally.com`)  
> **Target Audience**: Core Engineers, AI Agents, Product Leads, Platform Owners  
> **Status**: Living Architectural Specification  

---

## 1. Executive Strategy & Market Penetration Philosophy

EventRally operates on a **Product-Led Growth (PLG)** model designed to capture the Nigerian and African event organizer market rapidly while ensuring zero cash burn and progressive profitability from Day 1.

```mermaid
flowchart LR
    A[Free Event Hosting Hook] --> B[Viral Attendee DPs with Watermark]
    B --> C[Organic Word-of-Mouth & Discovery]
    C --> D[Paid Ticket Commission: 2.5%]
    D --> E[Prepaid SMS & Extra Email Top-ups]
    E --> F[EventRally Pro Subscription & White-labeling]
```

### Core Tenets:
1. **Zero Friction Onboarding**: Free events must remain completely free to create and host. No credit card or upfront deposit required.
2. **Built-in Viral Attribution**: Every free DP flyer download, QR ticket pass, and shared link carries the official high-contrast watermark badge: `POWERED BY EVENTRALLY (WWW.GETEVENTRALLY.COM)`.
3. **Prepaid Infrastructure Shield**: Organizers fund value-added messaging (SMS & high-volume email blasts) in advance via Paystack wallet top-ups before any third-party API costs (Termii/Resend) are incurred by the platform.

---

## 2. Phased Monetization Roadmap

| Stage | Milestone Trigger | Primary Revenue Stream | Est. Gross Margin | Risk Level |
| :--- | :--- | :--- | :--- | :--- |
| **Stage 1: Launch Penetration** | Day 1 Launch (Active) | 2.5% Paid Ticket Fee + Viral Watermarks | 100% | Zero |
| **Stage 2: Engagement Monetization** | 50+ Active Organizers / 1,000+ RSVPs | Prepaid Termii SMS Bundles + Extra Email Tiering | 55% - 70% | Low (Prepaid) |
| **Stage 3: Scale & Creator Ecosystem** | 200+ Active Organizers / 10,000+ Attendees | EventRally Pro Subscription (₦7,500/mo) + White-Label DP Fee + Featured Discovery | 85% - 95% | Minimal |

---

## 3. Stage 1: Launch & Market Penetration (Active Base Layer)

### 3.1 Paid Ticket Platform Fee
* **Pricing**: 2.5% - 3.0% platform service fee deducted per paid ticket transaction.
* **Mechanism**: Calculated automatically in `src/lib/platformSettings.ts` via `calculatePaymentBreakdown()`.
* **Settlement**: Handled securely through Paystack split payments or direct payout reconciliation.
* **Organizer Value**: Free check-in scanner app, instant QR delivery, and real-time sales dashboard.

### 3.2 Free Email Quota & Protection Cap
* **Cap**: 100 free emails per organizer per month (covers ticket confirmations and initial RSVP announcements).
* **Provider**: Resend Free Tier (3,000 emails/month, 100 emails/day capacity).
* **Protection Rule**: When an organizer reaches 100 sent emails on a free plan, subsequent broadcast campaigns prompt them to top up their messaging wallet.

### 3.3 Viral DP Watermark Engine
* **Attribution**: Every attendee downloading a personalized "I Will Be Attending" social display picture flyer has the high-contrast badge rendered into the export canvas:
  ```
  POWERED BY EVENTRALLY | WWW.GETEVENTRALLY.COM
  ```
* **Effect**: Turns thousands of attendees into active marketing ambassadors across WhatsApp Status, Instagram Stories, X (Twitter), and LinkedIn.

---

## 4. Stage 2: Engagement & Messaging Monetization (Next Build)

### 4.1 SMS Reminder & Broadcast Packs (Termii Integration)
Event attendance rates increase by over 40% when attendees receive an SMS reminder 2 hours before an event. Organizers gladly pay for SMS reminders.

#### Unit Economics:
* **Termii Base Cost (Nigeria DND/Non-DND Route)**: ~₦2.80 - ₦3.50 per SMS.
* **EventRally Retail Pricing**: ₦6.00 - ₦7.00 per SMS unit.
* **Gross Profit Margin**: **50% - 60% per SMS sent**.

#### Proposed Organizer SMS Bundles (Prepaid via Paystack):
| Bundle Name | SMS Units | Organizer Price | Platform Cost (Termii) | Net Platform Profit |
| :--- | :--- | :--- | :--- | :--- |
| **Starter Pulse** | 250 SMS | ₦1,750 | ~₦875 | **₦875 (50%)** |
| **Growth Booster** | 750 SMS | ₦4,500 | ~₦2,250 | **₦2,250 (50%)** |
| **Mega Rally** | 2,500 SMS | ₦13,500 | ~₦6,500 | **₦7,000 (52%)** |

### 4.2 Extra Email Broadcast Credits
When organizers surpass 100 free emails:
* **Extra Email Pack**: ₦1,500 per 1,000 additional emails (~$1.00 USD).
* **Resend Upgrade Threshold**: When the platform reaches 15+ paying organizers spending >₦25,000/mo on emails, upgrade the platform Resend account to **Resend Pro ($20/mo = 50,000 emails)**. The platform captures ₦75,000+ in revenue against a $20 (~₦30,000) cost.

---

## 5. Stage 3: Scale & Creator Ecosystem (Future Expansion)

### 5.1 EventRally Pro Subscription (₦7,500/month or ₦75,000/year)
* Reduced ticket commission (1.5% instead of 2.5%).
* Unlimited attendee email broadcasts (fair usage up to 10,000/mo).
* Custom event landing page subdomains (`techfest.geteventrally.com`).
* Exportable raw attendee CSVs & webhook integrations.
* Multi-staff scanner roles for door check-in.

### 5.2 White-Label DP & Custom Branding Add-on (₦10,000 - ₦25,000 / event)
* Removes the `POWERED BY EVENTRALLY` watermark from the public DP Generator.
* Embeds corporate sponsor logos in the exported badges.

### 5.3 Featured Event Spotlight (₦5,000 - ₦15,000 / week)
* Pinned banner at the top of `/events` explore page.
* Inclusion in the weekly "Top Events in Lagos/Abuja" algorithmic newsletter.

---

## 6. Database Schema Specification (For Future Agents)

When implementing Stage 2 and Stage 3, apply the following Supabase SQL migrations without altering existing event/ticket schemas:

```sql
-- 1. Organizer Prepaid Wallets
CREATE TABLE public.organiser_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organiser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance_kobo BIGINT NOT NULL DEFAULT 0, -- Stored in kobo (100 kobo = 1 NGN)
    sms_credits_remaining INT NOT NULL DEFAULT 0,
    email_credits_remaining INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_organiser_wallet UNIQUE(organiser_id)
);

-- 2. Wallet Top-up & Debit Transactions
CREATE TABLE public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.organiser_wallets(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('credit_topup', 'sms_debit', 'email_debit', 'addon_purchase')),
    amount_kobo BIGINT NOT NULL,
    units_transacted INT NOT NULL DEFAULT 0, -- Number of SMS / emails
    paystack_reference VARCHAR(100),
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Monthly Organizer Email & SMS Quota Tracker
CREATE TABLE public.organiser_usage_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organiser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    billing_month VARCHAR(7) NOT NULL, -- e.g. '2026-09'
    free_emails_sent INT NOT NULL DEFAULT 0,
    paid_emails_sent INT NOT NULL DEFAULT 0,
    sms_sent INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_organiser_monthly_usage UNIQUE(organiser_id, billing_month)
);

-- 4. Enable Row Level Security
ALTER TABLE public.organiser_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organiser_usage_limits ENABLE ROW LEVEL SECURITY;

-- Organizers can only view their own wallet and transactions
CREATE POLICY "Organisers view own wallet" 
ON public.organiser_wallets FOR SELECT USING (auth.uid() = organiser_id);

CREATE POLICY "Organisers view own transactions" 
ON public.wallet_transactions FOR SELECT 
USING (wallet_id IN (SELECT id FROM public.organiser_wallets WHERE organiser_id = auth.uid()));
```

---

## 7. Super Admin Key & Runtime Configuration Guide

### How Keys Operate on EventRally:
1. **Frontend Gateway Key (`VITE_PAYSTACK_PUBLIC_KEY`)**:
   * Stored in `localStorage` under `eventrally_platform_settings_v1` via [`src/pages/admin/Settings.tsx`](file:///c:/Users/Divine/Desktop/eventguru/src/pages/admin/Settings.tsx).
   * Loaded dynamically at runtime by [`src/lib/platformSettings.ts`](file:///c:/Users/Divine/Desktop/eventguru/src/lib/platformSettings.ts) via `getActiveGatewayPublicKey()`.
   * Directly drives attendee checkout popup (`PaystackPop.setup()`). No redeployment needed when changed from Super Admin Dashboard.

2. **Backend Serverless Secrets (`RESEND_API_KEY`, `PAYSTACK_SECRET_KEY`, `TERMII_API_KEY`)**:
   * Stored as encrypted Supabase Edge Function Secrets (`edpnvsakkudorleqqhxv`).
   * Can be tested instantly on the frontend Super Admin dashboard via direct API ping.
   * Can be synced to backend anytime via Supabase CLI:
     ```bash
     npx supabase secrets set RESEND_API_KEY=re_... TERMII_API_KEY=... PAYSTACK_SECRET_KEY=sk_...
     ```

---

## 8. Agent Implementation Checklist for Future Stages

When a user instructs an agent to build out **Stage 2 (SMS / Wallet Top-ups)**:
- [ ] Run the SQL migration in Section 6 on Supabase SQL Editor.
- [ ] Create a new Supabase Edge Function `send-sms` calling `https://api.ng.termii.com/api/sms/send`.
- [ ] Add a `MessagingWallet.tsx` modal in [`src/pages/dashboard/Campaigns.tsx`](file:///c:/Users/Divine/Desktop/eventguru/src/pages/dashboard/Campaigns.tsx) allowing organizers to select SMS packs and pay with Paystack.
- [ ] On successful payment callback, credit `organiser_wallets.sms_credits_remaining`.
- [ ] Decrement wallet balance atomically inside `send-sms` Edge Function before dispatching Termii API call.
