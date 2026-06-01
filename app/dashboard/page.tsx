import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getDashboardPath } from '@/lib/auth/rbac';
export const dynamic = 'force-dynamic';
export default async function DashboardPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  // Redirect to role-appropriate dashboard
  const dashboardPath = getDashboardPath(session);
  redirect(dashboardPath);
}
