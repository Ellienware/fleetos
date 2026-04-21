'use client';

import { Bell } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Session } from '@/types';

// ---------------------------------------------------------------------------
// Breadcrumb builder
// ---------------------------------------------------------------------------

const LABELS: Record<string, string> = {
  admin:          'Dashboard',
  tenants:        'Associations',
  subscriptions:  'Subscriptions',
  users:          'Users',
  analytics:      'Analytics',
  settings:       'Settings',
};

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; href?: string }[] = [];
  let currentPath = '';

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;
    const label =
      LABELS[segment] ??
      segment.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());

    crumbs.push({ label, href: isLast ? undefined : currentPath });
  });

  return crumbs;
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export function AdminHeader({ user }: { user: Session }) {
  const pathname    = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">

      {/* Sidebar toggle */}
      <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />

      {/* Divider */}
      <div className="h-4 w-px bg-border" />

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.label} className="flex items-center gap-1">
            {index > 0 && (
              <span className="select-none text-muted-foreground/40">/</span>
            )}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">

        {/* Notification bell */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-medium text-white">
            3
          </span>
          <span className="sr-only">Notifications</span>
        </button>

      </div>
    </header>
  );
}