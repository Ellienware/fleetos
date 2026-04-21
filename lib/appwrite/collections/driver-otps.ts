import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { DriverOTP } from '@/types';

const { databaseId } = APPWRITE_CONFIG;

// OTP expires in 5 minutes
const OTP_EXPIRY_MINUTES = 5;

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createDriverOTP(driverId: string): Promise<DriverOTP> {
  const { databases } = createAdminClient();
  
  // Invalidate any existing OTPs for this driver
  await invalidateExistingOTPs(driverId);
  
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
  
  return databases.createDocument(
    databaseId,
    COLLECTIONS.DRIVER_OTPS,
    ID.unique(),
    {
      driverId,
      otp: generateOTP(),
      expiresAt: expiresAt.toISOString(),
      verified: false,
      createdAt: now.toISOString(),
    }
  ) as unknown as DriverOTP;
}

export async function getDriverOTP(
  driverId: string,
  otp: string
): Promise<DriverOTP | null> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.DRIVER_OTPS,
    [
      Query.equal('driverId', driverId),
      Query.equal('otp', otp),
      Query.equal('verified', false),
      Query.limit(1),
    ]
  );
  
  return response.documents[0] as unknown as DriverOTP || null;
}

export async function verifyDriverOTP(
  driverId: string,
  otp: string
): Promise<{ valid: boolean; error?: string }> {
  const { databases } = createAdminClient();
  
  const otpRecord = await getDriverOTP(driverId, otp);
  
  if (!otpRecord) {
    return { valid: false, error: 'Invalid OTP' };
  }
  
  const now = new Date();
  const expiresAt = new Date(otpRecord.expiresAt);
  
  if (now > expiresAt) {
    return { valid: false, error: 'OTP has expired' };
  }
  
  // Mark OTP as verified
  await databases.updateDocument(
    databaseId,
    COLLECTIONS.DRIVER_OTPS,
    otpRecord.$id,
    { verified: true }
  );
  
  return { valid: true };
}

export async function invalidateExistingOTPs(driverId: string): Promise<void> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.DRIVER_OTPS,
    [
      Query.equal('driverId', driverId),
      Query.equal('verified', false),
      Query.limit(10),
    ]
  );
  
  for (const doc of response.documents) {
    await databases.deleteDocument(
      databaseId,
      COLLECTIONS.DRIVER_OTPS,
      doc.$id
    );
  }
}

export async function cleanupExpiredOTPs(): Promise<number> {
  const { databases } = createAdminClient();
  
  const now = new Date().toISOString();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.DRIVER_OTPS,
    [
      Query.lessThan('expiresAt', now),
      Query.limit(100),
    ]
  );
  
  let deletedCount = 0;
  for (const doc of response.documents) {
    await databases.deleteDocument(
      databaseId,
      COLLECTIONS.DRIVER_OTPS,
      doc.$id
    );
    deletedCount++;
  }
  
  return deletedCount;
}

export async function getLatestOTPForDriver(
  driverId: string
): Promise<DriverOTP | null> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.DRIVER_OTPS,
    [
      Query.equal('driverId', driverId),
      Query.equal('verified', false),
      Query.orderDesc('createdAt'),
      Query.limit(1),
    ]
  );
  
  return response.documents[0] as unknown as DriverOTP || null;
}

export async function isOTPValid(
  driverId: string,
  otp: string
): Promise<boolean> {
  const result = await verifyDriverOTP(driverId, otp);
  return result.valid;
}
