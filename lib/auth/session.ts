import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import type { Session } from '@/types';

const SESSION_COOKIE = 'taxi_session';
// Use environment variable or fallback for development
const JWT_SECRET = process.env.JWT_SECRET || '5ab70778de3729c6ce2a7109476cd1c065608c848309037e44bfa31ebb1a4a5bd62cb5446545488484e94cf75700a39bfbe687cba93d8f279bc9b9b573fe2be4';

export async function createSession(userId: string, role: string, tenantId?: string | null, name?: string): Promise<void> {
  const payload = { userId, role, tenantId, name };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE);
    if (!token?.value) return null;
    const decoded = jwt.verify(token.value, JWT_SECRET) as Session;
    return decoded;
  } catch (error) {
    console.error('getSession error:', error);
    return null;
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  return session;
}

export async function requireRole(allowedRoles: Session['role'][]): Promise<Session> {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.role)) throw new Error('Forbidden');
  return session;
}

export async function requireTenantAccess(tenantId: string): Promise<Session> {
  const session = await requireAuth();
  if (session.role === 'SUPER_ADMIN') return session;
  if (session.tenantId !== tenantId) throw new Error('Forbidden');
  return session;
}