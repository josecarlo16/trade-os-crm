import { lazy, Suspense } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatsCards } from '@/components/admin/dashboard/StatsCards';
import { QuickActions } from '@/components/admin/dashboard/QuickActions';
import { LeadMetrics } from '@/components/admin/dashboard/LeadMetrics';
import { RevenueSummary } from '@/components/admin/dashboard/RevenueSummary';
import { PipelineStatus } from '@/components/admin/dashboard/PipelineStatus';
import { DeferredWidget } from '@/components/admin/dashboard/DeferredWidget';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { CommandCenter } from '@/components/admin/command-center/CommandCenter';
import { useAssistant } from '@/components/admin/assistant/AssistantContext';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { BriefingSummaryCard } from '@/components/admin/dashboard/BriefingSummaryCard';

// Below-the-fold widgets — code-split + intersection-observer mounted
const RecentSubmissions = lazy(() =>
  import('@/components/admin/dashboard/RecentSubmissions').then(m => ({ default: m.RecentSubmissions }))
);
const SubmissionsChart = lazy(() =>
  import('@/components/admin/dashboard/SubmissionsChart').then(m => ({ default: m.SubmissionsChart }))
);
const ActivityFeed = lazy(() =>
  import('@/components/admin/dashboard/ActivityFeed').then(m => ({ default: m.ActivityFeed }))
);
const InvoicingSnapshot = lazy(() =>
  import('@/components/admin/dashboard/InvoicingSnapshot').then(m => ({ default: m.InvoicingSnapshot }))
);
const EngagementStats = lazy(() =>
  import('@/components/admin/dashboard/EngagementStats').then(m => ({ default: m.EngagementStats }))
);
const DuctedMetricsCard = lazy(() =>
  import('@/components/admin/dashboard/DuctedMetricsCard').then(m => ({ default: m.DuctedMetricsCard }))
);
const DuctlessMetricsCard = lazy(() =>
  import('@/components/admin/dashboard/DuctlessMetricsCard').then(m => ({ default: m.DuctlessMetricsCard }))
);
const JobTypeBoardPreview = lazy(() =>
  import('@/components/admin/dashboard/JobTypeBoardPreview').then(m => ({ default: m.JobTypeBoardPreview }))
);
const UpcomingAppointments = lazy(() =>
  import('@/components/admin/dashboard/UpcomingAppointments').then(m => ({ default: m.UpcomingAppointments }))
);

const WidgetFallback = ({ height = 200 }: { height?: number }) => (
  <Skeleton className="w-full rounded-lg" style={{ height }} />
);

const Dashboard = () => {
  const outletContext = useOutletContext<{ briefingData?: any; canBriefing?: boolean }>();
  const { openPanel } = useAssistant();
  const { data: summary, isLoading } = useDashboardSummary();

  if (isLoading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
        </div>
      </AdminLayout>
    );
  }

  const stats = summary?.stats || { total: 0, new: 0, reviewed: 0, thisWeek: 0 };
  const recentSubmissions = summary?.recentSubmissions || [];
  const chartSubmissions = summary?.chartSubmissions || [];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {outletContext?.canBriefing && outletContext?.briefingData && (
          <BriefingSummaryCard briefingData={outletContext.briefingData} onOpenAssistant={openPanel} />
        )}

        {/* Above the fold — render immediately */}
        <CommandCenter />

        <StatsCards
          totalSubmissions={stats.total}
          newSubmissions={stats.new}
          reviewedSubmissions={stats.reviewed}
          thisWeekSubmissions={stats.thisWeek}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueSummary />
          <PipelineStatus />
        </div>

        {/* Below the fold — defer mount until near viewport */}
        <DeferredWidget minHeight={400}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Suspense fallback={<WidgetFallback height={400} />}>
              <JobTypeBoardPreview jobTypeSlug="residential-service-call" title="Service Calls Board" icon="wrench" />
            </Suspense>
            <Suspense fallback={<WidgetFallback height={400} />}>
              <JobTypeBoardPreview jobTypeSlug="residential-installation" title="Installs Board" icon="hardhat" />
            </Suspense>
          </div>
        </DeferredWidget>

        <DeferredWidget minHeight={420}>
          <Suspense fallback={<WidgetFallback height={420} />}>
            <UpcomingAppointments />
          </Suspense>
        </DeferredWidget>

        <DeferredWidget minHeight={420}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Suspense fallback={<WidgetFallback height={420} />}>
              <DuctedMetricsCard />
            </Suspense>
            <Suspense fallback={<WidgetFallback height={420} />}>
              <DuctlessMetricsCard />
            </Suspense>
          </div>
        </DeferredWidget>

        <DeferredWidget minHeight={200}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <QuickActions />
            <LeadMetrics />
            <Suspense fallback={<WidgetFallback height={200} />}>
              <InvoicingSnapshot />
            </Suspense>
          </div>
        </DeferredWidget>

        <DeferredWidget minHeight={350}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Suspense fallback={<WidgetFallback height={350} />}>
              <SubmissionsChart submissions={chartSubmissions} days={30} />
            </Suspense>
            <Suspense fallback={<WidgetFallback height={350} />}>
              <EngagementStats />
            </Suspense>
          </div>
        </DeferredWidget>

        <DeferredWidget minHeight={350}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Suspense fallback={<WidgetFallback height={350} />}>
              <ActivityFeed />
            </Suspense>
            <Suspense fallback={<WidgetFallback height={350} />}>
              <RecentSubmissions submissions={recentSubmissions} />
            </Suspense>
          </div>
        </DeferredWidget>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
