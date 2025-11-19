import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Monitor,
  Webhook,
  Film,
  Map,
  FileText,
  Settings,
  LogOut,
  Database,
  QrCode,
  Users,
  Sparkles,
  UserSearch,
  UserPlus,
  LayoutGrid,
  Smartphone,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const allMenuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, page: 'dashboard' },
  { title: 'Painéis', url: '/admin/panels', icon: Monitor, page: 'admin.panels' },
  { title: 'Webhooks', url: '/admin/webhooks', icon: Webhook, page: 'admin.webhooks' },
  { title: 'Mídias', url: '/admin/media', icon: Film, page: 'admin.media' },
  { title: 'Kanban', url: '/admin/kanban', icon: LayoutGrid, page: 'admin.kanban' },
  { title: 'Logs', url: '/admin/logs', icon: FileText, page: 'admin.logs' },
  { title: 'Buscar Leads', url: '/admin/lead-search', icon: UserSearch, page: 'admin.lead-search' },
  { title: 'Check-in', url: '/admin/checkin-settings', icon: QrCode, page: 'admin.checkin-settings' },
  { title: 'Campos Customizados', url: '/admin/custom-fields', icon: Database, page: 'admin.custom-fields', adminOnly: true },
  { title: 'Mapeamento', url: '/admin/field-mapping', icon: Map, page: 'admin.field-mapping', adminOnly: true },
  { title: 'Usuários', url: '/admin/users', icon: Users, page: 'admin.users', adminOnly: true },
  { title: 'Configurações', url: '/admin/settings', icon: Settings, page: 'admin.settings', adminOnly: true },
  { title: 'Gerenciar APK', url: '/admin/apk-settings', icon: Smartphone, page: 'admin.apk-settings', adminOnly: true },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { signOut, user, isAdmin } = useAuth();
  const { canAccessPage } = usePagePermissions();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  // Filtrar itens baseado em permissões
  const menuItems = allMenuItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    return canAccessPage(item.page);
  });

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar
      className={state === 'collapsed' ? 'w-14' : 'w-60'}
      collapsible="icon"
    >
      <div className="p-4 border-b border-gold/20">
        {state !== 'collapsed' && (
          <h1 className="text-xl font-bold text-gold">MaxCheckin</h1>
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/60">Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? 'bg-gold/20 text-gold font-medium'
                          : 'text-white/80 hover:bg-white/5'
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {state !== 'collapsed' && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto p-4 border-t border-gold/20">
        {state !== 'collapsed' && user && (
          <div className="mb-2 text-xs text-white/60 truncate">
            {user.email}
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start text-white/80 hover:bg-white/5"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {state !== 'collapsed' && <span className="ml-2">Sair</span>}
        </Button>
      </div>
    </Sidebar>
  );
}