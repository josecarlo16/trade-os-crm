import { lazy, Suspense } from 'react';
import { RoleGate } from '@/components/tradeos/RoleGate';
import { ModuleCard, OpenAppBanner } from '@/components/tradeos/ModuleCards';
import { Skeleton } from '@/components/ui/skeleton';
import { Wrench, HardHat } from 'lucide-react';
import { EXTERNAL_APP_URLS } from '@/lib/tradeOSRoles';

const JobTypeBoardPreview = lazy(() =>
  import('@/components/admin/dashboard/JobTypeBoardPreview').then((m) => ({ default: m.JobTypeBoardPreview }))
);

const Fallback = () => <Skeleton className="h-[360px] w-full rounded-lg" />;

export default function TradeOSWorkEdgePage() {
  const app = EXTERNAL_APP_URLS.workedge_board;
  return (
    <RoleGate block="workedge_board" title="WorkEdge">
      {app && <OpenAppBanner label={app.label} url={app.url} />}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ModuleCard title="Service Calls" icon={<Wrench className="h-3.5 w-3.5" />}>
          <Suspense fallback={<Fallback />}>
            <JobTypeBoardPreview jobTypeSlug="residential-service-call" title="Service Calls Board" icon="wrench" />
          </Suspense>
        </ModuleCard>
        <ModuleCard title="Installs" icon={<HardHat className="h-3.5 w-3.5" />}>
          <Suspense fallback={<Fallback />}>
            <JobTypeBoardPreview jobTypeSlug="residential-installation" title="Installs Board" icon="hardhat" />
          </Suspense>
        </ModuleCard>
      </div>
    </RoleGate>
  );
}
