import { SignJWT, jwtVerify } from 'jose';
import { JWT_CONFIG } from '@/lib/appwrite/config';
import type { Driver, DriverSession } from '@/types';
import { getDriverById, getDriverByIdNumber } from '@/lib/appwrite/collections/drivers';
import { getActiveAssignmentForDriver } from '@/lib/appwrite/collections/driver-assignments';
import { createDriverOTP, verifyDriverOTP as verifyOTP } from '@/lib/appwrite/collections/driver-otps';
import { sendOTP } from '@/lib/sms';

const secret = new TextEncoder().encode(JWT_CONFIG.secret);

export interface DriverJWTPayload {
  driverId: string;
  ownerId: string;
  tenantId: string;
  vehicleId?: string;
  firstName: string;
  lastName: string;
  phone: string;
}

/**
 * Request OTP for driver login
 */
export async function requestDriverOTP(
  tenantId: string,
  idNumber: string
): Promise<{ success: boolean; error?: string }> {
  // Find driver by ID number
  const driver = await getDriverByIdNumber(tenantId, idNumber);
  
  if (!driver) {
    return { success: false, error: 'Driver not found' };
  }
  
  if (driver.status !== 'active') {
    return { success: false, error: 'Driver account is not active' };
  }
  
  // Generate OTP
  const otpRecord = await createDriverOTP(driver.$id);
  
  // Send OTP via SMS
  try {
    await sendOTP(driver.phone, otpRecord.otp);
    return { success: true };
  } catch (error) {
    console.error('Failed to send OTP:', error);
    return { success: false, error: 'Failed to send OTP. Please try again.' };
  }
}

/**
 * Verify OTP and generate JWT for driver
 */
export async function verifyDriverOTP(
  tenantId: string,
  idNumber: string,
  otp: string
): Promise<{ success: boolean; token?: string; driver?: Driver; error?: string }> {
  // Find driver by ID number
  const driver = await getDriverByIdNumber(tenantId, idNumber);
  
  if (!driver) {
    return { success: false, error: 'Driver not found' };
  }
  
  // Verify OTP
  const otpResult = await verifyOTP(driver.$id, otp);
  
  if (!otpResult.valid) {
    return { success: false, error: otpResult.error || 'Invalid OTP' };
  }
  
  // Get active vehicle assignment
  const assignment = await getActiveAssignmentForDriver(driver.$id);
  
  // Generate JWT
  const token = await generateDriverJWT({
    driverId: driver.$id,
    ownerId: driver.ownerId,
    tenantId: driver.tenantId,
    vehicleId: assignment?.vehicleId,
    firstName: driver.firstName,
    lastName: driver.lastName,
    phone: driver.phone,
  });
  
  return { success: true, token, driver };
}

/**
 * Generate JWT for driver
 */
export async function generateDriverJWT(payload: DriverJWTPayload): Promise<string> {
  const jwt = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: JWT_CONFIG.algorithm })
    .setIssuedAt()
    .setExpirationTime(JWT_CONFIG.expiresIn)
    .sign(secret);
  
  return jwt;
}

/**
 * Verify driver JWT and return session
 */
export async function verifyDriverJWT(token: string): Promise<DriverSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    
    // Type check the payload
    if (
      typeof payload.driverId !== 'string' ||
      typeof payload.ownerId !== 'string' ||
      typeof payload.tenantId !== 'string' ||
      typeof payload.firstName !== 'string' ||
      typeof payload.lastName !== 'string' ||
      typeof payload.phone !== 'string'
    ) {
      return null;
    }
    
    return {
      driverId: payload.driverId,
      ownerId: payload.ownerId,
      tenantId: payload.tenantId,
      vehicleId: payload.vehicleId as string | undefined,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
      exp: payload.exp || 0,
    };
  } catch {
    return null;
  }
}

/**
 * Extract JWT from Authorization header
 */
export function extractJWTFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Get driver session from request
 */
export async function getDriverSessionFromRequest(
  request: Request
): Promise<DriverSession | null> {
  const authHeader = request.headers.get('Authorization');
  const token = extractJWTFromHeader(authHeader);
  
  if (!token) {
    return null;
  }
  
  return verifyDriverJWT(token);
}

/**
 * Refresh driver JWT with updated vehicle assignment
 */
export async function refreshDriverJWT(driverId: string): Promise<string | null> {
  const driver = await getDriverById(driverId);
  
  if (!driver || driver.status !== 'active') {
    return null;
  }
  
  const assignment = await getActiveAssignmentForDriver(driverId);
  
  return generateDriverJWT({
    driverId: driver.$id,
    ownerId: driver.ownerId,
    tenantId: driver.tenantId,
    vehicleId: assignment?.vehicleId,
    firstName: driver.firstName,
    lastName: driver.lastName,
    phone: driver.phone,
  });
}

/**
 * Validate that driver session is still valid
 */
export async function validateDriverSession(
  session: DriverSession
): Promise<boolean> {
  const driver = await getDriverById(session.driverId);
  
  if (!driver) {
    return false;
  }
  
  if (driver.status !== 'active') {
    return false;
  }
  
  // Check if token is expired
  const now = Math.floor(Date.now() / 1000);
  if (session.exp && session.exp < now) {
    return false;
  }
  
  return true;
}
