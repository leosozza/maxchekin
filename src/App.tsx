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

          {/* Panel Selection (Admin Only) */}
          <Route path="/home" element={<Home />} />
          <Route path="/painel/:slug" element={<PainelDinamico />} />

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
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="panels" element={
              <PermissionGuard page="admin.panels">
                <Panels />
              </PermissionGuard>
            } />
            <Route path="panels/new" element={
              <PermissionGuard page="admin.panels">
                <PanelForm />
              </PermissionGuard>
            } />
            <Route path="panels/:id/edit" element={
              <PermissionGuard page="admin.panels">
                <PanelForm />
              </PermissionGuard>
            } />
            <Route path="panels/:id/editor" element={
              <PermissionGuard page="admin.panels">
                <PanelLayoutEditor />
              </PermissionGuard>
            } />
            <Route path="webhooks" element={
              <PermissionGuard page="admin.webhooks">
                <Webhooks />
              </PermissionGuard>
            } />
            <Route path="media" element={
              <PermissionGuard page="admin.media">
                <Media />
              </PermissionGuard>
            } />
            <Route path="lead-search" element={
              <PermissionGuard page="admin.lead-search">
                <LeadSearch />
              </PermissionGuard>
            } />
            <Route path="logs" element={
              <PermissionGuard page="admin.logs">
                <Logs />
              </PermissionGuard>
            } />
            <Route path="kanban" element={
              <PermissionGuard page="admin.kanban">
                <KanbanBoard />
              </PermissionGuard>
            } />
            <Route path="checkin-settings" element={
              <PermissionGuard page="admin.checkin-settings">
                <CheckInSettings />
              </PermissionGuard>
            } />
            
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
