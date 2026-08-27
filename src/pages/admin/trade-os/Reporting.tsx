import { RoleGate } from '@/components/tradeos/RoleGate';
import { LinkOutModuleCard } from '@/components/tradeos/ModuleCards';
import { FileText } from 'lucide-react';

export default function TradeOSReportingPage() {
  return (
    <RoleGate block="job_documentation" title="Job Documentation">
      <LinkOutModuleCard
        title="Job Documentation"
        icon={<FileText className="h-4 w-4" />}
        href="/admin/workedge"
        description="Open WorkEdge Projects — closeout, photos, and job notes"
      />
    </RoleGate>
  );
}
