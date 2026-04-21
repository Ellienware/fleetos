// User Roles
export type UserRole = 'SUPER_ADMIN' | 'ASSOCIATION_ADMIN' | 'OWNER' | 'DRIVER';

// Status Types
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type MembershipStatus = 'active' | 'suspended' | 'pending';
export type VehicleStatus = 'active' | 'inactive' | 'maintenance' | 'pending';
export type RouteStatus = 'active' | 'inactive';
export type AssignmentStatus = 'active' | 'pending' | 'revoked';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type FineStatus = 'pending' | 'paid' | 'waived' | 'appealed';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending' | 'trial';
export type SubscriptionPlan = 'starter' | 'growth' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';
export type PaymentType = 'membership' | 'fine' | 'other';
export type NotificationType = 'announcement' | 'payment' | 'fine' | 'compliance' | 'system' | 'shift_reminder' | 'permit_expiry';
export type NotificationPriority = 'low' | 'medium' | 'high';

// Driver-specific status types
export type DriverStatus = 'active' | 'inactive' | 'suspended' | 'pending';
export type DriverAssignmentStatus = 'active' | 'inactive';
export type ShiftStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type AttendanceStatus = 'on_time' | 'late' | 'absent' | 'excused';
export type GeofenceType = 'route' | 'rank' | 'zone' | 'restricted';
export type GeofenceAlertType = 'entry' | 'exit' | 'dwell';
export type PermitValidationStatus = 'valid' | 'invalid' | 'expired' | 'not_found' | 'pending';

// Profile Interface (updated from User)
export interface Profile {
  $id: string;
  authUserId: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string | null;
  phone: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

// User Interface (legacy, maps to Profile)
export interface User {
  $id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string | null;
  phone: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

// Tenant (Association) Interface
export interface TenantSettings {
  membershipFee: number;
  currency: string;
  timezone: string;
  smsEnabled?: boolean;
  smsProvider?: 'twilio' | 'africas_talking';
  dueDateReminderDays?: number;
  permitExpiryReminderDays?: number;
}

export interface Tenant {
  $id: string;
  name: string;
  slug: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  registrationNumber: string;
  subscriptionId: string;
  subscriptionStatus: SubscriptionStatus;
  settings: TenantSettings;
  createdAt: string;
  updatedAt: string;
}

// Subscription Interface
export interface Subscription {
  $id: string;
  tenantId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  paystackSubscriptionCode: string;
  paystackCustomerCode: string;
  amount: number;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Owner Interface
export interface Owner {
  $id: string;
  tenantId: string;
  profileId: string | null; // Reference to Profile document
  userId: string; // Legacy field, kept for backwards compatibility
  firstName: string;
  lastName: string;
  idNumber: string;
  phone: string;
  email: string;
  address: string;
  membershipStatus: MembershipStatus;
  idDocumentUrl?: string;
  operatingPermitUrl?: string;
  joinedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Vehicle Interface
export interface Vehicle {
  $id: string;
  tenantId: string;
  ownerId: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  capacity: number;
  status: VehicleStatus;
  operatingPermitNumber: string;
  operatingPermitExpiry: string;
  insuranceExpiry: string;
  permitPhotoId?: string;
  registrationPhotoId?: string;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Driver Interface
export interface Driver {
  $id: string;
  tenantId: string;
  ownerId: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  phone: string;
  email?: string;
  address?: string;
  prdpNumber: string;
  prdpExpiry: string;
  driverLicenseNumber: string;
  driverLicenseExpiry: string;
  driverLicenseCode: string; // e.g., "C", "EC", "C1"
  profilePhotoId?: string;
  status: DriverStatus;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

// Driver Assignment Interface
export interface DriverAssignment {
  $id: string;
  tenantId: string;
  driverId: string;
  vehicleId: string;
  ownerId: string;
  status: DriverAssignmentStatus;
  isPrimary: boolean;
  assignedAt: string;
  unassignedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Shift {
  $id: string;
  tenantId: string;
  ownerId: string;
  driverId: string;
  vehicleId: string;
  routeId?: string;
  startTime: string;   
  endTime: string;     
  status: ShiftStatus;
  actualStart?: string;
  actualEnd?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Shift Attendance Interface
export interface ShiftAttendance {
  $id: string;
  tenantId: string;
  shiftId: string;
  driverId: string;
  vehicleId: string;
  clockInTime?: string;
  clockInLatitude?: number;
  clockInLongitude?: number;
  clockOutTime?: string;
  clockOutLatitude?: number;
  clockOutLongitude?: number;
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Driver OTP Interface
export interface DriverOTP {
  $id: string;
  driverId: string;
  otp: string;
  expiresAt: string;
  verified: boolean;
  createdAt: string;
}

// Route Interface
export interface Route {
  $id: string;
  tenantId: string;
  name: string;
  code: string;
  origin: string;
  destination: string;
  originLat: number;          // add these
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  distance: number;
  baseFare: number;
  maxVehicles: number;
  currentVehicleCount: number;
  status: RouteStatus;
  stops: RouteStop[];         // intermediate stops only (empty if none)
  polyline?: string;          // encoded polyline (origin → stops → destination)
  createdAt: string;
  updatedAt: string;
}

// Route Assignment Interface
export interface RouteAssignment {
  $id: string;
  tenantId: string;
  routeId: string;
  vehicleId: string;
  ownerId: string;
  status: AssignmentStatus;
  assignedAt: string;
}

// Membership Payment Interface
export interface MembershipPayment {
  $id: string;
  tenantId: string;
  ownerId: string;
  amount: number;
  paymentType: PaymentType;
  status: PaymentStatus;
  paystackReference: string;
  paystackTransactionId: string;
  period: string;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Fine Interface
export interface Fine {
  $id: string;
  tenantId: string;
  ownerId: string;
  vehicleId: string | null;
  driverId?: string | null;
  type: string;
  description: string;
  amount: number;
  status: FineStatus;
  issuedBy: string;
  issuedAt: string;
  paidAt: string | null;
  paymentId: string | null;
  createdAt: string;
  updatedAt: string;
}

// Notification Interface
export interface Notification {
  $id: string;
  tenantId: string;
  userId: string | null;
  ownerId?: string | null;
  driverId?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

// Audit Log Interface
export interface AuditLog {
  $id: string;
  tenantId: string | null;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
}

// Session Interface
export interface Session {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string | null;
  tenantSlug?: string;
  ownerId?: string; // For OWNER role
}

// Driver Session (JWT-based)
export interface DriverSession {
  driverId: string;
  ownerId: string;
  tenantId: string;
  vehicleId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  exp: number;
}

// Pricing Plans
export interface PricingPlan {
  id: SubscriptionPlan;
  name: string;
  price: number;
  billingCycle: BillingCycle;
  features: string[];
  maxOwners: number;
  maxVehicles: number;
  maxRoutes: number;
  recommended?: boolean;
}

// Dashboard Stats
export interface DashboardStats {
  totalOwners: number;
  totalVehicles: number;
  totalRoutes: number;
  activeVehicles: number;
  pendingPayments: number;
  totalRevenue: number;
  pendingFines: number;
  totalDrivers?: number;
  activeShifts?: number;
}

// Owner Dashboard Stats
export interface OwnerDashboardStats {
  totalVehicles: number;
  activeVehicles: number;
  totalDrivers: number;
  activeDrivers: number;
  pendingFines: number;
  totalFinesAmount: number;
  upcomingShifts: number;
  membershipStatus: MembershipStatus;
}

// Platform Stats (Super Admin)
export interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  totalOwners: number;
  totalVehicles: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
}

// Form Types
export interface OwnerFormData {
  firstName: string;
  lastName: string;
  idNumber: string;
  phone: string;
  email: string;
  address: string;
  password?: string;
}

export interface OwnerRegistrationData extends OwnerFormData {
  password: string;
  idDocumentFile?: File;
  operatingPermitFile?: File;
}

export interface VehicleFormData {
  ownerId: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  capacity: number;
  operatingPermitNumber: string;
  operatingPermitExpiry: string;
  insuranceExpiry: string;
  permitPhotoFile?: File;
  registrationPhotoFile?: File;
}

export interface DriverFormData {
  ownerId: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  phone: string;
  email?: string;
  address?: string;
  prdpNumber: string;
  prdpExpiry: string;
  driverLicenseNumber: string;
  driverLicenseExpiry: string;
  driverLicenseCode: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  profilePhotoFile?: File;
}

export interface ShiftFormData {
  driverId: string;
  vehicleId: string;
  routeId?: string;
  scheduledStart: string;
  scheduledEnd: string;
  notes?: string;
}

export interface RouteStop {
  id?: string;               // temporary client-side id
  name: string;              // e.g., "Baragwanath Hospital"
  address: string;           // human-readable address
  lat: number;
  lng: number;
  order: number;             // 0 = origin, 1..n = stops, n+1 = destination
  fareFromOrigin: number;    // cumulative fare from route origin (ZAR)
  distanceFromOrigin?: number; // optional, auto-calculated from polyline
}

export interface RouteFormData {
  name: string;
  code: string;
  origin: string;
  destination: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  distance: number;
  baseFare: number;
  maxVehicles: number;
  stops: RouteStop[]; // can be empty
  polyline?: string;  // optional for creation
}

export interface FineFormData {
  ownerId: string;
  vehicleId?: string;
  driverId?: string;
  type: string;
  description: string;
  amount: number;
}

export interface TenantFormData {
  name: string;
  address: string;
  phone: string;
  email: string;
  registrationNumber: string;
  membershipFee: number;
}

export interface GeofenceFormData {
  name: string;
  type: GeofenceType;
  coordinates: { lat: number; lng: number }[];
  radius?: number;
  isActive: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  documents: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Fine Types (predefined)
export const FINE_TYPES = [
  { value: 'route_violation', label: 'Route Violation' },
  { value: 'payment_default', label: 'Payment Default' },
  { value: 'permit_violation', label: 'Permit Violation' },
  { value: 'conduct_violation', label: 'Conduct Violation' },
  { value: 'safety_violation', label: 'Safety Violation' },
  { value: 'attendance_violation', label: 'Attendance Violation' },
  { value: 'geofence_violation', label: 'Geofence Violation' },
  { value: 'other', label: 'Other' },
] as const;

// Driver License Codes
export const DRIVER_LICENSE_CODES = [
  { value: 'A', label: 'A - Motorcycle' },
  { value: 'A1', label: 'A1 - Light Motorcycle' },
  { value: 'B', label: 'B - Light Motor Vehicle' },
  { value: 'C', label: 'C - Heavy Motor Vehicle' },
  { value: 'C1', label: 'C1 - Heavy Motor Vehicle (3500-16000kg)' },
  { value: 'EC', label: 'EC - Extra Heavy with Trailer' },
  { value: 'EC1', label: 'EC1 - Extra Heavy with Trailer (Limited)' },
] as const;

// Real-time Tracking Types
export type VehicleTrackingStatus = 'active' | 'idle' | 'offline';

export interface LiveLocation {
  $id: string;
  vehicleId: string;
  tenantId: string;
  driverId?: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy?: number;
  status: VehicleTrackingStatus;
  timestamp: string;
  updatedAt: string;
}

export interface LocationHistory {
  $id: string;
  vehicleId: string;
  tenantId: string;
  driverId?: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy?: number;
  timestamp: string;
}

export interface Geofence {
  $id: string;
  tenantId: string;
  name: string;
  type: GeofenceType;
  coordinates: { lat: number; lng: number }[];
  radius?: number; // For circle type
  isActive: boolean;
  alertOnEntry: boolean;
  alertOnExit: boolean;
  alertOnDwell: boolean;
  dwellTimeMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GeofenceAlert {
  $id: string;
  tenantId: string;
  geofenceId: string;
  vehicleId: string;
  driverId?: string;
  ownerId: string;
  alertType: GeofenceAlertType;
  latitude: number;
  longitude: number;
  message: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  createdAt: string;
}

export interface TrackingAlert {
  $id: string;
  tenantId: string;
  vehicleId: string;
  ownerId: string;
  type: 'geofence_exit' | 'geofence_enter' | 'idle_timeout' | 'offline';
  message: string;
  acknowledged: boolean;
  createdAt: string;
}

// Permit Validation
export interface PermitValidation {
  $id: string;
  tenantId: string;
  vehicleId?: string;
  driverId?: string;
  validationType: 'operating_permit' | 'vehicle_registration' | 'prdp' | 'driver_license';
  referenceNumber: string;
  status: PermitValidationStatus;
  validatedAt: string;
  expiryDate?: string;
  validationResponse?: Record<string, unknown>;
  createdAt: string;
}

export interface VehicleWithLocation extends Vehicle {
  liveLocation?: LiveLocation;
  owner?: Owner;
  route?: Route;
  driver?: Driver;
}

export interface DriverWithAssignment extends Driver {
  assignment?: DriverAssignment;
  vehicle?: Vehicle;
  owner?: Owner;
}

export interface ShiftWithDetails extends Shift {
  driver?: Driver;
  vehicle?: Vehicle;
  route?: Route;
  owner?: Owner;
  attendance?: ShiftAttendance;
}

// Analytics Types
export interface RevenueDataPoint {
  date: string;
  amount: number;
  count: number;
}

export interface FineCollectionStats {
  total: number;
  paid: number;
  pending: number;
  waived: number;
  collectionRate: number;
}

export interface OwnerGrowthDataPoint {
  date: string;
  newOwners: number;
  totalOwners: number;
}

export interface VehicleUtilizationStats {
  total: number;
  active: number;
  inactive: number;
  maintenance: number;
  utilizationRate: number;
}

export interface AttendanceComplianceStats {
  totalShifts: number;
  onTime: number;
  late: number;
  absent: number;
  complianceRate: number;
}

export interface RouteProfitabilityData {
  routeId: string;
  routeName: string;
  vehicleCount: number;
  revenue: number;
  fines: number;
  netRevenue: number;
}

// SMS Configuration
export interface SMSConfig {
  enabled: boolean;
  provider: 'twilio' | 'africas_talking';
  dueDateReminder: boolean;
  dueDateReminderDays: number;
  overdueNotice: boolean;
  fineNotification: boolean;
  permitExpiryWarning: boolean;
  permitExpiryWarningDays: number;
  shiftReminder: boolean;
  shiftReminderMinutes: number;
}

// Subscription Plans Configuration
export const SUBSCRIPTION_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 500,
    billingCycle: 'monthly',
    features: [
      'Up to 50 owners',
      'Up to 100 vehicles',
      'Up to 10 routes',
      'Basic reporting',
      'Email support',
    ],
    maxOwners: 50,
    maxVehicles: 100,
    maxRoutes: 10,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 1500,
    billingCycle: 'monthly',
    features: [
      'Up to 200 owners',
      'Up to 500 vehicles',
      'Up to 50 routes',
      'Advanced reporting',
      'Priority support',
      'Custom branding',
      'Driver management',
      'Shift scheduling',
    ],
    maxOwners: 200,
    maxVehicles: 500,
    maxRoutes: 50,
    recommended: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 5000,
    billingCycle: 'monthly',
    features: [
      'Unlimited owners',
      'Unlimited vehicles',
      'Unlimited routes',
      'Full analytics suite',
      'Dedicated support',
      'API access',
      'White-label options',
      'Real-time tracking',
      'Geofencing',
      'Government integration',
    ],
    maxOwners: -1,
    maxVehicles: -1,
    maxRoutes: -1,
  },
];

// Rank types
export interface RankLocation {
  lat: number;
  lng: number;
}

export interface Rank {
  $id: string;
  tenantId: string;
  name: string;
  location: RankLocation;
  geofenceRadius: number | null;
  autoDispatch: boolean;
  responseTimeoutMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RankFormData {
  name: string;
  location: RankLocation;
  geofenceRadius?: number;
  autoDispatch?: boolean;
  responseTimeoutMinutes?: number;
  isActive?: boolean;
}

// Add RankRoute junction type (optional)
export interface RankRoute {
  $id: string;
  rankId: string;
  routeId: string;
  isActive: boolean;
  displayOrder?: number;
  createdAt: string;
}

// Add RankQueueEntry type
export type RankQueueStatus = 'waiting' | 'called' | 'loading' | 'departed' | 'skipped';

// In your types file (e.g., types/index.ts)
export interface RankQueueEntry {
  $id: string;
  tenantId: string;
  rankId: string;
  routeId: string;
  driverId: string;
  vehicleId: string;
  registrationNumber: string;
  enteredAt: string;
  status: RankQueueStatus;
  calledAt?: string;
  loadingDeadline?: string;
  loadedAt?: string;
  departedAt?: string;
  skipReason?: string;
  timesSkipped?: number;
}
