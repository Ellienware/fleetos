import type { Session, UserRole } from '@/types';

// Define permissions
export type Permission =
  // Tenant management
  | 'tenants:read'
  | 'tenants:create'
  | 'tenants:update'
  | 'tenants:delete'
  // Owner management
  | 'owners:read'
  | 'owners:create'
  | 'owners:update'
  | 'owners:delete'
  | 'owners:approve'
  // Vehicle management
  | 'vehicles:read'
  | 'vehicles:create'
  | 'vehicles:update'
  | 'vehicles:delete'
  | 'vehicles:approve'
  // Driver management
  | 'drivers:read'
  | 'drivers:create'
  | 'drivers:update'
  | 'drivers:delete'
  // Shift management
  | 'shifts:read'
  | 'shifts:create'
  | 'shifts:update'
  | 'shifts:cancel'
  // Route management
  | 'routes:read'
  | 'routes:create'
  | 'routes:update'
  | 'routes:delete'
  // Payment management
  | 'payments:read'
  | 'payments:create'
  | 'payments:process'
  // Fine management
  | 'fines:read'
  | 'fines:create'
  | 'fines:update'
  | 'fines:waive'
  | 'fines:pay'
  // Reports & Analytics
  | 'reports:read'
  | 'reports:export'
  | 'analytics:read'
  // Notifications
  | 'notifications:read'
  | 'notifications:create'
  | 'notifications:broadcast'
  // Settings
  | 'settings:read'
  | 'settings:update'
  // Subscriptions
  | 'subscriptions:read'
  | 'subscriptions:manage'
  // Tracking & Geofencing
  | 'tracking:read'
  | 'tracking:update'
  | 'geofences:read'
  | 'geofences:create'
  | 'geofences:update'
  | 'geofences:delete'
  // Platform admin
  | 'platform:admin'
  | 'platform:analytics';

// Role-based permissions mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    // All permissions
    'tenants:read', 'tenants:create', 'tenants:update', 'tenants:delete',
    'owners:read', 'owners:create', 'owners:update', 'owners:delete', 'owners:approve',
    'vehicles:read', 'vehicles:create', 'vehicles:update', 'vehicles:delete', 'vehicles:approve',
    'drivers:read', 'drivers:create', 'drivers:update', 'drivers:delete',
    'shifts:read', 'shifts:create', 'shifts:update', 'shifts:cancel',
    'routes:read', 'routes:create', 'routes:update', 'routes:delete',
    'payments:read', 'payments:create', 'payments:process',
    'fines:read', 'fines:create', 'fines:update', 'fines:waive', 'fines:pay',
    'reports:read', 'reports:export', 'analytics:read',
    'notifications:read', 'notifications:create', 'notifications:broadcast',
    'settings:read', 'settings:update',
    'subscriptions:read', 'subscriptions:manage',
    'tracking:read', 'tracking:update',
    'geofences:read', 'geofences:create', 'geofences:update', 'geofences:delete',
    'platform:admin', 'platform:analytics',
  ],
  ASSOCIATION_ADMIN: [
    // Tenant-scoped permissions
    'owners:read', 'owners:create', 'owners:update', 'owners:delete', 'owners:approve',
    'vehicles:read', 'vehicles:create', 'vehicles:update', 'vehicles:delete', 'vehicles:approve',
    'drivers:read', 'drivers:create', 'drivers:update', 'drivers:delete',
    'shifts:read', 'shifts:create', 'shifts:update', 'shifts:cancel',
    'routes:read', 'routes:create', 'routes:update', 'routes:delete',
    'payments:read', 'payments:create', 'payments:process',
    'fines:read', 'fines:create', 'fines:update', 'fines:waive',
    'reports:read', 'reports:export', 'analytics:read',
    'notifications:read', 'notifications:create', 'notifications:broadcast',
    'settings:read', 'settings:update',
    'subscriptions:read',
    'tracking:read', 'tracking:update',
    'geofences:read', 'geofences:create', 'geofences:update', 'geofences:delete',
  ],
  OWNER: [
    // Owner-scoped permissions (own data only)
    'vehicles:read', 'vehicles:create', 'vehicles:update',
    'drivers:read', 'drivers:create', 'drivers:update', 'drivers:delete',
    'shifts:read', 'shifts:create', 'shifts:update', 'shifts:cancel',
    'routes:read',
    'payments:read', 'payments:create',
    'fines:read', 'fines:pay',
    'notifications:read',
    'settings:read',
    'tracking:read', 'tracking:update',
  ],
  DRIVER: [
    // Minimal permissions for driver app
    'routes:read',
    'shifts:read',
    'notifications:read',
    'tracking:read', 'tracking:update',
  ],
};

// Check if a role has a specific permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// Check if a session has a specific permission
export function canPerform(session: Session | null, permission: Permission): boolean {
  if (!session) return false;
  return hasPermission(session.role, permission);
}

// Get all permissions for a role
export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

// Check multiple permissions (all required)
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

// Check multiple permissions (any required)
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

// Role hierarchy check
export function isRoleAtLeast(role: UserRole, minimumRole: UserRole): boolean {
  const hierarchy: UserRole[] = ['DRIVER', 'OWNER', 'ASSOCIATION_ADMIN', 'SUPER_ADMIN'];
  const roleIndex = hierarchy.indexOf(role);
  const minimumIndex = hierarchy.indexOf(minimumRole);
  return roleIndex >= minimumIndex;
}

// Check if user can access a specific tenant
export function canAccessTenant(session: Session | null, tenantId: string): boolean {
  if (!session) return false;
  if (session.role === 'SUPER_ADMIN') return true;
  return session.tenantId === tenantId;
}

// Check if user can manage another user
export function canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
  const hierarchy: UserRole[] = ['DRIVER', 'OWNER', 'ASSOCIATION_ADMIN', 'SUPER_ADMIN'];
  const managerIndex = hierarchy.indexOf(managerRole);
  const targetIndex = hierarchy.indexOf(targetRole);
  return managerIndex > targetIndex;
}

// UI helper - get accessible routes based on role
export function getAccessibleRoutes(role: UserRole): string[] {
  switch (role) {
    case 'SUPER_ADMIN':
      return ['/admin', '/tenant'];
    case 'ASSOCIATION_ADMIN':
      return ['/tenant'];
    case 'OWNER':
      return ['/owner'];
    case 'DRIVER':
      return ['/driver'];
    default:
      return [];
  }
}

// UI helper - get dashboard path based on role
export function getDashboardPath(session: Session): string {
  switch (session.role) {
    case 'SUPER_ADMIN':
      return '/admin';
    case 'ASSOCIATION_ADMIN':
      return session.tenantId ? `/tenant/${session.tenantId}/dashboard` : '/';
    case 'OWNER':
      return session.tenantId ? `/owner/${session.tenantId}/dashboard` : '/';
    case 'DRIVER':
      return '/driver';
    default:
      return '/';
  }
}

// Check if owner can access their own data
export function canAccessOwnData(session: Session | null, ownerId: string): boolean {
  if (!session) return false;
  if (session.role === 'SUPER_ADMIN' || session.role === 'ASSOCIATION_ADMIN') return true;
  if (session.role === 'OWNER' && session.ownerId === ownerId) return true;
  return false;
}

// Check if user is an admin (super or association)
export function isAdmin(session: Session | null): boolean {
  if (!session) return false;
  return session.role === 'SUPER_ADMIN' || session.role === 'ASSOCIATION_ADMIN';
}
