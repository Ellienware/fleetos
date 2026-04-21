import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Building2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatsCards } from '@/components/admin/stats-cards';
import { getAllTenants, getTenantStats } from '@/lib/appwrite/collections/tenants';
import { createAdminClient, Query } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
};

async function getPlatformStats() {
  const { databases } = createAdminClient();
  const { databaseId } = APPWRITE_CONFIG;

  try {
    const [tenantsRes, ownersRes, vehiclesRes, paymentsRes] = await Promise.all([
      databases.listDocuments(databaseId, COLLECTIONS.TENANTS, [Query.limit(1)]),
      databases.listDocuments(databaseId, COLLECTIONS.OWNERS, [Query.limit(1)]),
      databases.listDocuments(databaseId, COLLECTIONS.VEHICLES, [Query.limit(1)]),
      databases.listDocuments(databaseId, COLLECTIONS.MEMBERSHIP_PAYMENTS, [
        Query.equal('status', 'completed'),
      ]),
    ]);

    // Calculate monthly revenue
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthlyPaymentsRes = await databases.listDocuments(
      databaseId,
      COLLECTIONS.MEMBERSHIP_PAYMENTS,
      [
        Query.equal('status', 'completed'),
        Query.greaterThanEqual('paidAt', startOfMonth),
      ]
    );

    const monthlyRevenue = monthlyPaymentsRes.documents.reduce(
      (sum: number, p: any) => sum + (p.amount || 0),
      0
    );

    // Count active tenants (active subscription status)
    const activeTenantsRes = await databases.listDocuments(
      databaseId,
      COLLECTIONS.TENANTS,
      [Query.equal('subscriptionStatus', 'active'), Query.limit(1)]
    );

    return {
      totalTenants: tenantsRes.total,
      activeTenants: activeTenantsRes.total,
      totalOwners: ownersRes.total,
      totalVehicles: vehiclesRes.total,
      monthlyRevenue,
      activeSubscriptions: activeTenantsRes.total,
    };
  } catch (error) {
    console.error('Failed to fetch platform stats:', error);
    return {
      totalTenants: 0,
      activeTenants: 0,
      totalOwners: 0,
      totalVehicles: 0,
      monthlyRevenue: 0,
      activeSubscriptions: 0,
    };
  }
}

async function getRecentTenants() {
  const { databases } = createAdminClient();
  const { databaseId } = APPWRITE_CONFIG;

  try {
    const tenantsRes = await databases.listDocuments(
      databaseId,
      COLLECTIONS.TENANTS,
      [Query.orderDesc('createdAt'), Query.limit(4)]
    );

    // For each tenant, get owner count
    const tenantsWithStats = await Promise.all(
      tenantsRes.documents.map(async (tenant: any) => {
        const ownersRes = await databases.listDocuments(
          databaseId,
          COLLECTIONS.OWNERS,
          [Query.equal('tenantId', tenant.$id), Query.limit(1)]
        );

        // Parse settings to get plan
        let plan = 'starter';
        try {
          const settings = typeof tenant.settings === 'string' 
            ? JSON.parse(tenant.settings) 
            : tenant.settings;
          plan = settings?.plan || 'starter';
        } catch {
          // Use default
        }

        return {
          id: tenant.$id,
          name: tenant.name,
          plan,
          status: tenant.subscriptionStatus || 'trial',
          owners: ownersRes.total,
          createdAt: tenant.createdAt,
        };
      })
    );

    return tenantsWithStats;
  } catch (error) {
    console.error('Failed to fetch recent tenants:', error);
    return [];
  }
}

async function getExpiringSubscriptions() {
  const { databases } = createAdminClient();
  const { databaseId } = APPWRITE_CONFIG;

  try {
    // Get subscriptions that expire within 7 days
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const subscriptionsRes = await databases.listDocuments(
      databaseId,
      COLLECTIONS.SUBSCRIPTIONS,
      [
        Query.lessThanEqual('currentPeriodEnd', sevenDaysFromNow.toISOString()),
        Query.greaterThan('currentPeriodEnd', now.toISOString()),
        Query.equal('status', 'active'),
        Query.limit(5),
      ]
    );

    // Get tenant details for each subscription
    const expiring = await Promise.all(
      subscriptionsRes.documents.map(async (sub: any) => {
        try {
          const tenant = await databases.getDocument(
            databaseId,
            COLLECTIONS.TENANTS,
            sub.tenantId
          );

          const expiryDate = new Date(sub.currentPeriodEnd);
          const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          return {
            id: sub.$id,
            name: tenant.name,
            plan: sub.plan,
            expiresIn: daysLeft,
          };
        } catch {
          return null;
        }
      })
    );

    return expiring.filter(Boolean);
  } catch (error) {
    console.error('Failed to fetch expiring subscriptions:', error);
    return [];
  }
}

function getPlanBadgeVariant(plan: string) {
  switch (plan) {
    case 'enterprise':
      return 'default';
    case 'growth':
      return 'secondary';
    default:
      return 'outline';
  }
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'active':
      return 'default';
    case 'trial':
      return 'secondary';
    case 'expired':
      return 'destructive';
    default:
      return 'outline';
  }
}

export default async function AdminDashboardPage() {
  const [stats, recentTenants, expiringSubscriptions] = await Promise.all([
    getPlatformStats(),
    getRecentTenants(),
    getExpiringSubscriptions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of all taxi associations on the platform.
        </p>
      </div>

      <StatsCards stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Associations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Associations</CardTitle>
              <CardDescription>Latest associations to join the platform</CardDescription>
            </div>
            <Link href="/admin/tenants">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentTenants.length > 0 ? (
              <div className="space-y-4">
                {recentTenants.map((tenant) => (
                  <div key={tenant.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tenant.owners} owners
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getPlanBadgeVariant(tenant.plan)}>
                        {tenant.plan}
                      </Badge>
                      <Badge variant={getStatusBadgeVariant(tenant.status)}>
                        {tenant.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No associations registered yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Expiring Subscriptions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Expiring Soon</CardTitle>
              <CardDescription>Subscriptions expiring within 7 days</CardDescription>
            </div>
            <Link href="/admin/subscriptions">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {expiringSubscriptions.length > 0 ? (
              <div className="space-y-4">
                {expiringSubscriptions.map((sub: any) => (
                  <div key={sub.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{sub.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {sub.plan} plan
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-warning">
                      {sub.expiresIn} days left
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No subscriptions expiring soon
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/tenants/new">
              <Button>Add Association</Button>
            </Link>
            <Link href="/admin/analytics">
              <Button variant="outline">View Analytics</Button>
            </Link>
            <Link href="/admin/subscriptions">
              <Button variant="outline">Manage Subscriptions</Button>
            </Link>
            <Link href="/admin/settings">
              <Button variant="outline">Platform Settings</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
