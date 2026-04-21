import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Search, MoreHorizontal, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAllTenants } from '@/lib/appwrite/collections/tenants';
import { createAdminClient, Query } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';

export const metadata: Metadata = {
  title: 'Associations',
};

async function getTenantsWithStats() {
  const { databases } = createAdminClient();
  const { databaseId } = APPWRITE_CONFIG;

  try {
    const tenants = await getAllTenants();

    // Get stats for each tenant
    const tenantsWithStats = await Promise.all(
      tenants.map(async (tenant) => {
        const [ownersRes, vehiclesRes] = await Promise.all([
          databases.listDocuments(databaseId, COLLECTIONS.OWNERS, [
            Query.equal('tenantId', tenant.$id),
            Query.limit(1),
          ]),
          databases.listDocuments(databaseId, COLLECTIONS.VEHICLES, [
            Query.equal('tenantId', tenant.$id),
            Query.limit(1),
          ]),
        ]);

        // Parse settings to get plan
        let plan = 'starter';
        try {
          const settings = typeof tenant.settings === 'string' 
            ? JSON.parse(tenant.settings as unknown as string) 
            : tenant.settings;
          plan = settings?.plan || 'starter';
        } catch {
          // Use default
        }

        return {
          id: tenant.$id,
          name: tenant.name,
          slug: tenant.slug,
          email: tenant.email,
          plan,
          status: tenant.subscriptionStatus || 'trial',
          owners: ownersRes.total,
          vehicles: vehiclesRes.total,
          createdAt: tenant.createdAt,
        };
      })
    );

    return tenantsWithStats;
  } catch (error) {
    console.error('Failed to fetch tenants:', error);
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

export default async function TenantsPage() {
  const tenants = await getTenantsWithStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Associations</h1>
          <p className="text-muted-foreground">
            Manage all taxi associations on the platform.
          </p>
        </div>
        <Link href="/admin/tenants/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Association
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Associations</CardTitle>
              <CardDescription>{tenants.length} total associations</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search associations..."
                  className="w-64 pl-8"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tenants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Association</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Owners</TableHead>
                  <TableHead className="text-right">Vehicles</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{tenant.name}</p>
                          <p className="text-sm text-muted-foreground">{tenant.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPlanBadgeVariant(tenant.plan)}>
                        {tenant.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(tenant.status)}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{tenant.owners}</TableCell>
                    <TableCell className="text-right">{tenant.vehicles}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/tenants/${tenant.id}`}>
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/tenant/${tenant.id}/dashboard`}>
                              Access Dashboard
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/tenants/${tenant.id}/edit`}>
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Suspend
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No associations yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Get started by adding your first taxi association.
              </p>
              <Link href="/admin/tenants/new">
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Association
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
