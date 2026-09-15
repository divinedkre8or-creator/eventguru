export interface GuideSection {
  heading: string;
  content: string;
  tip?: string;
}

export interface GuideItem {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  category: string;
  readTime: string;
  publishedDate: string;
  h1: string;
  directAnswer: string;
  sections: GuideSection[];
  relatedFeatureSlug: string;
  relatedFeatureName: string;
  faqs: { question: string; answer: string }[];
}

export const GUIDES_DATA: Record<string, GuideItem> = {
  "how-to-sell-tickets-online-in-nigeria": {
    slug: "how-to-sell-tickets-online-in-nigeria",
    title: "How to Sell Tickets Online for an Event in Nigeria (Complete Guide)",
    metaTitle: "How to Sell Tickets Online for an Event in Nigeria (2026 Guide)",
    metaDescription: "Step-by-step guide to selling event tickets online in Nigeria. Learn about multi-tier pricing, payment gateways, instant bank payouts, and viral attendee promotion.",
    category: "Event Ticketing & Monetization",
    readTime: "6 min read",
    publishedDate: "2026-09-15",
    h1: "How to Sell Tickets Online for an Event in Nigeria: Step-by-Step Guide",
    directAnswer:
      "To sell event tickets online in Nigeria, create an event on a dedicated ticketing platform like EventRally, set up ticket tiers (Early Bird, Regular, VIP), connect your local Nigerian bank account for automated settlements, and share your mobile-optimized checkout link across social channels.",
    sections: [
      {
        heading: "1. Choose a Ticketing Platform With Local Bank Payouts",
        content:
          "The biggest roadblock for Nigerian event organizers is payment settlement delays and high processing fees. Choose an event platform that supports multi-channel local checkout (Debit cards, Bank Transfer, USSD) and settles ticket revenue directly into your local Nigerian bank account without holding your money for weeks.",
        tip: "Avoid relying on manual bank transfers where you have to manually confirm screenshots; automated ticketing reduces booking errors to zero.",
      },
      {
        heading: "2. Structure Multi-Tier Ticket Pricing (Early Bird & VIP)",
        content:
          "Do not offer just one flat ticket price. Create ticket tiers to capture different buyer budgets:\n\n• **Early Bird**: Discounted price for the first 50–100 buyers to generate initial momentum.\n• **Regular / General Admission**: Standard entry pricing.\n• **VIP / Tables**: Premium seating, fast-track entry, or exclusive perks for higher-paying patrons.",
      },
      {
        heading: "3. Optimize Checkout Speed for Mobile Users",
        content:
          "Over 85% of ticket sales in Nigeria happen on mobile smartphones. Your ticket sales page must load in under 2 seconds, have minimal form fields (Name, Email, Phone), and support instant bank transfers and card payments.",
      },
      {
        heading: "4. Turn Buyers Into Promoters With 'I Will Be Attending' Fliers",
        content:
          "The moment an attendee buys a ticket, prompt them to generate a personalized 'I Will Be Attending' flyer using EventRally's Viral DP generator. When 100 ticket buyers post their flyer on WhatsApp Status, your event reaches thousands of potential buyers organically without spending on ads.",
      },
      {
        heading: "5. Prepare Gate Check-in for Event Day",
        content:
          "Ensure your ticketing platform issues digital QR passes that attendees can save in an offline wallet. On event day, your door staff can scan tickets in 1 second using their phone cameras, eliminating long queues.",
      },
    ],
    relatedFeatureSlug: "event-ticketing",
    relatedFeatureName: "Event Ticketing Engine",
    faqs: [
      {
        question: "How do I receive payments from ticket sales in Nigeria?",
        answer:
          "On EventRally, ticket revenues are processed through secure payment channels and transferred directly to your registered Nigerian bank account.",
      },
      {
        question: "Can I sell tickets in Nigerian Naira (NGN)?",
        answer:
          "Yes. EventRally fully supports Nigerian Naira (NGN) with transparent pricing and real-time checkout for cards, transfers, and USSD.",
      },
    ],
  },

  "how-to-create-an-i-will-be-attending-flyer": {
    slug: "how-to-create-an-i-will-be-attending-flyer",
    title: "How to Create an 'I Will Be Attending' Flyer for Your Event",
    metaTitle: "How to Create an 'I Will Be Attending' Flyer | DP Generator Guide",
    metaDescription: "Learn how to design, upload, and automate 'I Will Be Attending' and 'I Will Be There' flyers for your attendees without hiring a graphic designer.",
    category: "Viral Event Marketing",
    readTime: "5 min read",
    publishedDate: "2026-09-15",
    h1: "How to Create an 'I Will Be Attending' Flyer for Your Event (Automated)",
    directAnswer:
      "An 'I Will Be Attending' flyer is a branded promotional graphic containing an attendee's photo and name. To automate this without graphic designer costs, create an event on EventRally, upload your square flyer frame in the DP Studio, position the photo and name placeholders, and share your event's unique DP link with attendees.",
    sections: [
      {
        heading: "1. Why 'I Will Be Attending' Fliers Outperform Paid Ads",
        content:
          "People buy tickets when they see their friends, colleagues, or industry mentors attending. A personalized attendee flyer on WhatsApp Status or Instagram Stories creates irresistible social proof and urgency that sponsored ads cannot replicate.",
      },
      {
        heading: "2. Design Your Master Event Frame Template",
        content:
          "Design a square (1:1 ratio, e.g. 1080x1080px) graphic containing your event title, date, venue, and logo. Leave a dedicated area (circular or square) where the attendee photo will be placed, and space below it for their name.",
        tip: "Keep the photo area centrally visible and use high contrast so the attendee's face stands out on dark mode feeds.",
      },
      {
        heading: "3. Upload to EventRally DP Studio & Configure Placement",
        content:
          "In your EventRally organizer dashboard, open the DP Studio:\n\n1. Upload your master template image.\n2. Choose Circular or Square cutout shape.\n3. Adjust the photo position and size box to match your design cutout.\n4. Select the attendee name font, color, and size.\n5. Click Publish.",
      },
      {
        heading: "4. Distribute the Link to Attendees",
        content:
          "Once published, EventRally generates a public DP generator link. Attendees simply visit the link, upload their photo from their camera roll, type their name, and download their flyer in 1 click.",
      },
    ],
    relatedFeatureSlug: "viral-dp-generator",
    relatedFeatureName: "Viral DP Generator",
    faqs: [
      {
        question: "Do attendees need to pay to create their flyer?",
        answer:
          "No. Attendees can create and download their personalized flyer 100% free with no watermark.",
      },
      {
        question: "Can I use the DP generator for free RSVP events?",
        answer:
          "Yes. EventRally's DP Generator works seamlessly for both free and paid events.",
      },
    ],
  },

  "event-registration-vs-google-forms": {
    slug: "event-registration-vs-google-forms",
    title: "Event Registration Platform vs Google Forms: Which Should You Use?",
    metaTitle: "Event Registration Platform vs Google Forms | Detailed Comparison",
    metaDescription: "Comparing dedicated event registration platforms vs Google Forms for managing events. Discover why spreadsheets fail on event day and what to use instead.",
    category: "Event Operations",
    readTime: "5 min read",
    publishedDate: "2026-09-15",
    h1: "Event Registration Platform vs. Google Forms: The Honest Comparison",
    directAnswer:
      "While Google Forms is convenient for basic surveys, it lacks critical event management infrastructure such as automated scannable QR tickets, 1-second gate check-in, real-time capacity capping, offline ticket wallets, and attendee DP flyer generators.",
    sections: [
      {
        heading: "1. The Hidden Cost of Using Google Forms for Events",
        content:
          "Google Forms was built for academic surveys and questionnaires, not live event operations. When used for events, organizers face massive hurdles: no admission passes are generated, attendees cannot verify their registration, and on event day, security staff must manually search through hundreds of spreadsheet rows.",
      },
      {
        heading: "2. Comparison: Google Forms vs. EventRally",
        content:
          "• **Digital QR Passes**: Google Forms (No) vs. EventRally (Yes, instant scannable QR passes).\n• **1-Second Gate Scanner**: Google Forms (Manual spreadsheet search) vs. EventRally (Instant camera scanner on any phone).\n• **Offline Wallet**: Google Forms (No) vs. EventRally (Yes, tickets stored offline on attendee devices).\n• **Capacity Control**: Google Forms (Manual form closing) vs. EventRally (Automatic capacity capping).\n• **Viral Attendee Flier**: Google Forms (No) vs. EventRally (Integrated 1-click DP Generator).",
      },
      {
        heading: "3. When to Switch to a Dedicated Event Platform",
        content:
          "If your event has more than 30 attendees, requires door verification, or aims to look professional, switching to a dedicated platform like EventRally eliminates gate queues and enhances attendee trust.",
      },
    ],
    relatedFeatureSlug: "event-registration",
    relatedFeatureName: "Event Registration & RSVP",
    faqs: [
      {
        question: "Is EventRally as easy to set up as Google Forms?",
        answer:
          "Yes. Publishing a free event on EventRally takes under 2 minutes, with zero technical knowledge required.",
      },
      {
        question: "Can I collect custom attendee questions on EventRally?",
        answer:
          "Yes. EventRally captures attendee contact info and gives you an exportable CSV roster with full attendee details.",
      },
    ],
  },

  "how-to-check-in-attendees-using-qr-codes": {
    slug: "how-to-check-in-attendees-using-qr-codes",
    title: "How to Check In Event Attendees Using QR Codes (Zero Gate Queues)",
    metaTitle: "How to Check In Event Attendees Using QR Codes | Fast Gate Guide",
    metaDescription: "Master event door check-in with QR code scanners. Learn how to scan 40+ attendees per minute, prevent fake tickets, and handle offline venues.",
    category: "Gate Operations & Security",
    readTime: "4 min read",
    publishedDate: "2026-09-15",
    h1: "How to Check In Event Attendees Using QR Codes (Eliminate Door Queues)",
    directAnswer:
      "To check in event attendees using QR codes, issue digital tickets with unique dynamic QR codes at registration, equip door staff with a browser-based camera scanner, and scan each attendee's pass at the entrance to verify admission in under 1 second.",
    sections: [
      {
        heading: "1. Why Paper Lists and Spreadsheets Create Gate Chaos",
        content:
          "Searching for an attendee's name on a paper list takes 30 to 60 seconds per person. With 500 attendees, manual lookup causes over 4 hours of cumulative gate delay. A 1-second QR scanner processes 40+ attendees per minute per gate station.",
      },
      {
        heading: "2. Setting Up the EventRally Scanner on Staff Phones",
        content:
          "You do not need to rent expensive barcode hardware. On event day:\n\n1. Open your EventRally organizer dashboard on any phone, tablet, or laptop.\n2. Navigate to the Check-in tab.\n3. Grant camera permission and point at attendee QR passes.",
      },
      {
        heading: "3. Solving Weak Venue Internet with Offline Passes",
        content:
          "Venues with hundreds of guests often suffer from mobile network congestion. EventRally solves this by caching attendee digital passes directly in their mobile browser wallet, so attendees can present their QR pass even with zero cellular signal.",
      },
      {
        heading: "4. Preventing Duplicate Entry Fraud",
        content:
          "If an attendee tries to share a screenshot of their ticket with a friend, EventRally's scanner immediately displays an alert that the pass has already been checked in, preventing double entry in real time.",
      },
    ],
    relatedFeatureSlug: "qr-check-in",
    relatedFeatureName: "1-Second QR Check-In",
    faqs: [
      {
        question: "Can multiple door staff scan tickets simultaneously?",
        answer:
          "Yes. You can have multiple staff members scanning tickets across different entrance lanes in real time.",
      },
    ],
  },

  "how-to-send-reminders-and-updates-to-event-attendees": {
    slug: "how-to-send-reminders-and-updates-to-event-attendees",
    title: "How to Send Reminders and Updates to Event Attendees",
    metaTitle: "How to Send SMS & Email Updates to Event Attendees | EventRally",
    metaDescription: "Best practices for sending event reminders, venue instructions, and schedule updates to registered attendees to minimize no-shows and gate confusion.",
    category: "Attendee Communication",
    readTime: "4 min read",
    publishedDate: "2026-09-15",
    h1: "How to Send Reminders & Updates to Event Attendees (Reduce No-Shows)",
    directAnswer:
      "To maximize event attendance and reduce confusion, send timely email and SMS broadcasts to registered attendees at three critical milestones: 48 hours before, event morning, and immediately post-event.",
    sections: [
      {
        heading: "1. The 48-Hour Pre-Event Logistics Broadcast",
        content:
          "Send an email 48 hours before your event with exact venue address, parking details, dress code, and what to bring. Remind attendees to pull up their digital ticket pass in advance.",
      },
      {
        heading: "2. The Event Morning SMS / Quick Notice",
        content:
          "Send a concise morning notice on the day of the event highlighting gate opening times, registration desk location, and the day's headline schedule.",
      },
      {
        heading: "3. Broadcast Without External Software on EventRally",
        content:
          "Instead of exporting spreadsheets into Mailchimp or third-party bulk SMS gateways, use EventRally's Campaigns studio to compose and broadcast updates directly to all attendees or specific ticket tiers.",
      },
      {
        heading: "4. Post-Event Follow-Up & Feedback",
        content:
          "Within 24 hours after the event, broadcast a thank-you note with speaker slides, photo gallery links, and a brief feedback survey while the experience is fresh.",
      },
    ],
    relatedFeatureSlug: "event-messaging",
    relatedFeatureName: "Event Messaging & Broadcasts",
    faqs: [
      {
        question: "How do I segment messages to VIP attendees only?",
        answer:
          "In EventRally Campaigns, filter recipient lists by ticket tier to send targeted instructions to VIP or speaker groups.",
      },
    ],
  },

  "how-to-manage-free-events-and-rsvps-online": {
    slug: "how-to-manage-free-events-and-rsvps-online",
    title: "How to Manage Free Events and RSVPs Online Without Spending a Dime",
    metaTitle: "How to Manage Free Events & RSVPs Online for Free | EventRally",
    metaDescription: "Learn how to host, organize, and manage free conferences, campus summits, and community meetups online with zero platform fees.",
    category: "Community & Campus Events",
    readTime: "5 min read",
    publishedDate: "2026-09-15",
    h1: "How to Manage Free Events & RSVPs Online (Zero Software Cost)",
    directAnswer:
      "To host a free event online without software costs, use EventRally to publish your event page, set an attendee RSVP capacity cap, enable the Viral DP generator, and scan digital passes at the door. Free events on EventRally are 100% free forever.",
    sections: [
      {
        heading: "1. Why Free Events Need Real Event Infrastructure",
        content:
          "Free events suffer from high no-show rates (often 40% to 50%) when managed through basic forms. Providing attendees with a legitimate digital admission pass and a personalized flyer creates commitment and drives actual attendance.",
      },
      {
        heading: "2. Setting Up an RSVP Cap to Prevent Overcrowding",
        content:
          "Configure maximum attendee limits in the Event Studio so signups automatically close when your venue reaches capacity.",
      },
      {
        heading: "3. Harnessing Campus and Community Virality",
        content:
          "Equip attendees with 'I will be there' flyers to share across student WhatsApp groups, church departments, and community forums.",
      },
    ],
    relatedFeatureSlug: "event-registration",
    relatedFeatureName: "Event Registration Platform",
    faqs: [
      {
        question: "Does EventRally limit the number of attendees for free events?",
        answer:
          "No. EventRally offers unlimited free RSVPs with zero platform fees.",
      },
    ],
  },
};
