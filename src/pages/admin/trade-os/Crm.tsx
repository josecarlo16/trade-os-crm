import { RoleGate } from '@/components/tradeos/RoleGate';
import { PipelineStatus } from '@/components/admin/dashboard/PipelineStatus';
import { LeadMetrics } from '@/components/admin/dashboard/LeadMetrics';
import { ModuleCard } from '@/components/tradeos/ModuleCards';
import { Users, TrendingUp } from 'lucide-react';

export default function TradeOSCrmPage() {
  return (
    <RoleGate block="crm_pipeline" title="Core CRM">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ModuleCard title="Pipeline" icon={<Users className="h-3.5 w-3.5" />}>
          <PipelineStatus />
        </ModuleCard>
        <ModuleCard title="Lead Metrics" icon={<TrendingUp className="h-3.5 w-3.5" />}>
          <LeadMetrics />
        </ModuleCard>
      </div>
    </RoleGate>
  );
}
