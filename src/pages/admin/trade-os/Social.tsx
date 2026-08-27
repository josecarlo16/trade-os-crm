import { RoleGate } from '@/components/tradeos/RoleGate';
import { LinkOutModuleCard } from '@/components/tradeos/ModuleCards';
import { Megaphone } from 'lucide-react';

export default function TradeOSSocialPage() {
  return (
    <RoleGate block="social_posting" title="Social Posting">
      <LinkOutModuleCard
        title="Social Posting"
        icon={<Megaphone className="h-4 w-4" />}
        href="/admin/social-studio"
        description="Open Social Studio — post queue, drafts, and brand management"
      />
    </RoleGate>
  );
}
