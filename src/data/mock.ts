import { Mic, Store, Church, GraduationCap, PartyPopper, Wrench } from "lucide-react";

// Feature descriptions used on the landing page module cards.
// These describe actual platform capabilities, not fake user data.
export const features = [
  { title: "Smart Ticketing", description: "Multiple ticket types, dynamic pricing, promo codes, and group discounts.", icon: "ticket" },
  { title: "QR Check-in", description: "Scan-to-verify with offline mode, multi-gate support, and real-time counts.", icon: "scan" },
  { title: "DP Generator", description: "Let attendees create branded profile pictures with custom frames.", icon: "image" },
  { title: "Analytics Hub", description: "Revenue tracking, attendee insights, registration funnels, and post-event reports.", icon: "chart" },
  { title: "Campaigns", description: "Email and SMS campaigns with templates, scheduling, and automated triggers.", icon: "mail" },
  { title: "Form Builder", description: "Custom registration forms with conditional logic and multiple field types.", icon: "form" },
  { title: "Payments", description: "Paystack & Flutterwave integration with split payments and automated payouts.", icon: "wallet" },
  { title: "Attendee CRM", description: "Full attendee management with tags, notes, communication history, and exports.", icon: "users" },
];

export const eventCategories = [
  { name: "Conferences", icon: Mic },
  { name: "Trade Shows", icon: Store },
  { name: "Church Events", icon: Church },
  { name: "Campus Events", icon: GraduationCap },
  { name: "Festivals", icon: PartyPopper },
  { name: "Workshops", icon: Wrench },
];
