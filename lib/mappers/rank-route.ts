import type { RankRoute } from '@/types';

export function toRankRoute(doc: any): RankRoute {
  return {
    $id: doc.$id,
    rankId: doc.rankId,
    routeId: doc.routeId,
    isActive: doc.isActive ?? true,
    displayOrder: doc.displayOrder ?? 0,
    createdAt: doc.$createdAt,
  };
}