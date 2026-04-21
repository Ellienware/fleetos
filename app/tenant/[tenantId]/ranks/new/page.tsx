// app/tenant/[tenantId]/ranks/new/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { RankForm } from './rank_form';
// adjust path if you placed RankForm elsewhere

export default function NewRankPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  return (
    <div className="container mx-auto py-8">
      <RankForm tenantId={tenantId} />
    </div>
  );
}