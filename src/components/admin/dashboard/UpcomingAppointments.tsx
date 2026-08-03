import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { formatTimeCSTDisplay } from '@/lib/cstTimezone';

interface Appointment {
  id: string;
  title: string | null;
  start_datetime: string;
  end_datetime: string;
  job: {
    id: string;
    job_number: string;
    title: string;
  } | null;
  team: {
    id: string;
    name: string;
    color: string | null;
  } | null;
}

interface GroupedAppointments {
  [key: string]: Appointment[];
}

export function UpcomingAppointments() {
  const today = startOfDay(new Date());
  const weekEnd = addDays(today, 7);

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['dashboard-appointments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_job_appointments')
        .select(`
          id, title, start_datetime, end_datetime,
          job:crm_jobs(id, job_number, title),
          team:crm_teams(id, name, color)
        `)
        .gte('start_datetime', today.toISOString())
        .lte('start_datetime', weekEnd.toISOString())
        .order('start_datetime')
        .limit(20);
      
      if (error) throw error;
      return data as Appointment[];
    },
  });

  // Group appointments by date
  const groupedAppointments: GroupedAppointments = {};
  appointments?.forEach((apt) => {
    const date = startOfDay(new Date(apt.start_datetime)).toISOString();
    if (!groupedAppointments[date]) {
      groupedAppointments[date] = [];
    }
    groupedAppointments[date].push(apt);
  });

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const todayCST = today.toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
    const tomorrowDate = new Date(today);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowCST = tomorrowDate.toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
    const dateCST = date.toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
    if (dateCST === todayCST) return 'Today';
    if (dateCST === tomorrowCST) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Calculate stats
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const thisWeekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
  const thisWeekCount = (appointments || []).filter((apt) => {
    const aptDate = new Date(apt.start_datetime);
    return aptDate >= thisWeekStart && aptDate <= thisWeekEnd;
  }).length;
  const next7DaysCount = appointments?.length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Appointments
          </CardTitle>
          <Skeleton className="h-8 w-28" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-14 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedDates = Object.keys(groupedAppointments).sort();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Appointments
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/calendar" className="flex items-center gap-1">
            View Calendar <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {sortedDates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No upcoming appointments</p>
            </div>
          ) : (
            sortedDates.map((dateStr) => (
              <div key={dateStr}>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                  {getDateLabel(dateStr)}
                </h4>
                <div className="space-y-2">
                  {groupedAppointments[dateStr].map((apt) => (
                    <Link
                      key={apt.id}
                      to={apt.job ? `/admin/jobs/${apt.job.id}` : '/admin/calendar'}
                      className="flex items-center gap-3 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                    >
                      {/* Team color indicator */}
                      <div
                        className="w-1 h-10 rounded-full flex-shrink-0"
                        style={{ backgroundColor: apt.team?.color || 'hsl(var(--muted))' }}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs font-medium">
                            {formatTimeCSTDisplay(apt.start_datetime)}
                          </span>
                          {apt.job && (
                            <span className="text-xs font-mono text-muted-foreground">
                              {apt.job.job_number}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium truncate">
                          {apt.title || apt.job?.title || 'Untitled Appointment'}
                        </p>
                      </div>

                      {apt.team && (
                        <Badge 
                          variant="outline" 
                          className="text-[10px] flex-shrink-0"
                          style={{ 
                            borderColor: apt.team.color || undefined,
                            color: apt.team.color || undefined 
                          }}
                        >
                          {apt.team.name}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-3 mt-4">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {thisWeekCount} this week
          </span>
          <span>
            Next 7 days: {next7DaysCount} scheduled
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
