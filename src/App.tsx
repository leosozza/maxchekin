import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
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
import LeadCreationConfig from "./pages/admin/LeadCreationConfig";
import { InstallPWA } from "./components/InstallPWA";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <InstallPWA />
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <BrowserRouter>
        <Routes>
          {/* PWA Main Route - Directly to Check-in */}
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
            <Route path="field-mapping" element={<FieldMapping />} />
            <Route path="custom-fields" element={<CustomFields />} />
            <Route path="checkin-settings" element={<CheckInSettings />} />
            <Route path="lead-creation-config" element={<LeadCreationConfig />} />
            <Route path="users" element={<Users />} />
            <Route path="lead-search" element={<LeadSearch />} />
            <Route path="logs" element={<Logs />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
