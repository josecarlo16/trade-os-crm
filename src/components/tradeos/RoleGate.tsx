import { ReactNode } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { toRoleTemplate, canSeeBlock, BlockId } from '@/lib/tradeOSRoles';
import { RestrictedPage } from './ModuleCards';
import { Loader2 } from 'lucide-react';

/** Guards a full Trade OS sub-page behind the same block permission that hides it in the sidebar — covers direct-URL access, not just nav clicks. */
export function RoleGate({ block, title, children }: { block: BlockId; title: string; children: ReactNode }) {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-tradeos-accent" />
      </div>
    );
  }

  const roleTemplate = toRoleTemplate(role);
  if (!canSeeBlock(roleTemplate, block)) {
    return <RestrictedPage title={title} />;
  }

  return <>{children}</>;
}
