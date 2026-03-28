export const featuredEvents = [
  {
    id: "1",
    title: "Lagos Tech Summit 2026",
    date: "Apr 15 – 17, 2026",
    venue: "Eko Convention Centre, Lagos",
    price: "₦15,000",
    category: "Conference",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop",
    attendees: 2400,
  },
  {
    id: "2",
    title: "Accra Worship Experience",
    date: "May 3, 2026",
    venue: "National Theatre, Accra",
    price: "Free",
    category: "Church Event",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=400&fit=crop",
    attendees: 5000,
  },
  {
    id: "3",
    title: "Nairobi Startup Expo",
    date: "Jun 10 – 12, 2026",
    venue: "KICC, Nairobi",
    price: "KSh 2,500",
    category: "Trade Show",
    image: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&h=400&fit=crop",
    attendees: 1800,
  },
  {
    id: "4",
    title: "UNILAG Freshers' Ball",
    date: "Sep 20, 2026",
    venue: "Multipurpose Hall, UNILAG",
    price: "₦3,000",
    category: "Campus Event",
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=400&fit=crop",
    attendees: 800,
  },
  {
    id: "5",
    title: "Kigali Design Week",
    date: "Jul 7 – 9, 2026",
    venue: "Kigali Convention Centre",
    price: "$50",
    category: "Conference",
    image: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600&h=400&fit=crop",
    attendees: 1200,
  },
  {
    id: "6",
    title: "Abuja Food Festival",
    date: "Aug 14, 2026",
    venue: "Millennium Park, Abuja",
    price: "₦5,000",
    category: "Festival",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop",
    attendees: 3500,
  },
];

export const eventCategories = [
  { name: "Conferences", icon: "🎤", count: 240 },
  { name: "Trade Shows", icon: "🏪", count: 180 },
  { name: "Church Events", icon: "⛪", count: 320 },
  { name: "Campus Events", icon: "🎓", count: 450 },
  { name: "Festivals", icon: "🎉", count: 160 },
  { name: "Workshops", icon: "🛠️", count: 290 },
];

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

export const organiserStats = {
  totalEvents: 12,
  totalAttendees: 8420,
  totalRevenue: "₦4,250,000",
  totalCheckins: 6890,
  recentRegistrations: [
    { name: "Adaeze Okonkwo", event: "Lagos Tech Summit", time: "2 min ago" },
    { name: "Kwame Mensah", event: "Accra Worship Experience", time: "5 min ago" },
    { name: "Fatima Bello", event: "Lagos Tech Summit", time: "12 min ago" },
    { name: "David Osei", event: "Nairobi Startup Expo", time: "18 min ago" },
    { name: "Ngozi Eze", event: "UNILAG Freshers' Ball", time: "25 min ago" },
  ],
  upcomingEvents: [
    { title: "Lagos Tech Summit 2026", date: "Apr 15", sold: 1800, total: 2400 },
    { title: "Brand Workshop Series", date: "Apr 22", sold: 45, total: 100 },
    { title: "DevFest Lagos", date: "May 1", sold: 320, total: 500 },
  ],
};

export const adminStats = {
  totalOrganisers: 342,
  totalEvents: 1280,
  totalRevenue: "₦128,500,000",
  activeToday: 45,
  pendingPayouts: "₦12,300,000",
  organisers: [
    { name: "TechCabal Events", events: 24, revenue: "₦18,200,000", status: "active" },
    { name: "Grace Chapel", events: 52, revenue: "₦2,100,000", status: "active" },
    { name: "UniLag SUG", events: 18, revenue: "₦890,000", status: "active" },
    { name: "Kigali Hub", events: 8, revenue: "₦5,400,000", status: "suspended" },
    { name: "Abuja Foodies", events: 12, revenue: "₦3,200,000", status: "active" },
  ],
};
