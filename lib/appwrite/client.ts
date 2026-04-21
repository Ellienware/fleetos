'use client';

import { Client, Account, Databases, Storage } from 'appwrite';
import { APPWRITE_CONFIG } from './config';

// Browser-side Appwrite client (singleton)
let client: Client | null = null;

export function getClient(): Client {
  if (!client) {
    client = new Client()
      .setEndpoint(APPWRITE_CONFIG.endpoint)
      .setProject(APPWRITE_CONFIG.projectId);
  }
  return client;
}

export function getAccount(): Account {
  return new Account(getClient());
}

export function getDatabases(): Databases {
  return new Databases(getClient());
}

export function getStorage(): Storage {
  return new Storage(getClient());
}

// Re-export for convenience
export { ID, Query } from 'appwrite';
