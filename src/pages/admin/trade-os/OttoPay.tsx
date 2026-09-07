import { lazy, Suspense } from 'react';
import { RoleGate } from '@/components/tradeos/RoleGate';
import { ModuleCard, OpenAppBanner } from '@/components/tradeos/ModuleCards';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { EXTERNAL_APP_URLS } from '@/lib/tradeOSRoles';

const InvoicingSnapshot = lazy(() =>
  import('@/components/admin/dashboard/InvoicingSnapshot').then((m) => ({ default: m.InvoicingSnapshot }))
);

export default function TradeOSOttoPayPage() {
  const app = EXTERNAL_APP_URLS.ar_collections;
  return (
    <RoleGate block="ar_collections" title="OttoPay">
      {app && <OpenAppBanner label={app.label} url={app.url} />}
      <ModuleCard
        title="Invoicing & A/R"
        icon={<DollarSign className="h-3.5 w-3.5" />}
        action={
          <Link to="/admin/invoicing">
            <Badge variant="outline" className="cursor-pointer border-tradeos-line-strong text-tradeos-ink-2 hover:border-tradeos-accent hover:text-tradeos-accent-ink">
              Open Mission Control →
            </Badge>
          </Link>
        }
      >
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
          <InvoicingSnapshot />
        </Suspense>
      </ModuleCard>
    </RoleGate>
  );
}
