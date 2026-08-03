import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertTriangle, CheckCircle2, RefreshCw, ExternalLink } from "lucide-react";
import { addHours } from "date-fns";
import { formatInCST, buildCSTDateTime } from "@/lib/cstTimezone";
import { toast } from "sonner";

interface SchedulingWidgetProps {
  job: {
    id: string;
    job_number: string;
    title: string;
    scheduled_start: string | null;
    scheduled_end: string | null;
    google_calendar_event_id: string | null;
    google_calendar_id: string | null;
    customer?: {
      first_name: string | null;
      last_name: string | null;
      phone: string | null;
    } | null;
    location?: {
      address_line1: string;
      city: string;
      state: string;
      zip_code: string;
    } | null;
    job_type?: {
      name: string;
      default_duration_hours: number | null;
    } | null;
    priority: string | null;
    customer_notes: string | null;
  };
  onUpdate?: () => void;
}

export default function SchedulingWidget({ job, onUpdate }: SchedulingWidgetProps) {
  const queryClient = useQueryClient();
  const [scheduledStart, setScheduledStart] = useState(() => {
    if (!job.scheduled_start) return "";
    const { date, time } = formatInCST(job.scheduled_start);
    return `${date}T${time}`;
  });
  const [scheduledEnd, setScheduledEnd] = useState(() => {
    if (!job.scheduled_end) return "";
    const { date, time } = formatInCST(job.scheduled_end);
    return `${date}T${time}`;
  });
  const [selectedCalendarId, setSelectedCalendarId] = useState(job.google_calendar_id || "");
  const [syncing, setSyncing] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  // Fetch available calendars
  const { data: calendars } = useQuery({
    queryKey: ["google-calendars-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_calendars")
        .select("*")
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Auto-select primary calendar
  useEffect(() => {
    if (!selectedCalendarId && calendars?.length) {
      const primary = calendars.find(c => c.is_primary);
      setSelectedCalendarId(primary?.id || calendars[0]?.id || "");
    }
  }, [calendars, selectedCalendarId]);

  // Auto-calculate end time when start changes
  useEffect(() => {
    if (scheduledStart && !scheduledEnd) {
      const duration = job.job_type?.default_duration_hours || 4;
      // scheduledStart is already in CST wall-clock, convert to UTC, add hours, convert back
      const [datePart, timePart] = scheduledStart.split('T');
      const startUtc = buildCSTDateTime(datePart, timePart);
      const endTime = addHours(new Date(startUtc), duration);
      const { date: endDate, time: endTimeStr } = formatInCST(endTime);
      setScheduledEnd(`${endDate}T${endTimeStr}`);
    }
  }, [scheduledStart, job.job_type?.default_duration_hours]);

  // Check for conflicts when times change
  const checkConflicts = async () => {
    if (!scheduledStart || !scheduledEnd || !calendars?.length) return;

    setCheckingConflicts(true);
    try {
      const calendar = calendars.find(c => c.id === selectedCalendarId);
      if (!calendar) return;

      const response = await supabase.functions.invoke("google-calendar-sync", {
        body: {
          action: "check-availability",
          calendarIds: [calendar.calendar_id],
          timeMin: buildCSTDateTime(...scheduledStart.split('T') as [string, string]),
          timeMax: buildCSTDateTime(...scheduledEnd.split('T') as [string, string]),
          excludeEventId: job.google_calendar_event_id,
        },
      });

      if (response.data?.conflicts) {
        setConflicts(response.data.conflicts);
      }
    } catch (err) {
      console.error("Failed to check conflicts:", err);
    } finally {
      setCheckingConflicts(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(checkConflicts, 500);
    return () => clearTimeout(timer);
  }, [scheduledStart, scheduledEnd, selectedCalendarId]);

  // Sync to Google Calendar
  const syncToCalendar = async () => {
    if (!scheduledStart || !scheduledEnd || !selectedCalendarId) {
      toast.error("Please set schedule and select a calendar");
      return;
    }

    setSyncing(true);
    try {
      const calendar = calendars?.find(c => c.id === selectedCalendarId);
      if (!calendar) throw new Error("Calendar not found");

      const customerName = job.customer 
        ? `${job.customer.first_name || ""} ${job.customer.last_name || ""}`.trim() || "Unknown"
        : "Unknown";

      const location = job.location
        ? `${job.location.address_line1}, ${job.location.city}, ${job.location.state} ${job.location.zip_code}`
        : "";

      const description = [
        `Job Type: ${job.job_type?.name || "N/A"}`,
        `Customer: ${customerName}`,
        job.customer?.phone ? `Phone: ${job.customer.phone}` : null,
        job.priority ? `Priority: ${job.priority}` : null,
        "",
        job.customer_notes ? `Notes:\n${job.customer_notes}` : null,
      ].filter(Boolean).join("\n");

      const [startDate, startTime] = scheduledStart.split('T');
      const [endDate, endTime] = scheduledEnd.split('T');
      const startISO = buildCSTDateTime(startDate, startTime);
      const endISO = buildCSTDateTime(endDate, endTime);

      const eventPayload = {
        summary: `${job.job_number} - ${customerName} - ${job.job_type?.name || job.title}`,
        description,
        location,
        start: {
          dateTime: startISO,
          timeZone: "America/Chicago",
        },
        end: {
          dateTime: endISO,
          timeZone: "America/Chicago",
        },
      };

      let response;
      if (job.google_calendar_event_id) {
        // Update existing event
        response = await supabase.functions.invoke("google-calendar-sync", {
          body: {
            action: "update-event",
            calendarId: calendar.calendar_id,
            eventId: job.google_calendar_event_id,
            event: eventPayload,
          },
        });
      } else {
        // Create new event
        response = await supabase.functions.invoke("google-calendar-sync", {
          body: {
            action: "create-event",
            calendarId: calendar.calendar_id,
            event: eventPayload,
          },
        });
      }

      if (response.error) throw response.error;

      // Update job record
      const { error: updateError } = await supabase
        .from("crm_jobs")
        .update({
          scheduled_start: startISO,
          scheduled_end: endISO,
          google_calendar_id: selectedCalendarId,
          google_calendar_event_id: response.data.id,
        })
        .eq("id", job.id);

      if (updateError) throw updateError;

      toast.success(job.google_calendar_event_id ? "Calendar event updated" : "Synced to Google Calendar");
      queryClient.invalidateQueries({ queryKey: ["job"] });
      onUpdate?.();
    } catch (err: any) {
      toast.error(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Delete from calendar
  const deleteFromCalendar = async () => {
    if (!job.google_calendar_event_id || !job.google_calendar_id) return;

    setSyncing(true);
    try {
      const calendar = calendars?.find(c => c.id === job.google_calendar_id);
      if (!calendar) throw new Error("Calendar not found");

      await supabase.functions.invoke("google-calendar-sync", {
        body: {
          action: "delete-event",
          calendarId: calendar.calendar_id,
          eventId: job.google_calendar_event_id,
        },
      });

      await supabase
        .from("crm_jobs")
        .update({
          google_calendar_id: null,
          google_calendar_event_id: null,
        })
        .eq("id", job.id);

      toast.success("Removed from Google Calendar");
      queryClient.invalidateQueries({ queryKey: ["job"] });
      onUpdate?.();
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const selectedCalendar = calendars?.find(c => c.id === selectedCalendarId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Scheduling
          {job.google_calendar_event_id && (
            <Badge variant="outline" className="text-xs ml-auto">
              <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
              Synced
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date/Time Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Start</Label>
            <Input
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">End</Label>
            <Input
              type="datetime-local"
              value={scheduledEnd}
              onChange={(e) => setScheduledEnd(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        {/* Calendar Selector */}
        <div className="space-y-1.5">
          <Label className="text-xs">Calendar</Label>
          <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
            <SelectTrigger>
              <SelectValue placeholder="Select calendar" />
            </SelectTrigger>
            <SelectContent>
              {calendars?.map(cal => (
                <SelectItem key={cal.id} value={cal.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: cal.color }}
                    />
                    {cal.name}
                    {cal.is_primary && <span className="text-xs text-muted-foreground">(Primary)</span>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Conflict Warning */}
        {conflicts.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2">
            <div className="flex items-center gap-2 text-destructive text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              {conflicts.length} scheduling conflict{conflicts.length > 1 ? "s" : ""}
            </div>
            <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
              {conflicts.slice(0, 3).map((c, i) => (
                <li key={i}>• {c.summary}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            className="flex-1" 
            onClick={syncToCalendar}
            disabled={syncing || !scheduledStart || !scheduledEnd || !selectedCalendarId}
          >
            {syncing ? (
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4 mr-1" />
            )}
            {job.google_calendar_event_id ? "Update" : "Sync to Calendar"}
          </Button>
          
          {job.google_calendar_event_id && (
            <Button 
              variant="outline" 
              size="icon"
              onClick={deleteFromCalendar}
              disabled={syncing}
              title="Remove from calendar"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Sync Status */}
        {job.google_calendar_event_id && selectedCalendar && (
          <p className="text-xs text-muted-foreground text-center">
            Linked to {selectedCalendar.name}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
