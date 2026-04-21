import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getTenantById } from '@/lib/appwrite/collections/tenants';
import { TenantSidebar } from '@/components/tenant/tenant-sidebar';
import { TenantHeader } from '@/components/tenant/tenant-header';
import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';

export default async function TenantLayout({
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
  
  // Super admins can access any tenant, others only their own
  if (session.role !== 'SUPER_ADMIN' && session.tenantId !== tenantId) {
    redirect('/dashboard');
  }
  
  // Fetch tenant data from database
  let tenant;
  try {
    tenant = await getTenantById(tenantId);
  } catch (error) {
    console.error('Error fetching tenant:', error);
    tenant = {
      $id: tenantId,
      name: 'Demo Association',
      slug: 'demo',
      subscriptionStatus: 'active',
    };
  }
  
  if (!tenant) {
    notFound();
  }

  // ✅ Extract only serializable properties (no functions)
  const safeSession = {
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
    tenantId: session.tenantId,
    tenantSlug: session.tenantSlug,
  };

  const safeTenant = {
    $id: tenant.$id,
    name: tenant.name,
    slug: tenant.slug,
    logo: tenant.logo,
    address: tenant.address,
    phone: tenant.phone,
    email: tenant.email,
    registrationNumber: tenant.registrationNumber,
    subscriptionId: tenant.subscriptionId,
    subscriptionStatus: tenant.subscriptionStatus,
    settings: tenant.settings,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
  };

  return (
    <SidebarProvider>
      <TenantSidebar user={safeSession} tenant={safeTenant} />
      <SidebarInset>
        <TenantHeader user={safeSession} tenant={safeTenant} />
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}