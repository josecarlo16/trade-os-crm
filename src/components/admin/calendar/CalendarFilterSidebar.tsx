import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface GoogleCalendar {
  id: string;
  name: string;
  color: string;
  calendar_id: string;
}

interface CalendarFilterSidebarProps {
  calendars: GoogleCalendar[];
  showCrmJobs: boolean;
  onShowCrmJobsChange: (show: boolean) => void;
  visibleCalendarIds: Set<string>;
  onVisibleCalendarsChange: (ids: Set<string>) => void;
}

export default function CalendarFilterSidebar({
  calendars,
  showCrmJobs,
  onShowCrmJobsChange,
  visibleCalendarIds,
  onVisibleCalendarsChange,
}: CalendarFilterSidebarProps) {
  const isMobile = useIsMobile();

  const toggleCalendar = (id: string) => {
    const newSet = new Set(visibleCalendarIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onVisibleCalendarsChange(newSet);
  };

  const showAll = () => {
    onVisibleCalendarsChange(new Set(calendars.map(c => c.id)));
  };

  const hideAll = () => {
    onVisibleCalendarsChange(new Set());
  };

  const content = (
    <div className="space-y-4">
      {/* CRM Jobs Toggle */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Internal
        </h4>
        <label className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5 -mx-2">
          <Checkbox
            checked={showCrmJobs}
            onCheckedChange={(checked) => onShowCrmJobsChange(!!checked)}
          />
          <div className="w-3 h-3 rounded-full bg-primary shrink-0" />
          <span className="text-sm">CRM Jobs</span>
        </label>
      </div>

      {/* Google Calendars */}
      {calendars.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Google Calendars
          </h4>
          <div className="space-y-0.5">
            {calendars.map((cal) => (
              <label
                key={cal.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5 -mx-2"
              >
                <Checkbox
                  checked={visibleCalendarIds.has(cal.id)}
                  onCheckedChange={() => toggleCalendar(cal.id)}
                />
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: cal.color }}
                />
                <span className="text-sm truncate">{cal.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {calendars.length > 0 && (
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={showAll}>
            Show All
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={hideAll}>
            Hide All
          </Button>
        </div>
      )}
    </div>
  );

  // Mobile: Show as popover
  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64">
          {content}
        </PopoverContent>
      </Popover>
    );
  }

  // Desktop: Show as sidebar card
  return (
    <Card className="w-[220px] shrink-0 h-fit">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium">Calendars</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {content}
      </CardContent>
    </Card>
  );
}
