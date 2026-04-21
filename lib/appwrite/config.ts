// Appwrite Configuration
export const APPWRITE_CONFIG = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1',
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '',
  databaseId: process.env.APPWRITE_DATABASE_ID || 'taxi-saas',
};

// Collection IDs
export const COLLECTIONS = {
  // User & Auth
  PROFILES: 'profiles',
  USERS: 'users', // Legacy, maps to profiles
  
  // Tenant Management
  TENANTS: 'tenants',
  SUBSCRIPTIONS: 'subscriptions',
  
  // Owner Management
  OWNERS: 'owners',
  
  // Vehicle Management
  VEHICLES: 'vehicles',
  
  // Driver Management
  DRIVERS: 'drivers',
  DRIVER_ASSIGNMENTS: 'driver_assignments',
  DRIVER_OTPS: 'driver_otps',
  
  // Shift Management
  SHIFTS: 'shifts',
  SHIFT_ATTENDANCES: 'shift_attendances',
  
  // Route Management
  ROUTES: 'routes',
  ROUTE_ASSIGNMENTS: 'route_assignments',
  
  // Financial
  MEMBERSHIP_PAYMENTS: 'membership_payments',
  FINES: 'fines',
  
  // Notifications
  NOTIFICATIONS: 'notifications',
  
  // Audit
  AUDIT_LOGS: 'audit_logs',
  
  // Real-time Tracking
  LIVE_LOCATIONS: 'live_locations',
  LOCATION_HISTORY: 'location_history',
  
  // Geofencing
  GEOFENCES: 'geofences',
  GEOFENCE_ALERTS: 'geofence_alerts',
  TRACKING_ALERTS: 'tracking_alerts',
  RANKS: "ranks",
  RANK_QUEUES: "rank_queues",
  RANK_ROUTES: 'rank_routes',
  
  // Government Integration
  PERMIT_VALIDATIONS: 'permit_validations',
} as const;

// Storage Bucket IDs
export const STORAGE_BUCKETS = {
  TENANT_LOGOS: 'tenant_logos',
  DOCUMENTS: 'documents',
  DRIVER_PHOTOS: 'driver_photos',
  VEHICLE_PHOTOS: 'vehicle_photos',
  ID_DOCUMENTS: 'docs',
  PERMITS: 'permits',
} as const;

// JWT Configuration
export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'bb714ec2a3b00e1cbe02d25dbc2e04463558f461dae007ced1dc6562af1386b7565cacbbdee7da50350ecc1e3ef1549023b5ebdf0e0d8e6897fb9b4d5a8aa1e9',
  expiresIn: '7d',
  algorithm: 'HS256' as const,
};

// SMS Configuration
export const SMS_CONFIG = {
  provider: process.env.SMS_PROVIDER || 'twilio',
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },
  africasTalking: {
    apiKey: process.env.AFRICAS_TALKING_API_KEY || '',
    username: process.env.AFRICAS_TALKING_USERNAME || '',
    shortCode: process.env.AFRICAS_TALKING_SHORTCODE || '',
  },
};

// Map Configuration
export const MAP_CONFIG = {
  mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '',
  defaultCenter: {
    lat: -26.2041, // Johannesburg, South Africa
    lng: 28.0473,
  },
  defaultZoom: 12,
};
