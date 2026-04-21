'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MapPin, Calendar, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DriverNavbarProps {
  tenantId: string;
}

export function DriverNavbar({ tenantId }: DriverNavbarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: `/driver/dashboard?tenant=${tenantId}`,
      icon: Home,
      label: 'Home',
      match: '/driver/dashboard',
    },
    {
      href: `/driver/routes?tenant=${tenantId}`,
      icon: MapPin,
      label: 'Routes',
      match: '/driver/routes',
    },
    {
      href: `/driver/shifts?tenant=${tenantId}`,
      icon: Calendar,
      label: 'Shifts',
      match: '/driver/shifts',
    },
    {
      href: `/driver/announcements?tenant=${tenantId}`,
      icon: Bell,
      label: 'News',
      match: '/driver/announcements',
    },
    {
      href: `/driver/profile?tenant=${tenantId}`,
      icon: User,
      label: 'Profile',
      match: '/driver/profile',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.match);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'fill-primary/20')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
