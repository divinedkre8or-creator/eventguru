export interface FeatureFAQ {
  question: string;
  answer: string;
}

export interface FeatureStep {
  step: string;
  title: string;
  description: string;
}

export interface FeatureBenefit {
  title: string;
  description: string;
  badge?: string;
}

export interface FeaturePersona {
  role: string;
  useCase: string;
}

export interface FeatureItem {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  badge: string;
  h1: string;
  immediateAnswer: string;
  problemHeading: string;
  problemDescription: string;
  problemPoints: string[];
  solutionHeading: string;
  solutionDescription: string;
  steps: FeatureStep[];
  benefits: FeatureBenefit[];
  personas: FeaturePersona[];
  faqs: FeatureFAQ[];
  relatedSlugs: string[];
  relatedGuideSlugs: string[];
}

export const FEATURES_DATA: Record<string, FeatureItem> = {
  "event-ticketing": {
    slug: "event-ticketing",
    title: "Event Ticketing Platform",
    metaTitle: "Event Ticketing Platform in Nigeria & Africa",
    metaDescription: "Sell out paid and free event tickets online. Multi-tier pricing, instant automated bank payouts, promo discounts, and transparent checkout.",
    badge: "EVENT TICKETING ENGINE",
    h1: "Sell Out Event Tickets Online With Instant Automated Payouts",
    immediateAnswer:
      "EventRally is an online event ticketing platform that allows event creators, conference conveners, and festival promoters to configure multi-tier ticket passes, accept payments via multi-channel checkout, and receive direct automated settlements straight to their local bank accounts.",
    problemHeading: "The Frustration With Clunky, Delayed Ticketing Systems",
    problemDescription:
      "Most ticketing systems act like outdated cash registers. Organizers are hit with complicated setup requirements, confusing merchant account approvals, and delayed payouts that hold onto ticket funds for weeks after the event ends. On top of that, checkout processes with dozens of form fields cause high cart abandonment.",
    problemPoints: [
      "Delayed payouts and manual transfer requests hold organizer cash flow hostage.",
      "Complicated multi-step checkouts result in 40%+ drop-off rates on mobile devices.",
      "Hidden buyer surcharges and confusing transaction fees anger ticket buyers.",
      "Lack of support for flexible multi-tier tickets (VIP tables, early bird, group discounts).",
    ],
    solutionHeading: "Modern, High-Speed Ticketing Built for Maximum Sales",
    solutionDescription:
      "EventRally strips away all ticketing friction. Create free passes, early bird discounts, regular passes, and VIP tables in 2 minutes. Ticket revenues are automatically processed and settled directly to your designated bank account with full ledger transparency.",
    steps: [
      {
        step: "01",
        title: "Create Your Event & Set Ticket Tiers",
        description: "Specify prices, quantity caps, sales start/end dates, and promotional coupon codes in the intuitive Event Studio.",
      },
      {
        step: "02",
        title: "Share Your Branded Event Landing Page",
        description: "Your event is published with a clean, high-speed mobile checkout page optimized for all devices.",
      },
      {
        step: "03",
        title: "Attendees Pay Seamlessly in Seconds",
        description: "Buyers complete purchase with bank cards, transfers, or USSD without needing an account.",
      },
      {
        step: "04",
        title: "Receive Direct Automated Bank Settlements",
        description: "Ticket proceeds settle directly into your bank account with complete breakdown reports in your dashboard.",
      },
    ],
    benefits: [
      {
        title: "Instant Bank Settlements",
        description: "No waiting weeks for platform clearance. Funds settle cleanly into your verified bank account.",
        badge: "FINANCE",
      },
      {
        title: "Multi-Tier Pricing & Discount Codes",
        description: "Run early bird flash sales, VIP tiers, student discounts, and promo codes with real-time math.",
        badge: "SALES",
      },
      {
        title: "20-Second Mobile Checkout",
        description: "Frictionless checkout designed for smartphone screens eliminates cart abandonment.",
        badge: "CONVERSION",
      },
      {
        title: "100% Free For Free Events",
        description: "Zero upfront fees, zero listing costs, and zero subscription charges for free community events.",
        badge: "COMMUNITY",
      },
    ],
    personas: [
      {
        role: "Tech & Corporate Conference Conveners",
        useCase: "Manage multi-track tickets, corporate invoicing, and student scholarships on a single dashboard.",
      },
      {
        role: "Festival, Concert & Party Promoters",
        useCase: "Sell Early Bird, General Admission, VIP, and Cabana table passes with rapid checkout speed.",
      },
      {
        role: "Workshop & Masterclass Facilitators",
        useCase: "Set up paid training seats in 2 minutes and track registered participants in real time.",
      },
    ],
    faqs: [
      {
        question: "How do ticket payouts work on EventRally?",
        answer:
          "Ticket revenues are collected through secure multi-channel checkout and settled directly into the organizer's linked local bank account with full transaction breakdown reports.",
      },
      {
        question: "Can I sell both free and paid tickets on the same event?",
        answer:
          "Yes. You can configure multiple ticket tiers on a single event, combining free general admission with paid VIP or workshop add-on tickets.",
      },
      {
        question: "Are there any upfront charges to list an event?",
        answer:
          "No. EventRally charges zero upfront fees, zero monthly subscription costs, and is 100% free for non-commercial free events.",
      },
      {
        question: "How do attendees receive their tickets?",
        answer:
          "Attendees receive their digital ticket passes instantly on screen and in their personal wallet, complete with scannable QR codes and offline access.",
      },
    ],
    relatedSlugs: ["qr-check-in", "attendee-management", "viral-dp-generator", "event-registration"],
    relatedGuideSlugs: ["how-to-sell-tickets-online-in-nigeria", "how-to-check-in-attendees-using-qr-codes"],
  },

  "event-registration": {
    slug: "event-registration",
    title: "Event Registration & Free RSVP Platform",
    metaTitle: "Free Event Registration & RSVP Platform | Google Forms Alternative",
    metaDescription: "Collect event registrations and RSVPs online without messy spreadsheets. Automated digital QR passes, attendee rosters, and zero platform fees.",
    badge: "RSVP & REGISTRATION",
    h1: "Collect Event Registrations & RSVPs Without Spreadsheets or Google Forms",
    immediateAnswer:
      "EventRally's event registration platform provides a purpose-built alternative to Google Forms and spreadsheets for managing attendee signups. Organizers get a branded event page, automatic attendee capacity management, instant digital QR pass generation, and a centralized guest list.",
    problemHeading: "Why Google Forms and Spreadsheets Break on Event Day",
    problemDescription:
      "Many organizers default to Google Forms or WhatsApp links for free events. While free to create, they provide zero event infrastructure: forms do not issue verifiable tickets, they don't prevent duplicate submissions, they don't cap capacity cleanly, and on event day, door staff are left scrolling through a 500-row spreadsheet.",
    problemPoints: [
      "Google Forms cannot issue unique scannable QR admission passes to attendees.",
      "Manual capacity tracking leads to venue overcrowding and embarrassment.",
      "Spreadsheet-based check-in causes massive queues and gate chaos.",
      "Attendees lose confirmation emails or forget whether they successfully registered.",
    ],
    solutionHeading: "A Dedicated Registration Engine for Modern Organizers",
    solutionDescription:
      "EventRally replaces disconnected form tools with a seamless registration experience. Attendees RSVP in 20 seconds and immediately receive a digital admission pass with a unique QR code stored in their mobile browser wallet.",
    steps: [
      {
        step: "01",
        title: "Publish Your Free Event Page",
        description: "Set event description, venue schedule, attendee cap, and optional branded accent color.",
      },
      {
        step: "02",
        title: "Share Your Custom Event URL",
        description: "Drive registrations from social media, email campaigns, WhatsApp groups, and campus channels.",
      },
      {
        step: "03",
        title: "Attendees RSVP in One Step",
        description: "Guests provide their name and email, instantly securing their digital pass and QR code.",
      },
      {
        step: "04",
        title: "Scan Guests at the Door in 1 Second",
        description: "Your gate staff validates RSVPs using any smartphone camera with zero spreadsheet lookup.",
      },
    ],
    benefits: [
      {
        title: "Verifiable QR Admission Passes",
        description: "Every registration generates a secure digital pass that cannot be duplicated or reused.",
        badge: "SECURITY",
      },
      {
        title: "Real-Time Attendee Limits",
        description: "Set maximum capacity limits so registrations automatically close when your venue is full.",
        badge: "CONTROL",
      },
      {
        title: "Offline Attendee Ticket Wallet",
        description: "Attendees can pull up their registration pass even if the venue has zero cellular coverage.",
        badge: "RELIABILITY",
      },
      {
        title: "100% Free Forever",
        description: "Unlimited RSVPs for free conferences, meetups, campus rallies, and church gatherings.",
        badge: "ZERO COST",
      },
    ],
    personas: [
      {
        role: "Community & Church Leaders",
        useCase: "Host youth conventions, Sunday summits, and faith conferences with seamless guest management.",
      },
      {
        role: "Campus & Student Organizers",
        useCase: "Collect student registrations across university departments with instant attendee confirmation.",
      },
      {
        role: "Meetup & Networking Hosts",
        useCase: "Manage tech meetups, breakfast roundtables, and creative mixers without spreadsheet chaos.",
      },
    ],
    faqs: [
      {
        question: "Is EventRally really 100% free for RSVP and registration events?",
        answer:
          "Yes. EventRally is completely free for all free-admission events. There are no registration limits, no monthly software charges, and no hidden fees.",
      },
      {
        question: "What makes EventRally better than Google Forms for event registration?",
        answer:
          "Unlike Google Forms, EventRally automatically issues unique scannable QR digital passes, enforces venue capacity limits, provides 1-second gate camera scanning, and integrates an attendee DP flyer generator.",
      },
      {
        question: "Can attendees access their RSVP passes offline?",
        answer:
          "Yes. EventRally caches the digital pass directly in the attendee's mobile browser, so they can show their QR code at the door even with zero internet connectivity.",
      },
    ],
    relatedSlugs: ["event-ticketing", "qr-check-in", "attendee-management", "viral-dp-generator"],
    relatedGuideSlugs: ["event-registration-vs-google-forms", "how-to-manage-free-events-and-rsvps-online"],
  },

  "viral-dp-generator": {
    slug: "viral-dp-generator",
    title: "Viral DP & 'I Will Be Attending' Flyer Generator",
    metaTitle: "I Will Be Attending Flyer Generator | Event DP Maker — EventRally",
    metaDescription: "Create custom 'I will be attending' event fliers and DP frames in 1 click. Turn attendees into a viral marketing team across WhatsApp, Instagram & X.",
    badge: "FLAGSHIP GROWTH ENGINE",
    h1: "I Will Be Attending Flyer Generator: Turn Attendees Into Your Loudest Promoters",
    immediateAnswer:
      "The EventRally Viral DP (Display Picture) Generator is an automated event marketing tool that enables organizers to upload a branded frame overlay once, allowing attendees to instantly merge their photo and name into a personalized 'I Will Be Attending' promotional flyer for 1-click sharing to social media.",
    problemHeading: "The Massive Expense & Inefficiency of Traditional Event Marketing",
    problemDescription:
      "Sponsored social media ads are expensive, face ad fatigue, and are frequently ignored. In reality, the single highest-converting endorsement for any event is an attendee posting their own face saying: 'I will be there.' Historically, creating personalized flyers required hiring graphic designers or asking attendees to manually edit templates in Canva, resulting in massive delays and lost viral momentum.",
    problemPoints: [
      "Designers charging per flier or taking days to generate 100 customized graphics.",
      "Asking attendees to use complex tools like Canva leads to 90%+ abandoning the effort.",
      "Missed organic viral reach on WhatsApp Status, Instagram Stories, LinkedIn, and X.",
      "Lack of brand consistency when attendees attempt to make their own makeshift graphics.",
    ],
    solutionHeading: "Zero-Overhead, Instant Branded Fliers for Every Attendee",
    solutionDescription:
      "With EventRally DP Studio, organizers upload their official event flyer frame once, configure the photo placement and typography, and publish. Attendees simply upload their photo and enter their name to generate a high-resolution, perfectly framed graphic in under 5 seconds.",
    steps: [
      {
        step: "01",
        title: "Upload Your Event Frame in DP Studio",
        description: "Upload your square branded template with a transparent or designated cutout space for the photo.",
      },
      {
        step: "02",
        title: "Position Photo Area & Name Styling",
        description: "Set circular or square photo shape, size, coordinates, font color, size, and alignment with live preview.",
      },
      {
        step: "03",
        title: "Attendees Generate Their Flyer in 1 Click",
        description: "Attendees upload a selfie, type their name, and instantly download their personalized graphic.",
      },
      {
        step: "04",
        title: "Viral Multiplication Across Social Channels",
        description: "Hundreds of attendees post their branded fliers on WhatsApp Status, Instagram, and X, generating exponential organic ticket sales.",
      },
    ],
    benefits: [
      {
        title: "Zero Graphic Design Costs",
        description: "Eliminate manual designer back-and-forth. The platform generates unlimited attendee flyers automatically.",
        badge: "COST SAVINGS",
      },
      {
        title: "Exponential Organic Reach",
        description: "When 200 attendees share their flyer on WhatsApp Status, your event reaches 10,000+ local contacts organically.",
        badge: "VIRALITY",
      },
      {
        title: "Pixel-Perfect Brand Consistency",
        description: "Every attendee flier matches your exact brand colors, logos, and typographic guidelines.",
        badge: "BRANDING",
      },
      {
        title: "Integrated Ticket & DP Workflow",
        description: "Attendees can generate their DP immediately after ticket checkout or from their personal wallet.",
        badge: "CONVENIENCE",
      },
    ],
    personas: [
      {
        role: "Campus & Youth Gathering Leaders",
        useCase: "Drive viral peer adoption across student groups where social proof drives 90% of attendance.",
      },
      {
        role: "Tech Summit & Industry Conference Organizers",
        useCase: "Give delegates and speakers a sleek, professional badge to share on LinkedIn and Twitter.",
      },
      {
        role: "Church & Faith Conference Conveners",
        useCase: "Equip congregation members to invite their circles with custom 'I will be there' flyers.",
      },
    ],
    faqs: [
      {
        question: "What is an 'I Will Be Attending' flyer?",
        answer:
          "An 'I Will Be Attending' flyer is a personalized event graphic featuring an attendee's photo and name inside the official event branding, signaling their commitment to attend and encouraging their peers to join.",
      },
      {
        question: "How does an organizer set up a DP template on EventRally?",
        answer:
          "Organizers go to the DP tab in their dashboard, upload their square frame artwork, drag the photo box to position it (circle or square), customize the attendee name font and color, and hit Publish.",
      },
      {
        question: "Can attendees generate a flyer without creating an account?",
        answer:
          "Yes. EventRally creates a public shareable DP link for each event, allowing attendees to generate and download their graphic in seconds with zero friction.",
      },
      {
        question: "What image formats are generated?",
        answer:
          "High-resolution PNG graphics optimized for WhatsApp Status, Instagram Stories, LinkedIn feeds, and X (Twitter) posts.",
      },
    ],
    relatedSlugs: ["event-promotion", "event-registration", "event-ticketing"],
    relatedGuideSlugs: ["how-to-create-an-i-will-be-attending-flyer", "how-to-sell-tickets-online-in-nigeria"],
  },

  "qr-check-in": {
    slug: "qr-check-in",
    title: "1-Second QR Event Check-In & Ticket Scanner",
    metaTitle: "QR Event Check-In & Ticket Scanner App | Fast Gate Verification",
    metaDescription: "Scan event tickets in 1 second with any phone camera. Offline digital pass wallet, real-time check-in stats, and anti-fraud duplicate scan protection.",
    badge: "GATE OPERATIONS",
    h1: "1-Second Gate QR Check-In & Real-Time Ticket Scanner",
    immediateAnswer:
      "EventRally's QR check-in system turns any smartphone, tablet, or laptop into a high-speed ticket validation terminal. Door staff scan attendee digital passes in under 1 second, prevent ticket fraud and duplicate entries in real time, and check in guests smoothly even with weak or zero venue internet.",
    problemHeading: "Long Queues, Weak Gate Internet & Fraudulent Ticket Passes",
    problemDescription:
      "Event gates are high-pressure environments. When paper printouts are used or gate scanner apps fail due to weak mobile reception at congested venues, entry lines stall, VIPs get frustrated, and fraudulent duplicate tickets slip through undetected.",
    problemPoints: [
      "Slow check-in processes causing 45-minute entry queues at venue entrances.",
      "Weak or dead cellular connectivity at crowded venues paralyzing online lookup tools.",
      "Shared screenshots or forged PDF tickets causing double entries and lost revenue.",
      "Relying on expensive, dedicated handheld scanner hardware rentals.",
    ],
    solutionHeading: "Instant Camera Verification With Built-In Offline Reliability",
    solutionDescription:
      "EventRally's browser-based gate scanner requires zero app downloads. Point any phone camera at the attendee's QR code for instant validation. Paired with attendee offline digital wallets, entry moves swiftly regardless of venue connectivity.",
    steps: [
      {
        step: "01",
        title: "Open Scanner on Any Device",
        description: "Door staff opens the Check-in tab on their phone or tablet browser—no app store install required.",
      },
      {
        step: "02",
        title: "Scan the Attendee's QR Pass",
        description: "Camera scans the digital pass in under 1 second, displaying attendee name and ticket tier.",
      },
      {
        step: "03",
        title: "Instant Fraud & Duplicate Protection",
        description: "The system immediately flags previously scanned codes to stop double entry at the door.",
      },
      {
        step: "04",
        title: "Live Attendance Metrics in Dashboard",
        description: "Track total entries versus total tickets sold live as doors open.",
      },
    ],
    benefits: [
      {
        title: "Sub-Second Camera Scanning",
        description: "Rapid optical recognition processes up to 40 attendees per minute per gate station.",
        badge: "SPEED",
      },
      {
        title: "Zero Hardware Rentals",
        description: "Runs directly in the browser on any existing Android phone, iPhone, iPad, or laptop webcam.",
        badge: "SAVINGS",
      },
      {
        title: "Duplicate Entry Prevention",
        description: "Prevents ticket sharing and screenshot forgery with instant visual and sound alerts.",
        badge: "SECURITY",
      },
      {
        title: "Manual Name Search Fallback",
        description: "Search by attendee name or email if a guest's phone battery died.",
        badge: "REDUNDANCY",
      },
    ],
    personas: [
      {
        role: "Concert, Festival & Nightlife Organizers",
        useCase: "Process thousands of attendees quickly at high-traffic doors without bottlenecking.",
      },
      {
        role: "Corporate Summit & Expo Managers",
        useCase: "Verify VIP and Executive passes with instant attendee name and badge classification.",
      },
      {
        role: "Campus & Community Event Staff",
        useCase: "Equip student volunteers with their own phones to manage entrance lanes effortlessly.",
      },
    ],
    faqs: [
      {
        question: "Do gate staff need to download a separate mobile app?",
        answer:
          "No. EventRally's scanner operates entirely in the browser on any modern smartphone, tablet, or laptop camera.",
      },
      {
        question: "What happens if the attendee's phone has no internet at the venue?",
        answer:
          "EventRally passes are cached in the attendee's offline wallet. They can present their scannable QR pass even with airplane mode enabled.",
      },
      {
        question: "Can multiple door staff scan tickets at the same time?",
        answer:
          "Yes. Multiple staff members can scan simultaneously across different gates with real-time synchronization.",
      },
    ],
    relatedSlugs: ["attendee-management", "event-ticketing", "event-registration"],
    relatedGuideSlugs: ["how-to-check-in-attendees-using-qr-codes", "how-to-sell-tickets-online-in-nigeria"],
  },

  "attendee-management": {
    slug: "attendee-management",
    title: "Event Attendee Management & Guest List",
    metaTitle: "Event Attendee Management Software | Guest List & Roster Export",
    metaDescription: "Manage event guest lists, search registrations, filter by ticket tier, and export clean CSV rosters for venue security, badges, and accounting.",
    badge: "ATTENDEE ROSTER",
    h1: "Centralized Event Attendee Management & Guest List Control",
    immediateAnswer:
      "EventRally Attendee Management provides event organizers with a real-time, searchable database of all registered guests. Organizers can filter by ticket tier, track check-in timestamps, execute manual check-ins, and export clean CSV rosters for badge printing and security clearance.",
    problemHeading: "Scattered Attendee Data and Disjointed Guest Lists",
    problemDescription:
      "When attendee data is fragmented across payment gateway dashboards, form exports, and email threads, organizers struggle to maintain an accurate guest list. Making last-minute VIP list updates, checking registration status, or preparing badge printing rosters becomes an error-prone administrative nightmare.",
    problemPoints: [
      "Inaccurate or outdated guest rosters causing confusion at security checkpoints.",
      "Difficulty distinguishing paid VIP guests from general attendees.",
      "Manual data merging across payment receipts and signup forms.",
      "No real-time audit trail of which attendees have actually entered the venue.",
    ],
    solutionHeading: "A Real-Time Roster With Complete Operational Control",
    solutionDescription:
      "Every ticket sale and RSVP is instantly cataloged in your Attendee Directory. Search by name, email, or reference ID in real time, view exact check-in times, and export clean data formatted for all standard spreadsheet and CRM tools.",
    steps: [
      {
        step: "01",
        title: "Real-Time Registration Sync",
        description: "Attendees appear on your roster the instant they complete checkout or RSVP.",
      },
      {
        step: "02",
        title: "Filter by Ticket Tier & Status",
        description: "Segment attendees by VIP, Regular, Checked-In, or Pending status with one click.",
      },
      {
        step: "03",
        title: "Execute Manual Check-Ins When Needed",
        description: "Manually admit attendees who forgot their phone or cannot find their QR pass.",
      },
      {
        step: "04",
        title: "1-Click CSV Roster Export",
        description: "Download sanitized spreadsheets for badge printing, security, and post-event analytics.",
      },
    ],
    benefits: [
      {
        title: "Instant Search & Filtering",
        description: "Locate any attendee among thousands in milliseconds by typing their name or email.",
        badge: "EFFICIENCY",
      },
      {
        title: "Clean CSV Export",
        description: "Export full attendee rosters with ticket types, purchase timestamps, and payment status.",
        badge: "LOGISTICS",
      },
      {
        title: "Live Attendance Tracking",
        description: "Know exactly how many guests are inside your venue at any given minute.",
        badge: "VISIBILITY",
      },
      {
        title: "Integrated Messaging",
        description: "Send broadcast updates directly to filtered segments of your attendee directory.",
        badge: "COMMUNICATION",
      },
    ],
    personas: [
      {
        role: "Event Operations & Logistics Managers",
        useCase: "Coordinate security lists, badge creation, and seating arrangements with up-to-the-minute data.",
      },
      {
        role: "Corporate Executive Event Planners",
        useCase: "Maintain strict VIP guest rosters and provide executive attendance reports post-event.",
      },
      {
        role: "Community Event Hosts",
        useCase: "Maintain a verified directory of community members across recurring events.",
      },
    ],
    faqs: [
      {
        question: "Can I export my attendee list to Excel or Google Sheets?",
        answer:
          "Yes. EventRally allows organizers to export their entire attendee roster to CSV format with a single click.",
      },
      {
        question: "Can I manually check in an attendee if they lose their ticket?",
        answer:
          "Yes. Organizers and door staff can search the attendee list by name or email and click Check In directly from the directory.",
      },
      {
        question: "Is attendee personal data secure?",
        answer:
          "Yes. All attendee data is secured with PostgreSQL Row Level Security (RLS) and is only accessible by authorized event organizers and administrators.",
      },
    ],
    relatedSlugs: ["qr-check-in", "event-messaging", "event-ticketing"],
    relatedGuideSlugs: ["how-to-check-in-attendees-using-qr-codes", "how-to-send-reminders-and-updates-to-event-attendees"],
  },

  "event-messaging": {
    slug: "event-messaging",
    title: "Event Messaging & Attendee Broadcasts",
    metaTitle: "SMS & Email Broadcasts for Event Attendees | EventRally",
    metaDescription: "Send instant SMS and email updates, venue directions, and schedule reminders directly to registered attendees without third-party email tools.",
    badge: "DIRECT BROADCASTS",
    h1: "Direct SMS & Email Broadcasts for Event Attendees",
    immediateAnswer:
      "EventRally Event Messaging allows organizers to compose and send direct SMS and email broadcasts to registered guests directly from their organizer dashboard. Organizers can communicate venue changes, parking instructions, schedule adjustments, and post-event thank-you notes without configuring external email marketing software.",
    problemHeading: "Disconnected Communication and Low Email Open Rates",
    problemDescription:
      "When event updates happen—such as a venue change, parking adjustment, or schedule shift—organizers often struggle to reach their attendees quickly. Exporting CSVs into separate email tools or copying phone numbers into bulk SMS portals causes delays, message bounces, and confusing formatting.",
    problemPoints: [
      "Exporting attendee data into third-party email tools creates delays during urgent updates.",
      "Email spam filters causing critical venue change notices to be missed.",
      "Difficulty segmenting VIP attendees from general admission for tailored instructions.",
      "Inability to send post-event materials and feedback requests easily.",
    ],
    solutionHeading: "Built-In Broadcast Engine Connected Directly to Your Roster",
    solutionDescription:
      "EventRally integrates messaging directly into your event lifecycle. Compose a broadcast, select your audience segment (all attendees, VIPs, or checked-in guests), and deliver updates instantly.",
    steps: [
      {
        step: "01",
        title: "Compose Your Broadcast in Campaigns Tab",
        description: "Draft your announcement, schedule note, venue direction, or reminder message.",
      },
      {
        step: "02",
        title: "Select Your Target Audience",
        description: "Choose to broadcast to all registered attendees or filter by specific ticket tiers.",
      },
      {
        step: "03",
        title: "Send Instantly or Schedule Ahead",
        description: "Broadcast immediately or time announcements for event morning reminders.",
      },
      {
        step: "04",
        title: "Keep Attendees Informed & Engaged",
        description: "Deliver frictionless communication that enhances attendee satisfaction and reduces gate confusion.",
      },
    ],
    benefits: [
      {
        title: "Zero External Software Needed",
        description: "No Mailchimp, SendGrid, or separate bulk SMS portal required. Broadcast right from EventRally.",
        badge: "CONVENIENCE",
      },
      {
        title: "Precision Audience Segmentation",
        description: "Send parking instructions only to VIP table holders, or schedule notes to workshop participants.",
        badge: "TARGETING",
      },
      {
        title: "Event-Day Operational Calm",
        description: "Resolve gate confusion instantly with bulk reminder broadcasts on the morning of the event.",
        badge: "RELIABILITY",
      },
      {
        title: "Post-Event Follow-Up",
        description: "Send presentation slides, thank-you messages, and feedback surveys following the event.",
        badge: "RETENTION",
      },
    ],
    personas: [
      {
        role: "Conference Directors",
        useCase: "Send keynote speaker schedule updates and session room locations to attendees.",
      },
      {
        role: "Music & Festival Promoters",
        useCase: "Broadcast gate opening times, security rules, and parking advisories on event morning.",
      },
      {
        role: "Workshop Facilitators",
        useCase: "Deliver pre-reading materials and post-workshop resources directly to participants.",
      },
    ],
    faqs: [
      {
        question: "Can I send messages to specific ticket types only?",
        answer:
          "Yes. You can target broadcasts to all attendees or filter by specific ticket tiers such as VIP, Regular, or Student.",
      },
      {
        question: "Do I need to connect my own email or SMS API keys?",
        answer:
          "No. EventRally handles message delivery directly through its integrated platform infrastructure.",
      },
      {
        question: "Can I send post-event thank-you emails?",
        answer:
          "Yes. You can broadcast post-event messages with download links, presentation slides, or feedback forms anytime.",
      },
    ],
    relatedSlugs: ["attendee-management", "event-ticketing", "event-registration"],
    relatedGuideSlugs: ["how-to-send-reminders-and-updates-to-event-attendees", "how-to-sell-tickets-online-in-nigeria"],
  },

  "event-promotion": {
    slug: "event-promotion",
    title: "Event Promotion & Viral Growth",
    metaTitle: "Promote Your Event Online | Attendee-Powered Viral Marketing",
    metaDescription: "Turn ticket buyers into your loudest promoters. Attendee-generated flyers, one-click social sharing, and viral growth loops that sell out events.",
    badge: "VIRAL ACQUISITION",
    h1: "Promote Your Event Online With Attendee-Powered Viral Marketing",
    immediateAnswer:
      "EventRally Event Promotion turns every registered attendee into an authentic marketing ambassador. By combining automated 'I Will Be Attending' personalized flyers with frictionless social sharing triggers at ticket checkout, organizers generate explosive organic ticket sales without burning advertising budgets.",
    problemHeading: "Why Traditional Event Advertising Costs Keep Rising",
    problemDescription:
      "Event organizers frequently allocate 30% to 50% of their total budget to social media advertisements. As digital ad costs rise and ad fatigue worsens, sponsored posts produce diminishing returns. Meanwhile, prospective attendees trust recommendations from friends and colleagues far more than sponsored banners.",
    problemPoints: [
      "Rising cost-per-click on social ad platforms eroding event profitability.",
      "Generic event banners failing to generate genuine excitement or social proof.",
      "No mechanism to incentivize or empower ticket buyers to invite their own network.",
      "Relying solely on organizer-authored posts rather than attendee-led distribution.",
    ],
    solutionHeading: "A Built-In Viral Growth Engine for Live Experiences",
    solutionDescription:
      "EventRally builds organic promotion directly into the attendee journey. From the moment an attendee registers, they are prompted to create their branded flyer and share it to WhatsApp Status, Instagram, and X with a single tap.",
    steps: [
      {
        step: "01",
        title: "Attendee Secures Ticket or RSVP",
        description: "The confirmation screen immediately offers 1-click Display Picture generation and social sharing.",
      },
      {
        step: "02",
        title: "Personalized Branded Flyer Generated",
        description: "Attendee's selfie and name are merged into your official event artwork in seconds.",
      },
      {
        step: "03",
        title: "Attendee Shares Across Status & Stories",
        description: "Guests proudly announce their attendance on WhatsApp Status, Instagram, LinkedIn, and X.",
      },
      {
        step: "04",
        title: "Friends & Network Buy Tickets",
        description: "Direct clickable links on the shared posts drive new attendees into your ticketing funnel.",
      },
    ],
    benefits: [
      {
        title: "Massive Peer-to-Peer Distribution",
        description: "Harness the combined social reach of hundreds of attendees posting simultaneously.",
        badge: "ORGANIC REACH",
      },
      {
        title: "Lower Customer Acquisition Cost",
        description: "Sell out your venue with authentic social proof rather than costly pay-per-click ad campaigns.",
        badge: "ROI",
      },
      {
        title: "Authentic Social Validation",
        description: "Real faces and names build unmatched credibility and FOMO (Fear Of Missing Out).",
        badge: "TRUST",
      },
      {
        title: "Public Event Directory Discovery",
        description: "Your event is indexed in the public EventRally directory for category and location searches.",
        badge: "DISCOVERY",
      },
    ],
    personas: [
      {
        role: "Festival & Entertainment Promoters",
        useCase: "Ignite viral FOMO across music fans and party-goers across major urban centers.",
      },
      {
        role: "Campus & University Organizers",
        useCase: "Dominate student WhatsApp groups and status feeds to drive record student attendance.",
      },
      {
        role: "Professional Conference Producers",
        useCase: "Encourage industry delegates and speakers to share their participation on LinkedIn.",
      },
    ],
    faqs: [
      {
        question: "How does attendee-generated promotion compare to paid ads?",
        answer:
          "Studies and real event data show that personal recommendations from friends convert at 4x to 8x the rate of sponsored social media advertisements.",
      },
      {
        question: "Does EventRally list my event on search engines?",
        answer:
          "Yes. Every public event gets a crawlable, schema-optimized landing page indexed for Google search and discovery.",
      },
      {
        question: "What social platforms do attendees share their flyers to?",
        answer:
          "EventRally fliers are formatted for WhatsApp Status, Instagram Stories, LinkedIn feeds, X (Twitter), and Facebook.",
      },
    ],
    relatedSlugs: ["viral-dp-generator", "event-ticketing", "event-registration"],
    relatedGuideSlugs: ["how-to-create-an-i-will-be-attending-flyer", "how-to-sell-tickets-online-in-nigeria"],
  },
};
