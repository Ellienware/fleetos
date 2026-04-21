import { RankQueueEntry } from "@/types";

// In lib/mappers/queue.mapper.ts
export function toQueueEntry(doc: any): RankQueueEntry {
  return {
    $id: doc.$id,
    tenantId: doc.tenantId,
    rankId: doc.rankId,
    routeId: doc.routeId,
    driverId: doc.driverId,
    vehicleId: doc.vehicleId,
    registrationNumber: doc.registrationNumber,
    enteredAt: doc.enteredAt,
    status: doc.status,
    calledAt: doc.calledAt,
    loadingDeadline: doc.loadingDeadline,
    loadedAt: doc.loadedAt,
    departedAt: doc.departedAt,
    skipReason: doc.skipReason,
    timesSkipped: doc.timesSkipped ?? 0,   // 👈 add this line, default to 0
  };
}