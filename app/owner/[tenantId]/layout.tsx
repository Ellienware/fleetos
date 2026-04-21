import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getTenantById } from '@/lib/appwrite/collections/tenants';
import { OwnerSidebar } from '@/components/owner/owner-sidebar';
import { OwnerHeader } from '@/components/owner/owner-header';
import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';

// Helper to strip non‑serializable properties (functions, prototypes)
function toPlainObject<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export default async function OwnerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  // Only owners can access this portal
  if (session.role !== 'OWNER') {
    redirect('/dashboard');
  }
  
  // Owners can only access their own tenant
  if (session.tenantId !== tenantId) {
    redirect('/dashboard');
  }
  
  // Fetch tenant data
  let tenant;
  try {
    tenant = await getTenantById(tenantId);
  } catch (error) {
    console.error('Error fetching tenant:', error);
    tenant = null;
  }
  
  if (!tenant) {
    notFound();
  }

  // Sanitize objects to remove non‑serializable properties
  const safeSession = toPlainObject(session);
  const safeTenant = toPlainObject(tenant);

  return (
    <SidebarProvider>
      <OwnerSidebar user={safeSession} tenant={safeTenant} />
      <SidebarInset>
        <OwnerHeader user={safeSession} tenant={safeTenant} />
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
