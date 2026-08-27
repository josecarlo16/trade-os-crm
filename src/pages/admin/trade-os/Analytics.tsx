import { RoleGate } from '@/components/tradeos/RoleGate';
import { ModuleCard } from '@/components/tradeos/ModuleCards';
import { RevenueSummary } from '@/components/admin/dashboard/RevenueSummary';
import { BarChart3 } from 'lucide-react';

export default function TradeOSAnalyticsPage() {
  return (
    <RoleGate block="analytics" title="Analytics">
      <ModuleCard title="Revenue" icon={<BarChart3 className="h-3.5 w-3.5" />}>
        <RevenueSummary />
      </ModuleCard>
    </RoleGate>
  );
}
