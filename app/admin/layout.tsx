import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';
import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  if (session.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  return (
    <SidebarProvider>
      <AdminSidebar user={session} />
      <SidebarInset>
        <AdminHeader user={session} />
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
