import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Loader2 } from "lucide-react";

// Lazy-load all page components for optimal code splitting and performance
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const NotFound = lazy(() => import("./pages/NotFound"));
const EventDetails = lazy(() => import("./pages/EventDetails"));
const TicketView = lazy(() => import("./pages/TicketView"));
const EventsDiscovery = lazy(() => import("./pages/EventsDiscovery"));

// Feature Landing Pages & Clusters
const FeaturesHub = lazy(() => import("./pages/features/FeaturesHub"));
const FeatureDetail = lazy(() => import("./pages/features/FeatureDetail"));

// Educational Guides & Knowledge Hub
const GuidesHub = lazy(() => import("./pages/guides/GuidesHub"));
const GuideDetail = lazy(() => import("./pages/guides/GuideDetail"));

const DashboardLayout = lazy(() => import("./layouts/DashboardLayout"));
const DashboardOverview = lazy(() => import("./pages/dashboard/Overview"));
const Events = lazy(() => import("./pages/dashboard/Events"));
const CreateEvent = lazy(() => import("./pages/dashboard/CreateEvent"));
const Tickets = lazy(() => import("./pages/dashboard/Tickets"));
const Attendees = lazy(() => import("./pages/dashboard/Attendees"));
const Checkin = lazy(() => import("./pages/dashboard/Checkin"));
const DPGenerator = lazy(() => import("./pages/dashboard/DPGenerator"));
const Campaigns = lazy(() => import("./pages/dashboard/Campaigns"));
const Analytics = lazy(() => import("./pages/dashboard/Analytics"));
const Payments = lazy(() => import("./pages/dashboard/Payments"));
const Settings = lazy(() => import("./pages/dashboard/Settings"));
const DPAttendeeView = lazy(() => import("./pages/DPAttendeeView"));

const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/Overview"));
const AdminEvents = lazy(() => import("./pages/admin/Events"));
const AdminOrganisers = lazy(() => import("./pages/admin/Organisers"));
const AdminTransactions = lazy(() => import("./pages/admin/Transactions"));
const AdminDisputes = lazy(() => import("./pages/admin/Disputes"));
const AdminFeedback = lazy(() => import("./pages/admin/FeedbackList"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));

// Minimal full-screen loading spinner shown while lazy chunks load
const PageLoader = () => (
  <div className="flex h-screen items-center justify-center bg-background">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Core Public Hubs & Marketing */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/events" element={<EventsDiscovery />} />
                <Route path="/events/:id" element={<EventDetails />} />
                <Route path="/events/:id/dp" element={<DPAttendeeView />} />
                <Route path="/tickets/:id" element={<TicketView />} />

                {/* Feature Clusters & Discoverability Landing Pages */}
                <Route path="/features" element={<FeaturesHub />} />
                <Route path="/features/:slug" element={<FeatureDetail />} />

                {/* Educational Guides & Search Intent Hub */}
                <Route path="/guides" element={<GuidesHub />} />
                <Route path="/guides/:slug" element={<GuideDetail />} />

                {/* Dashboard (Organisers & Attendees) */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardOverview />} />
                  <Route path="events" element={<Events />} />
                  <Route path="events/create" element={<CreateEvent />} />
                  <Route path="events/:id/edit" element={<CreateEvent />} />
                  <Route path="attendees" element={<Attendees />} />
                  <Route path="tickets" element={<Tickets />} />
                  <Route path="checkin" element={<Checkin />} />
                  <Route path="dp" element={<DPGenerator />} />
                  <Route path="campaigns" element={<Campaigns />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="payments" element={<Payments />} />
                  <Route path="settings" element={<Settings />} />
                </Route>

                {/* Super Admin */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminOverview />} />
                  <Route path="events" element={<AdminEvents />} />
                  <Route path="organisers" element={<AdminOrganisers />} />
                  <Route path="transactions" element={<AdminTransactions />} />
                  <Route path="disputes" element={<AdminDisputes />} />
                  <Route path="feedback" element={<AdminFeedback />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
