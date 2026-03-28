import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScrollToTop } from "@/components/ScrollToTop";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

import DashboardLayout from "./layouts/DashboardLayout";
import DashboardOverview from "./pages/dashboard/Overview";
import Placeholder from "./pages/dashboard/Placeholder";

import AdminLayout from "./layouts/AdminLayout";
import AdminOverview from "./pages/admin/Overview";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Organiser Dashboard */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="events" element={<Placeholder />} />
            <Route path="attendees" element={<Placeholder />} />
            <Route path="tickets" element={<Placeholder />} />
            <Route path="checkin" element={<Placeholder />} />
            <Route path="dp" element={<Placeholder />} />
            <Route path="campaigns" element={<Placeholder />} />
            <Route path="analytics" element={<Placeholder />} />
            <Route path="payments" element={<Placeholder />} />
            <Route path="settings" element={<Placeholder />} />
          </Route>

          {/* Super Admin */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="events" element={<Placeholder />} />
            <Route path="organisers" element={<Placeholder />} />
            <Route path="transactions" element={<Placeholder />} />
            <Route path="disputes" element={<Placeholder />} />
            <Route path="settings" element={<Placeholder />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
