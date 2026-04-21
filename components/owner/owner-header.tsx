'use client';

import { Bell } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { usePathname } from 'next/navigation';
import type { Session } from '@/types';

interface OwnerHeaderProps {
  user: Session;
  tenant: {
    $id: string;
    name: string;
    subscriptionStatus: string;
  };
}

function getBreadcrumbs(pathname: string, tenantId: string) {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: { label: string; href?: string }[] = [];
  
  let currentPath = '';
  
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;
    
    // Skip tenantId segment in display
    if (segment === tenantId) {
      return;
    }
    
    // Format segment label
    let label = segment.charAt(0).toUpperCase() + segment.slice(1);
    label = label.replace(/-/g, ' ');
    
    // Handle special cases
    if (segment === 'owner') {
      return; // Skip 'owner' prefix
    }
    
    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  });
  
  return breadcrumbs;
}

export function OwnerHeader({ user, tenant }: OwnerHeaderProps) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname, tenant.$id);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <BreadcrumbItem key={crumb.label}>
              {index > 0 && <BreadcrumbSeparator />}
              {crumb.href ? (
                <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-3">
        <Badge variant="outline" className="hidden sm:inline-flex">
          {tenant.name}
        </Badge>
        
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
        </Button>
      </div>
    </header>
  );
}
