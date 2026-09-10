import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/ThemeProvider";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import EventDetails from "./pages/EventDetails";
import TicketView from "./pages/TicketView";

import DashboardLayout from "./layouts/DashboardLayout";
import DashboardOverview from "./pages/dashboard/Overview";
import Events from "./pages/dashboard/Events";
import CreateEvent from "./pages/dashboard/CreateEvent";
import Tickets from "./pages/dashboard/Tickets";
import Attendees from "./pages/dashboard/Attendees";
import Checkin from "./pages/dashboard/Checkin";
import DPGenerator from "./pages/dashboard/DPGenerator";
import Campaigns from "./pages/dashboard/Campaigns";
import Analytics from "./pages/dashboard/Analytics";
import Payments from "./pages/dashboard/Payments";
import Settings from "./pages/dashboard/Settings";
import DPAttendeeView from "./pages/DPAttendeeView";

import AdminLayout from "./layouts/AdminLayout";
import AdminOverview from "./pages/admin/Overview";
import AdminEvents from "./pages/admin/Events";
import AdminOrganisers from "./pages/admin/Organisers";
import AdminTransactions from "./pages/admin/Transactions";
import AdminDisputes from "./pages/admin/Disputes";
import AdminFeedback from "./pages/admin/FeedbackList";
import AdminSettings from "./pages/admin/Settings";

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
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/events/:id" element={<EventDetails />} />
            <Route path="/events/:id/dp" element={<DPAttendeeView />} />
            <Route path="/tickets/:id" element={<TicketView />} />

            {/* Dashboard (Organisers & Attendees) */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
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
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout />
              </ProtectedRoute>
            }>
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
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
