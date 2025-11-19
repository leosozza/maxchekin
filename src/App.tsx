import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthGuard } from "@/components/admin/AuthGuard";
import CheckInNew from "./pages/CheckInNew";
import NotFound from "./pages/NotFound";
import Login from "./pages/admin/Login";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Settings from "./pages/admin/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <BrowserRouter>
        <Routes>
          {/* Main Route - Check-in */}
          <Route path="/" element={<CheckInNew />} />
          <Route path="/checkin" element={<CheckInNew />} />

          {/* Dashboard - Accessible to all authenticated users */}
          <Route path="/dashboard" element={
            <AuthGuard>
              <AdminLayout>
                <Dashboard />
              </AdminLayout>
            </AuthGuard>
          } />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin/settings" element={
            <AuthGuard requireRole="admin">
              <AdminLayout>
                <Settings />
              </AdminLayout>
            </AuthGuard>
          } />

          {/* CATCH-ALL */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
