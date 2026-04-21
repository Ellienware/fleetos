import type { Rank } from '@/types';

export function toRank(doc: any): Rank {
  return {
    $id: doc.$id,
    tenantId: doc.tenantId,
    name: doc.name ?? '',
    location: doc.location ? JSON.parse(doc.location) : null,
    geofenceRadius: doc.geofenceRadius,
    autoDispatch: doc.autoDispatch,
    responseTimeoutMinutes: doc.responseTimeoutMinutes,
    isActive: doc.isActive,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  };
}