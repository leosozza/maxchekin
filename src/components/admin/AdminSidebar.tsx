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

import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const menuItems = [
  { 
    title: 'Dashboard', 
    url: '/dashboard', 
    icon: LayoutDashboard 
  },
  { 
    title: 'Configurações', 
    url: '/admin/settings', 
    icon: Settings,
    adminOnly: true 
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const { signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Filtrar itens baseado em permissões
  const filteredItems = menuItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
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