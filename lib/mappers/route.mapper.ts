import type { Route } from '@/types';

export function toRoute(doc: any): Route {
  return {
    $id: doc.$id,
    tenantId: doc.tenantId,
    name: doc.name,
    code: doc.code,
    origin: doc.origin,
    destination: doc.destination,
    distance: doc.distance ?? 0,
    baseFare: doc.baseFare ?? 0,
    maxVehicles: doc.maxVehicles ?? 0,
    currentVehicleCount: doc.currentVehicleCount ?? 0,
    status: doc.status,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  };
}