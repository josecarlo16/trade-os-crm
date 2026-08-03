import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RefreshCw, Settings, Share, Clock, MapPin, User, Briefcase, ExternalLink } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subWeeks, subMonths, parseISO } from "date-fns";
import { buildCSTDateTime, formatTimeCSTDisplay } from "@/lib/cstTimezone";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import CalendarView from "@/components/admin/calendar/CalendarView";
import CalendarFilterSidebar from "@/components/admin/calendar/CalendarFilterSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type ViewMode = "week" | "month" | "day";

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  calendarId: string;
  description?: string;
  location?: string;
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const isMobile = useIsMobile();

  // Multi-calendar filter state
  const [showCrmJobs, setShowCrmJobs] = useState(true);
  const [visibleCalendarIds, setVisibleCalendarIds] = useState<Set<string>>(new Set());

  // Fetch synced calendars
  const { data: calendars } = useQuery({
    queryKey: ["google-calendars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_calendars")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Initialize visible calendars when data loads
  useEffect(() => {
    if (calendars?.length && visibleCalendarIds.size === 0) {
      setVisibleCalendarIds(new Set(calendars.map(c => c.id)));
    }
  }, [calendars, visibleCalendarIds.size]);

  // Fetch job appointments from database
  const { data: appointments } = useQuery({
    queryKey: ["calendar-appointments", currentDate, viewMode],
    queryFn: async () => {
      const { start, end } = getDateRange();
      const { data, error } = await supabase
        .from("crm_job_appointments")
        .select(`
          *,
          job:crm_jobs(id, job_number, title, customer:crm_customers(first_name, last_name)),
          team:crm_teams(id, name, color),
          calendar:google_calendars(id, name, color, calendar_id),
          synced_calendars:crm_job_appointment_calendars(google_calendar_event_id, google_calendar_db_id, synced_calendar:google_calendars(id, name, color))
        `)
        .gte("start_datetime", start.toISOString())
        .lte("start_datetime", end.toISOString())
        .order("start_datetime");
      if (error) throw error;
      return data;
    },
  });

  // Fetch Google Calendar events only from visible calendars
  const { data: googleEvents, refetch: refetchEvents } = useQuery({
    queryKey: ["google-calendar-events", currentDate, viewMode, Array.from(visibleCalendarIds), calendars],
    queryFn: async () => {
      if (!calendars?.length || visibleCalendarIds.size === 0) return [];
      
      const { start, end } = getDateRange();
      const calendarIds = calendars
        .filter(c => visibleCalendarIds.has(c.id))
        .map(c => c.calendar_id);

      if (!calendarIds.length) return [];

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const response = await supabase.functions.invoke("google-calendar-sync", {
        body: {
          action: "get-all-events",
          calendarIds,
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
        },
      });

      if (response.error) {
        console.error("Failed to fetch events:", response.error);
        return [];
      }

      return response.data?.items || [];
    },
    enabled: !!calendars?.length && visibleCalendarIds.size > 0,
  });

  function getDateRange() {
    // Build date ranges using CST-aware boundaries so queries return
    // correct events regardless of the user's browser timezone.
    const cstDateStr = currentDate.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }); // YYYY-MM-DD
    const cstDate = new Date(cstDateStr + 'T00:00:00');
    
    let start: Date, end: Date;
    switch (viewMode) {
      case "day":
        start = new Date(cstDateStr + 'T00:00:00Z');
        // Shift from CST midnight to UTC: CST is UTC-6 (or -5 during DST)
        // Use buildCSTDateTime for accuracy
        start = new Date(buildCSTDateTime(cstDateStr, '00:00'));
        end = new Date(buildCSTDateTime(cstDateStr, '23:59'));
        break;
      case "week":
        const weekStart = startOfWeek(cstDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(cstDate, { weekStartsOn: 0 });
        const wsStr = weekStart.toISOString().slice(0, 10);
        const weStr = weekEnd.toISOString().slice(0, 10);
        start = new Date(buildCSTDateTime(wsStr, '00:00'));
        end = new Date(buildCSTDateTime(weStr, '23:59'));
        break;
      case "month":
        const monthStart = startOfMonth(cstDate);
        const monthEnd = endOfMonth(cstDate);
        const msStr = monthStart.toISOString().slice(0, 10);
        const meStr = monthEnd.toISOString().slice(0, 10);
        start = new Date(buildCSTDateTime(msStr, '00:00'));
        end = new Date(buildCSTDateTime(meStr, '23:59'));
        break;
    }
    return { start: start!, end: end! };
  }

  const navigate = (direction: "prev" | "next") => {
    const fn = direction === "prev" 
      ? viewMode === "month" ? subMonths : subWeeks
      : viewMode === "month" ? addMonths : addWeeks;
    
    if (viewMode === "day") {
      setCurrentDate(d => addDays(d, direction === "prev" ? -1 : 1));
    } else {
      setCurrentDate(d => fn(d, 1));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchEvents();
      toast.success("Calendar refreshed");
    } catch (err) {
      toast.error("Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  const getTitle = () => {
    switch (viewMode) {
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy");
      case "week":
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
        return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
      case "month":
        return format(currentDate, "MMMM yyyy");
    }
  };

  // Combine and filter events based on visibility settings
  const combinedEvents = useMemo(() => {
    const events: Array<{
      id: string;
      title: string;
      start: Date;
      end: Date;
      type: "job" | "google";
      color: string;
      data: any;
    }> = [];

    // Add job appointments only if CRM Jobs toggle is on
    if (showCrmJobs) {
      appointments?.forEach((apt: any) => {
        if (apt.start_datetime) {
          const start = new Date(apt.start_datetime);
          const end = apt.end_datetime ? new Date(apt.end_datetime) : addDays(start, 0.25);
          const customer = apt.job?.customer;
          const customerName = customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : '';
          const label = customerName || apt.job?.job_number || "Job";
          const title = apt.title || apt.job?.title || "Appointment";

          // Create one event per synced calendar so the appointment shows on each person's calendar
          const syncedCals = apt.synced_calendars?.filter((sc: any) => sc.synced_calendar) || [];
          
          if (syncedCals.length > 0) {
            syncedCals.forEach((sc: any) => {
              const cal = sc.synced_calendar;
              if (visibleCalendarIds.has(cal.id)) {
                events.push({
                  id: `${apt.id}-${cal.id}`,
                  title: `${label} - ${title}`,
                  start,
                  end,
                  type: "job",
                  color: cal.color || apt.team?.color || "#3b82f6",
                  data: apt,
                });
              }
            });
          } else {
            // Fallback: no synced calendars, show with primary calendar color
            events.push({
              id: apt.id,
              title: `${label} - ${title}`,
              start,
              end,
              type: "job",
              color: apt.team?.color || apt.calendar?.color || "#3b82f6",
              data: apt,
            });
          }
        }
      });
    }

    // Build set of synced Google event IDs to avoid duplicates
    const syncedEventIds = new Set<string>();
    appointments?.forEach((a: any) => {
      if (a.google_calendar_event_id) syncedEventIds.add(a.google_calendar_event_id);
      a.synced_calendars?.forEach((sc: any) => {
        if (sc.google_calendar_event_id) syncedEventIds.add(sc.google_calendar_event_id);
      });
    });

    // Add Google events only from visible calendars
    googleEvents?.forEach((event: CalendarEvent) => {
      const eventStart = event.start.dateTime || event.start.date;
      const eventEnd = event.end.dateTime || event.end.date;
      if (eventStart) {
        if (!syncedEventIds.has(event.id)) {
          const calendar = calendars?.find((c) => c.calendar_id === event.calendarId);
          // Only include if calendar is in visible set
          if (calendar && visibleCalendarIds.has(calendar.id)) {
            events.push({
              id: event.id,
              title: event.summary || "Untitled",
              start: parseISO(eventStart),
              end: eventEnd ? parseISO(eventEnd) : addDays(parseISO(eventStart), 0.25),
              type: "google",
              color: calendar?.color || "#9ca3af",
              data: event,
            });
          }
        }
      }
    });

    return events.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [appointments, googleEvents, calendars, showCrmJobs, visibleCalendarIds]);

  return (
    <AdminLayout title="Calendar">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Calendar</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/admin/calendar`);
                toast.success("Calendar link copied!");
              }}
            >
              <Share className="h-4 w-4 mr-1" />
              Copy Link
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link to="/admin/calendars">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" />
                Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigate("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigate("next")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-lg font-medium ml-2">{getTitle()}</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Mobile filter button */}
                {isMobile && (
                  <CalendarFilterSidebar
                    calendars={calendars || []}
                    showCrmJobs={showCrmJobs}
                    onShowCrmJobsChange={setShowCrmJobs}
                    visibleCalendarIds={visibleCalendarIds}
                    onVisibleCalendarsChange={setVisibleCalendarIds}
                  />
                )}

                <div className="flex border rounded-md">
                  {(["day", "week", "month"] as ViewMode[]).map(mode => (
                    <Button
                      key={mode}
                      variant={viewMode === mode ? "default" : "ghost"}
                      size="sm"
                      className="rounded-none first:rounded-l-md last:rounded-r-md"
                      onClick={() => setViewMode(mode)}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main content with sidebar */}
        <div className="flex gap-4">
          {/* Desktop sidebar */}
          {!isMobile && (
            <CalendarFilterSidebar
              calendars={calendars || []}
              showCrmJobs={showCrmJobs}
              onShowCrmJobsChange={setShowCrmJobs}
              visibleCalendarIds={visibleCalendarIds}
              onVisibleCalendarsChange={setVisibleCalendarIds}
            />
          )}

          {/* Calendar Grid */}
          <div className="flex-1 min-w-0">
            <CalendarView 
              events={combinedEvents}
              currentDate={currentDate}
              viewMode={viewMode}
              onDateChange={setCurrentDate}
              onEventClick={setSelectedEvent}
            />
          </div>
        </div>

        {/* Event Detail Dialog */}
        <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
          <DialogContent className="sm:max-w-lg [&>button]:top-3 [&>button]:right-3">
            <DialogHeader>
              <DialogTitle className="flex items-start gap-2 mr-8">
                <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: selectedEvent?.color }} />
                <span className="break-words">{selectedEvent?.title}</span>
              </DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4">
                {/* Time */}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(selectedEvent.start, "EEEE, MMMM d, yyyy")}
                    <br />
                    {formatTimeCSTDisplay(selectedEvent.start)} – {formatTimeCSTDisplay(selectedEvent.end)}
                  </span>
                </div>

                {/* Job info */}
                {selectedEvent.type === "job" && selectedEvent.data?.job && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>
                        <span className="font-mono text-muted-foreground">{selectedEvent.data.job.job_number}</span>
                        {" — "}
                        {selectedEvent.data.job.title}
                      </span>
                    </div>
                    {selectedEvent.data.job.customer && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {selectedEvent.data.job.customer.first_name} {selectedEvent.data.job.customer.last_name}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* Team */}
                {selectedEvent.data?.team && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline" style={{ borderColor: selectedEvent.data.team.color, color: selectedEvent.data.team.color }}>
                      {selectedEvent.data.team.name}
                    </Badge>
                  </div>
                )}

                {/* Google event location/description */}
                {selectedEvent.type === "google" && selectedEvent.data?.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEvent.data.location}</span>
                  </div>
                )}

                {/* Notes */}
                {selectedEvent.data?.notes && (
                  <div className="text-sm text-muted-foreground border-t pt-3">
                    {selectedEvent.data.notes}
                  </div>
                )}

                {selectedEvent.type === "google" && selectedEvent.data?.description && (
                  <div className="text-sm text-muted-foreground border-t pt-3">
                    {selectedEvent.data.description}
                  </div>
                )}

                {/* Action buttons - stacked */}
                {selectedEvent.type === "job" && selectedEvent.data?.job?.id && (
                  <div className="border-t pt-3 flex flex-col gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/admin/jobs/${selectedEvent.data.job.id}`}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Job Details
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="default">
                      <Link to={`/admin/jobs/${selectedEvent.data.job.id}?tab=appointments&apt=${selectedEvent.data.id}`}>
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        View Appointment
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}