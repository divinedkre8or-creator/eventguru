export interface GrowthPlaybookTip {
  id: string;
  stage: string;
  headline: string;
  content: string;
  actionText: string;
  actionLink: string;
}

export const ORGANIZER_GROWTH_TIPS: GrowthPlaybookTip[] = [
  {
    id: "dp_generator_viral",
    stage: "2-3 Weeks Out",
    headline: "Deploy Your Custom Event DP Generator",
    content: "Attendees love showing off that they are attending. Generate your branded event DP flyer on EventGuru and share the link in WhatsApp groups and Instagram stories for free viral reach.",
    actionText: "Open DP Generator",
    actionLink: "/dashboard/dp",
  },
  {
    id: "sms_countdown_48h",
    stage: "48 Hours Out",
    headline: "Send a 48-Hour SMS Countdown Reminder",
    content: "Direct text messages have a 98% open rate. Send a short SMS reminder with gate opening times and fast-track check-in instructions to boost on-time arrival and cut gate delays.",
    actionText: "Compose SMS Broadcast",
    actionLink: "/dashboard/campaigns?channel=sms",
  },
  {
    id: "early_bird_urgency",
    stage: "Launch Phase",
    headline: "Create Scarcity with Tiered Ticket Pricing",
    content: "Events with limited-quantity 'Early Bird' tickets sell out 3x faster than flat-rate events. Reward your early supporters with a temporary discounted tier before releasing regular passes.",
    actionText: "Manage Ticket Tiers",
    actionLink: "/dashboard/tickets",
  },
  {
    id: "rapid_qr_checkin",
    stage: "Event Day",
    headline: "Equip Gate Stewards with 1-Second Check-In",
    content: "Avoid long entrance queues. Open the rapid QR scanner on any smartphone or tablet to validate digital passes in under 1 second per attendee.",
    actionText: "Open Rapid Check-In",
    actionLink: "/dashboard/checkin",
  },
  {
    id: "post_event_retention",
    stage: "Post-Event",
    headline: "Send a Heartfelt Thank-You Note Within 24h",
    content: "The best time to build your community for your next event is right after the current one concludes. Broadcast an SMS or email thanking everyone for attending.",
    actionText: "Send Community Note",
    actionLink: "/dashboard/campaigns",
  },
];

/**
 * Returns a recommended growth tip based on days until the organizer's nearest event.
 */
export function getRecommendedGrowthTip(daysUntilEvent?: number | null): GrowthPlaybookTip {
  if (daysUntilEvent === undefined || daysUntilEvent === null) {
    return ORGANIZER_GROWTH_TIPS[0];
  }
  if (daysUntilEvent <= 2) {
    return ORGANIZER_GROWTH_TIPS[1]; // 48h Countdown
  }
  if (daysUntilEvent <= 7) {
    return ORGANIZER_GROWTH_TIPS[3]; // QR Checkin prep
  }
  if (daysUntilEvent <= 21) {
    return ORGANIZER_GROWTH_TIPS[0]; // DP generator viral
  }
  return ORGANIZER_GROWTH_TIPS[2]; // Early bird
}
