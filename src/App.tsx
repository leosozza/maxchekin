import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthGuard } from "@/components/admin/AuthGuard";
import Home from "./pages/Home";
import CheckInNew from "./pages/CheckInNew";
import PainelDinamico from "./pages/PainelDinamico";
import NotFound from "./pages/NotFound";
import Login from "./pages/admin/Login";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Panels from "./pages/admin/Panels";
import PanelForm from "./pages/admin/PanelForm";
import PanelLayoutEditor from "./pages/admin/PanelLayoutEditor";
import Webhooks from "./pages/admin/Webhooks";
import Media from "./pages/admin/Media";
import FieldMapping from "./pages/admin/FieldMapping";
import Logs from "./pages/admin/Logs";
import Settings from "./pages/admin/Settings";
import CustomFields from "./pages/admin/CustomFields";
import CheckInSettings from "./pages/admin/CheckInSettings";
import Users from "./pages/admin/Users";
import LeadSearch from "./pages/admin/LeadSearch";
import ApkSettings from "./pages/admin/ApkSettings";
import KanbanBoard from "./pages/admin/KanbanBoard";

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

          {/* Panel Selection (Admin Only) */}
          <Route path="/home" element={<Home />} />
          <Route path="/painel/:slug" element={<PainelDinamico />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="panels" element={<Panels />} />
            <Route path="panels/new" element={<PanelForm />} />
            <Route path="panels/:id/edit" element={<PanelForm />} />
            <Route path="panels/:id/editor" element={<PanelLayoutEditor />} />
            <Route path="webhooks" element={<Webhooks />} />
            <Route path="media" element={<Media />} />
            <Route path="lead-search" element={<LeadSearch />} />
            <Route path="logs" element={<Logs />} />
            <Route path="kanban" element={<KanbanBoard />} />
            <Route path="checkin-settings" element={<CheckInSettings />} />
            
            {/* Rotas apenas para Admin */}
            <Route path="users" element={
              <AuthGuard requireRole="admin">
                <Users />
              </AuthGuard>
            } />
            <Route path="field-mapping" element={
              <AuthGuard requireRole="admin">
                <FieldMapping />
              </AuthGuard>
            } />
            <Route path="custom-fields" element={
              <AuthGuard requireRole="admin">
                <CustomFields />
              </AuthGuard>
            } />
            <Route path="apk-settings" element={
              <AuthGuard requireRole="admin">
                <ApkSettings />
              </AuthGuard>
            } />
            <Route path="settings" element={
              <AuthGuard requireRole="admin">
                <Settings />
              </AuthGuard>
            } />
          </Route>

          {/* CATCH-ALL */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
