import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AuthGuard } from '@/components/admin/AuthGuard';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-studio-dark">
          <AdminSidebar />
          <main className="flex-1 overflow-auto">
            <header className="h-16 border-b border-gold/20 flex items-center px-6 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
              <SidebarTrigger className="text-gold" />
            </header>
            <div className="p-6">
              {children || <Outlet />}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
