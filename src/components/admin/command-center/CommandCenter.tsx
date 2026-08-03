import { Card } from '@/components/ui/card';
import { CommandCenterStats } from './CommandCenterStats';
import { TaskPanel } from './TaskPanel';
import { NotificationPanel } from './NotificationPanel';
import { SchedulePanel } from './SchedulePanel';
import { LeadAssignmentPanel } from './LeadAssignmentPanel';

export const CommandCenter = () => {
  return (
    <Card className="border-t-4 border-t-[#1e3a5f] shadow-sm">
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Command Center</h2>
        </div>
        <CommandCenterStats />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TaskPanel />
          <NotificationPanel />
          <SchedulePanel />
          <LeadAssignmentPanel />
        </div>
      </div>
    </Card>
  );
};
