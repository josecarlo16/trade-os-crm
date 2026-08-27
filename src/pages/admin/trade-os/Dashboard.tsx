import { lazy, Suspense } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { StatsCards } from '@/components/admin/dashboard/StatsCards';
import { PipelineStatus } from '@/components/admin/dashboard/PipelineStatus';
import { RevenueSummary } from '@/components/admin/dashboard/RevenueSummary';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { useUserRole } from '@/hooks/useUserRole';
import { useTradeOSLayoutPrefs } from '@/hooks/useTradeOSLayoutPrefs';
import { toRoleTemplate, ROLE_BLOCKS, BlockId } from '@/lib/tradeOSRoles';
import { useCustomizeMode } from '@/components/tradeos/CustomizeModeContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wrench, Users, DollarSign, BarChart3, MessageSquare, ClipboardCheck, Megaphone, FileText, Package, Eye } from 'lucide-react';
import { ModuleCard, LinkOutModuleCard, LockedModuleCard } from '@/components/tradeos/ModuleCards';
import { SortableBlock } from '@/components/tradeos/SortableBlock';
import { ApprovalsCard } from '@/components/tradeos/ApprovalsCard';
import { MessagesPreviewCard } from '@/components/tradeos/MessagesPreviewCard';
import { Link } from 'react-router-dom';

const JobTypeBoardPreview = lazy(() =>
  import('@/components/admin/dashboard/JobTypeBoardPreview').then((m) => ({ default: m.JobTypeBoardPreview }))
);
const InvoicingSnapshot = lazy(() =>
  import('@/components/admin/dashboard/InvoicingSnapshot').then((m) => ({ default: m.InvoicingSnapshot }))
);

const WidgetFallback = ({ height = 220 }: { height?: number }) => (
  <Skeleton className="w-full rounded-lg" style={{ height }} />
);

const ALL_BLOCKS: BlockId[] = ['workedge_board', 'crm_pipeline', 'analytics', 'ar_collections', 'messages', 'approvals', 'social_posting', 'job_documentation', 'material_requests'];

export default function TradeOSDashboardPage() {
  const { role } = useUserRole();
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { isCustomizing } = useCustomizeMode();
  const roleTemplate = toRoleTemplate(role);
  const permitted = roleTemplate ? ROLE_BLOCKS[roleTemplate] : [];
  const lockedBlocks = ALL_BLOCKS.filter((b) => !permitted.includes(b));

  const { order, hidden, reorder, toggleHidden, reset } = useTradeOSLayoutPrefs(roleTemplate, permitted);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorder(active.id as BlockId, over.id as BlockId);
  };

  const visibleOrder = order.filter((b) => !hidden.has(b));
  const hiddenOrder = order.filter((b) => hidden.has(b));

  const stats = summary?.stats || { total: 0, new: 0, reviewed: 0, thisWeek: 0 };

  const renderBlock = (id: BlockId) => {
    switch (id) {
      case 'workedge_board':
        return (
          <ModuleCard title="WorkEdge" icon={<Wrench className="h-3.5 w-3.5" />}>
            <Suspense fallback={<WidgetFallback />}>
              <JobTypeBoardPreview jobTypeSlug="residential-service-call" title="Service Calls Board" icon="wrench" />
            </Suspense>
          </ModuleCard>
        );
      case 'crm_pipeline':
        return (
          <ModuleCard title="Core CRM" icon={<Users className="h-3.5 w-3.5" />}>
            <PipelineStatus />
          </ModuleCard>
        );
      case 'analytics':
        return (
          <ModuleCard title="Analytics" icon={<BarChart3 className="h-3.5 w-3.5" />}>
            <RevenueSummary />
          </ModuleCard>
        );
      case 'ar_collections':
        return (
          <ModuleCard title="OttoPay" icon={<DollarSign className="h-3.5 w-3.5" />}>
            <Suspense fallback={<WidgetFallback />}>
              <InvoicingSnapshot />
            </Suspense>
          </ModuleCard>
        );
      case 'messages':
        return (
          <ModuleCard
            title="Messages"
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            action={
              <Link to="/admin/trade-os/messages" className="text-xs font-semibold text-tradeos-accent-ink hover:underline">
                Open →
              </Link>
            }
          >
            <MessagesPreviewCard />
          </ModuleCard>
        );
      case 'approvals':
        return (
          <ModuleCard title="Approvals" icon={<ClipboardCheck className="h-3.5 w-3.5" />}>
            <ApprovalsCard />
          </ModuleCard>
        );
      case 'social_posting':
        return <LinkOutModuleCard title="Social Posting" icon={<Megaphone className="h-4 w-4" />} href="/admin/social-studio" description="Open Social Studio" />;
      case 'job_documentation':
        return <LinkOutModuleCard title="Job Documentation" icon={<FileText className="h-4 w-4" />} href="/admin/workedge" description="Open WorkEdge Projects" />;
      case 'material_requests':
        return <LinkOutModuleCard title="Parts Requests" icon={<Package className="h-4 w-4" />} href="/admin/material-requests" description="Open Material Requests" />;
      default:
        return null;
    }
  };

  const BLOCK_LABEL: Record<BlockId, string> = {
    workedge_board: 'WorkEdge',
    crm_pipeline: 'Core CRM',
    analytics: 'Analytics',
    ar_collections: 'OttoPay',
    messages: 'Messages',
    approvals: 'Approvals',
    social_posting: 'Social Posting',
    job_documentation: 'Job Documentation',
    material_requests: 'Parts Requests',
  };

  return (
    <div className="space-y-4">
      {isCustomizing && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-tradeos-accent bg-tradeos-accent/10 px-4 py-2.5">
          <span className="text-xs font-medium text-tradeos-accent-ink">
            Drag cards to rearrange. Hide what you don't need — it lands here. Your layout saves to this device.
          </span>
          {hiddenOrder.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {hiddenOrder.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleHidden(id)}
                  className="inline-flex items-center gap-1 rounded-full border border-tradeos-line-strong bg-tradeos-surface px-2.5 py-1 text-xs font-medium text-tradeos-ink-2 hover:border-tradeos-accent hover:text-tradeos-accent-ink"
                >
                  <Eye className="h-3 w-3" />
                  {BLOCK_LABEL[id]}
                </button>
              ))}
            </div>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={reset} className="ml-auto text-xs text-tradeos-ink-2 hover:text-tradeos-crit">
            Reset layout
          </Button>
        </div>
      )}

      {summaryLoading ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : (
        <StatsCards
          totalSubmissions={stats.total}
          newSubmissions={stats.new}
          reviewedSubmissions={stats.reviewed}
          thisWeekSubmissions={stats.thisWeek}
        />
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {visibleOrder.map((id) => (
              <SortableBlock key={id} id={id} customizing={isCustomizing} onHide={() => toggleHidden(id)}>
                {renderBlock(id)}
              </SortableBlock>
            ))}
            {lockedBlocks.map((id) => (
              <LockedModuleCard key={id} title={BLOCK_LABEL[id]} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <p className="max-w-[74ch] text-xs text-tradeos-ink-3">
        Which modules appear here is driven by role — not hardcoded per user. The mapping
        (<code className="rounded bg-tradeos-surface-2 px-1 py-0.5 font-tradeMono text-[11px]">ROLE_BLOCKS</code> in{' '}
        <code className="rounded bg-tradeos-surface-2 px-1 py-0.5 font-tradeMono text-[11px]">src/lib/tradeOSRoles.ts</code>) is a
        temporary client-side stand-in for <code className="rounded bg-tradeos-surface-2 px-1 py-0.5 font-tradeMono text-[11px]">permission_grants</code> +{' '}
        <code className="rounded bg-tradeos-surface-2 px-1 py-0.5 font-tradeMono text-[11px]">get_effective_dashboard_layout()</code>. Card order and
        hidden state above are saved to this browser only (<code className="rounded bg-tradeos-surface-2 px-1 py-0.5 font-tradeMono text-[11px]">localStorage</code>) until
        the real <code className="rounded bg-tradeos-surface-2 px-1 py-0.5 font-tradeMono text-[11px]">dashboard_layouts</code> table lands, at which
        point this becomes a per-account setting. Actual data access is still governed entirely by existing RLS regardless of what renders here.
      </p>
    </div>
  );
}
