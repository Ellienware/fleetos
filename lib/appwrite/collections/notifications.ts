import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { Notification, NotificationType, NotificationPriority } from '@/types';

const { databaseId } = APPWRITE_CONFIG;

export async function createNotification(data: {
  tenantId: string;
  userId?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  priority?: NotificationPriority;
}): Promise<Notification> {
  const { databases } = createAdminClient();
  
  return databases.createDocument(
    databaseId,
    COLLECTIONS.NOTIFICATIONS,
    ID.unique(),
    {
      tenantId: data.tenantId,
      userId: data.userId || null,
      title: data.title,
      message: data.message,
      type: data.type,
      priority: data.priority || 'medium',
      read: false,
      readAt: null,
      createdAt: new Date().toISOString(),
    }
  ) as unknown as Notification;
}

export async function getNotificationsByUser(
  tenantId: string,
  userId: string,
  limit = 20
): Promise<Notification[]> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.NOTIFICATIONS,
    [
      Query.equal('tenantId', tenantId),
      Query.or([
        Query.equal('userId', userId),
        Query.isNull('userId'), // Broadcast notifications
      ]),
      Query.orderDesc('createdAt'),
      Query.limit(limit),
    ]
  );
  
  return response.documents as unknown as Notification[];
}

export async function getUnreadNotificationsCount(
  tenantId: string,
  userId: string
): Promise<number> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.NOTIFICATIONS,
    [
      Query.equal('tenantId', tenantId),
      Query.or([
        Query.equal('userId', userId),
        Query.isNull('userId'),
      ]),
      Query.equal('read', false),
      Query.limit(1),
    ]
  );
  
  return response.total;
}

export async function markNotificationRead(notificationId: string): Promise<Notification> {
  const { databases } = createAdminClient();
  
  return databases.updateDocument(
    databaseId,
    COLLECTIONS.NOTIFICATIONS,
    notificationId,
    {
      read: true,
      readAt: new Date().toISOString(),
    }
  ) as unknown as Notification;
}

export async function markAllNotificationsRead(
  tenantId: string,
  userId: string
): Promise<void> {
  const { databases } = createAdminClient();
  
  const unread = await databases.listDocuments(
    databaseId,
    COLLECTIONS.NOTIFICATIONS,
    [
      Query.equal('tenantId', tenantId),
      Query.or([
        Query.equal('userId', userId),
        Query.isNull('userId'),
      ]),
      Query.equal('read', false),
    ]
  );
  
  const now = new Date().toISOString();
  
  await Promise.all(
    unread.documents.map(notification =>
      databases.updateDocument(
        databaseId,
        COLLECTIONS.NOTIFICATIONS,
        notification.$id,
        {
          read: true,
          readAt: now,
        }
      )
    )
  );
}

export async function createBroadcastNotification(
  tenantId: string,
  title: string,
  message: string,
  type: NotificationType = 'announcement'
): Promise<Notification> {
  return createNotification({
    tenantId,
    userId: null, // Broadcast to all
    title,
    message,
    type,
    priority: 'medium',
  });
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const { databases } = createAdminClient();
  
  await databases.deleteDocument(
    databaseId,
    COLLECTIONS.NOTIFICATIONS,
    notificationId
  );
}

export async function getNotificationById(notificationId: string): Promise<Notification | null> {
  const { databases } = createAdminClient();
  try {
    return await databases.getDocument(
      databaseId,
      COLLECTIONS.NOTIFICATIONS,
      notificationId
    ) as unknown as Notification;
  } catch {
    return null;
  }
}

export async function updateNotification(
  notificationId: string,
  data: Partial<Pick<Notification, 'title' | 'message' | 'type' | 'priority'>>
): Promise<Notification> {
  const { databases } = createAdminClient();
  return databases.updateDocument(
    databaseId,
    COLLECTIONS.NOTIFICATIONS,
    notificationId,
    {
      ...data,
      updatedAt: new Date().toISOString(),
    }
  ) as unknown as Notification;
}

export async function getNotificationsByTenant(
  tenantId: string,
  page = 1,
  limit = 25
) {
  const { databases } = createAdminClient();

  const offset = (page - 1) * limit;

  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.NOTIFICATIONS,
    [
      Query.equal('tenantId', tenantId),
      Query.orderDesc('createdAt'),
      Query.limit(limit),
      Query.offset(offset),
    ]
  );

  return {
    documents: response.documents as unknown as Notification[],
    total: response.total,
    page,
    limit,
    hasMore: offset + response.documents.length < response.total,
  };
}