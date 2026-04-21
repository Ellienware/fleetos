import { notFound } from 'next/navigation';
import { getRankById } from '@/lib/appwrite/collections/ranks';

import { Skeleton } from '@/components/ui/skeleton';
import { RankForm } from '../../new/rank_form';

interface EditRankPageProps {
  params: Promise<{
    tenantId: string;
    rankId: string;
  }>;
}

export default async function EditRankPage({ params }: EditRankPageProps) {
  const { tenantId, rankId } = await params;
  const rank = await getRankById(rankId);

  if (!rank) {
    notFound();
  }

  // Transform rank data to match the form's initialData shape
  const initialData = {
    name: rank.name,
    location: rank.location, // already { lat, lng } from mapper
    geofenceRadius: rank.geofenceRadius,
    autoDispatch: rank.autoDispatch,
    responseTimeoutMinutes: rank.responseTimeoutMinutes,
    isActive: rank.isActive,
    // For PlacesInput default value, use a formatted address string if available
    // Since we don't store the address string, we leave it blank; user can search again.
    locationLabel: '',
  };

  return (
    <div className="container max-w-5xl py-6">
      <RankForm
        tenantId={tenantId}
        rankId={rankId}
        initialData={initialData}
      />
    </div>
  );
}