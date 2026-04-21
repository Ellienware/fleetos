import { Client, Account, Databases, Storage, Users } from 'node-appwrite';
import { APPWRITE_CONFIG } from './config';

// Server-side Appwrite client with admin privileges
export function createAdminClient() {
  const client = new Client()
    .setEndpoint(APPWRITE_CONFIG.endpoint)
    .setProject(APPWRITE_CONFIG.projectId)
    .setKey(process.env.APPWRITE_API_KEY || '');

  return {
    client,
    account: new Account(client),
    databases: new Databases(client),
    storage: new Storage(client),
    users: new Users(client),
  };
}

// Server-side client with session (for user context)
export function createSessionClient(session: string) {
  const client = new Client()
    .setEndpoint(APPWRITE_CONFIG.endpoint)
    .setProject(APPWRITE_CONFIG.projectId)
    .setSession(session);

  return {
    client,
    account: new Account(client),
    databases: new Databases(client),
    storage: new Storage(client),
  };
}

// Re-export for convenience
export { ID, Query } from 'node-appwrite';
