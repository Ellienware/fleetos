'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bus,
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  AlertTriangle,
  Bell,
  Settings,
  LogOut,
  ChevronUp,
  MapPin,
  User,
  UserPlus, // added for assignments
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Session } from '@/types';
import { logout } from '@/app/(auth)/actions';

interface OwnerSidebarProps {
  user: Session;
  tenant: {
    $id: string;
    name: string;
    slug: string;
    subscriptionStatus: string;
  };
}

export function OwnerSidebar({ user, tenant }: OwnerSidebarProps) {
  const pathname = usePathname();
  const basePath = `/owner/${tenant.$id}`;

  const navItems = [
    {
      title: 'Dashboard',
      href: `${basePath}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      title: 'Vehicles',
      href: `${basePath}/vehicles`,
      icon: Bus,
    },
    {
      title: 'Drivers',
      href: `${basePath}/drivers`,
      icon: Users,
    },
    {
      title: 'Assignments',
      href: `${basePath}/assignments`,
      icon: UserPlus, // unique icon for assignments
    },
    {
      title: 'Shifts',
      href: `${basePath}/shifts`,
      icon: Calendar,
    },
    {
      title: 'Fines',
      href: `${basePath}/fines`,
      icon: AlertTriangle,
    },
    {
      title: 'Payments',
      href: `${basePath}/payments`,
      icon: CreditCard,
    },
  ];

  const utilityItems = [
    {
      title: 'Announcements',
      href: `${basePath}/announcements`,
      icon: Bell,
    },
    {
      title: 'Live Tracking',
      href: `${basePath}/tracking`,
      icon: MapPin,
    },
    {
      title: 'Profile',
      href: `${basePath}/profile`,
      icon: User,
    },
  ];

  async function handleLogout() {
    await logout();
    window.location.href = '/login';
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href={`${basePath}/dashboard`} className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Bus className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="truncate text-sm font-semibold">{tenant.name}</span>
            <span className="text-xs text-sidebar-foreground/60">Owner Portal</span>
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarSeparator />
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>My Fleet</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>More</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {utilityItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs text-sidebar-foreground/60">{user.email}</span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                side="top"
                align="start"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link href={`${basePath}/profile`}>
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}