import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Calendar, RefreshCw, CheckCircle2, Users, MapPin, Copy, Languages } from 'lucide-react';
import { format, addHours } from 'date-fns';
import { toast } from 'sonner';
import { formatInCST, buildCSTDateTime } from '@/lib/cstTimezone';

interface JobAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobNumber: string;
  jobTitle: string;
  customerName: string;
  customerPhone?: string | null;
  location?: string | null;
  onClone?: (appointment: any) => void;
  appointment?: {
    id?: string;
    title: string | null;
    start_datetime: string;
    end_datetime: string;
    google_calendar_id: string | null;
    google_calendar_event_id: string | null;
    assigned_team_id: string | null;
    notes: string | null;
    attendee_member_ids?: string[] | null;
  } | null;
}

export default function JobAppointmentDialog({
  open,
  onOpenChange,
  jobId,
  jobNumber,
  jobTitle,
  customerName,
  customerPhone,
  location,
  onClone,
  appointment
}: JobAppointmentDialogProps) {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [translating, setTranslating] = useState(false);

  const handleTranslateNotes = async () => {
    const current = formData.notes?.trim() ?? '';
    const titleEn = formData.title?.trim() ?? '';
    if (!current && !titleEn) {
      toast.info('Add notes first');
      return;
    }
    const divider = '----------';
    const lastIdx = current.lastIndexOf(divider);
    const englishSource = lastIdx >= 0 ? current.slice(0, lastIdx).replace(/\s+$/, '') : current;

    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('kb-translate', {
        body: { title_en: titleEn, content_en: englishSource, media: [] },
      });
      if (error) throw error;
      const spanishContent = (data?.content_es || '').trim();
      const spanishTitle = (data?.title_es || '').trim();
      if (!spanishContent && !spanishTitle) throw new Error('empty translation');
      const spanishBlock = [
        spanishTitle ? `Título: ${spanishTitle}` : null,
        spanishContent ? `Notas:\n${spanishContent}` : null,
      ].filter(Boolean).join('\n\n');
      const englishBlock = englishSource
        ? englishSource
        : (titleEn ? `Title: ${titleEn}` : '');
      const combined = `${englishBlock}\n\n${divider}\n\n${spanishBlock}`;
      setFormData((prev) => ({ ...prev, notes: combined }));
      toast.success('Translated to Spanish');
    } catch (e) {
      console.error('translate notes failed', e);
      toast.error('Translation failed, try again');
    } finally {
      setTranslating(false);
    }
  };

  
  const [formData, setFormData] = useState({
    title: '',
    startDate: '',
    startTime: '08:00',
    endDate: '',
    endTime: '17:00',
    calendarIds: [] as string[],
    teamId: '',
    notes: '',
    attendeeIds: [] as string[],
    location: ''
  });

  // Fetch team members for attendee selection
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['crm_team_members_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_team_members')
        .select('id, first_name, last_name, email')
        .eq('is_active', true)
        .order('first_name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch existing calendar links for this appointment
  const { data: existingCalendarLinks = [] } = useQuery({
    queryKey: ['crm_job_appointment_calendars', appointment?.id],
    queryFn: async () => {
      if (!appointment?.id) return [];
      const { data, error } = await supabase
        .from('crm_job_appointment_calendars')
        .select('*')
        .eq('appointment_id', appointment.id);
      if (error) throw error;
      return data;
    },
    enabled: !!appointment?.id
  });

  const calendarIdsInitRef = useRef<string | null>(null);

  // Reset form when appointment changes (without existingCalendarLinks)
  useEffect(() => {
    if (appointment) {
      const startCST = formatInCST(appointment.start_datetime);
      const endCST = formatInCST(appointment.end_datetime);
      setFormData(prev => ({
        ...prev,
        title: appointment.title || '',
        startDate: startCST.date,
        startTime: startCST.time,
        endDate: endCST.date,
        endTime: endCST.time,
        teamId: appointment.assigned_team_id || '',
        notes: appointment.notes || '',
        attendeeIds: appointment.attendee_member_ids || [],
        location: location || ''
      }));
    } else {
      calendarIdsInitRef.current = null;
      setFormData({
        title: '',
        startDate: '',
        startTime: '08:00',
        endDate: '',
        endTime: '17:00',
        calendarIds: [],
        teamId: '',
        notes: '',
        attendeeIds: [],
        location: location || ''
      });
    }
  }, [appointment, open, location]);

  // Initialize calendar IDs once when data loads for the current appointment
  useEffect(() => {
    if (!appointment?.id) return;
    if (calendarIdsInitRef.current === appointment.id) return;
    if (existingCalendarLinks.length === 0) return;
    calendarIdsInitRef.current = appointment.id;
    setFormData(prev => ({
      ...prev,
      calendarIds: existingCalendarLinks.map((l: any) => l.google_calendar_db_id),
    }));
  }, [appointment?.id, existingCalendarLinks]);

  const { data: calendars = [] } = useQuery({
    queryKey: ['google-calendars-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('google_calendars')
        .select('*')
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['crm_teams_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_teams')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Auto-select primary calendar for new appointments
  useEffect(() => {
    if (!appointment && formData.calendarIds.length === 0 && calendars.length > 0) {
      const primary = calendars.find((c: any) => c.is_primary);
      if (primary) {
        setFormData(prev => ({ ...prev, calendarIds: [primary.id] }));
      }
    }
  }, [calendars, appointment, formData.calendarIds.length]);

  // Auto-set end date when start date changes
  useEffect(() => {
    if (formData.startDate && !formData.endDate) {
      setFormData(prev => ({ ...prev, endDate: formData.startDate }));
    }
  }, [formData.startDate]);

  const saveMutation = useMutation({
    mutationFn: async (syncToCalendar: boolean) => {
      const startISO = buildCSTDateTime(formData.startDate, formData.startTime);
      const endISO = buildCSTDateTime(formData.endDate, formData.endTime);
      const startDateTime = new Date(startISO);
      const endDateTime = new Date(endISO);

      // Keep google_calendar_id for backward compat but no longer drive logic from it
      const appointmentData = {
        job_id: jobId,
        title: formData.title || null,
        start_datetime: startISO,
        end_datetime: endISO,
        google_calendar_id: formData.calendarIds[0] || null,
        assigned_team_id: formData.teamId || null,
        notes: formData.notes || null,
        attendee_member_ids: formData.attendeeIds
      };

      let savedAppointment;
      
      if (appointment?.id) {
        const { data, error } = await supabase
          .from('crm_job_appointments')
          .update(appointmentData)
          .eq('id', appointment.id)
          .select()
          .single();
        if (error) throw error;
        savedAppointment = data;
      } else {
        const { data, error } = await supabase
          .from('crm_job_appointments')
          .insert(appointmentData)
          .select()
          .single();
        if (error) throw error;
        savedAppointment = data;
      }

      // Manage junction table rows
      const currentLinks = existingCalendarLinks;
      const selectedIds = new Set(formData.calendarIds);
      const existingIds = new Set(currentLinks.map((l: any) => l.google_calendar_db_id));

      // Remove deselected calendars
      const toRemove = currentLinks.filter((l: any) => !selectedIds.has(l.google_calendar_db_id));
      // Add newly selected calendars
      const toAdd = formData.calendarIds.filter(id => !existingIds.has(id));

      if (toRemove.length > 0) {
        // Delete Google events for removed calendars if syncing
        if (syncToCalendar) {
          for (const link of toRemove) {
            if (link.google_calendar_event_id) {
              const cal = calendars.find((c: any) => c.id === link.google_calendar_db_id);
              if (cal) {
                try {
                  await supabase.functions.invoke('google-calendar-sync', {
                    body: {
                      action: 'delete-event',
                      calendarId: cal.calendar_id,
                      eventId: link.google_calendar_event_id,
                    },
                  });
                } catch (err) {
                  console.error('Failed to delete calendar event:', err);
                }
              }
            }
          }
        }
        await supabase
          .from('crm_job_appointment_calendars')
          .delete()
          .in('id', toRemove.map((l: any) => l.id));
      }

      if (toAdd.length > 0) {
        await supabase
          .from('crm_job_appointment_calendars')
          .insert(toAdd.map(calId => ({
            appointment_id: savedAppointment.id,
            google_calendar_db_id: calId,
          })));
      }

      // Sync to Google Calendar if requested
      if (syncToCalendar && formData.calendarIds.length > 0) {
        setSyncing(true);
        try {
          const description = [
            `Job Type: ${jobTitle}`,
            `Customer: ${customerName}`,
            customerPhone ? `Phone: ${customerPhone}` : null,
            formData.notes ? `\nNotes:\n${formData.notes}` : null,
          ].filter(Boolean).join('\n');

          const attendees = formData.attendeeIds
            .map(id => teamMembers.find(m => m.id === id))
            .filter(m => m?.email)
            .map(m => ({ email: m!.email! }));

          const eventPayload = {
            summary: `${jobNumber} - ${customerName} - ${formData.title || jobTitle}`,
            description,
            location: formData.location || '',
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: 'America/Chicago',
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: 'America/Chicago',
            },
            attendees: attendees.length > 0 ? attendees : undefined,
          };

          // Refresh junction rows to get current state
          const { data: freshLinks } = await supabase
            .from('crm_job_appointment_calendars')
            .select('*')
            .eq('appointment_id', savedAppointment.id);

          for (const link of (freshLinks || [])) {
            const cal = calendars.find((c: any) => c.id === link.google_calendar_db_id);
            if (!cal) continue;

            let response;
            if (link.google_calendar_event_id) {
              // Update existing event
              response = await supabase.functions.invoke('google-calendar-sync', {
                body: {
                  action: 'update-event',
                  calendarId: cal.calendar_id,
                  eventId: link.google_calendar_event_id,
                  event: eventPayload,
                },
              });
            } else {
              // Create new event
              response = await supabase.functions.invoke('google-calendar-sync', {
                body: {
                  action: 'create-event',
                  calendarId: cal.calendar_id,
                  event: eventPayload,
                },
              });
            }

            if (response.error) throw response.error;

            // Store the event ID on the junction row
            if (response.data?.id) {
              await supabase
                .from('crm_job_appointment_calendars')
                .update({ google_calendar_event_id: response.data.id })
                .eq('id', link.id);
            }
          }
        } finally {
          setSyncing(false);
        }
      }

      return savedAppointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_job_appointments', jobId] });
      queryClient.invalidateQueries({ queryKey: ['crm_job_appointment_calendars'] });
      toast.success(appointment ? 'Appointment updated' : 'Appointment created');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to save: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent, syncToCalendar: boolean = false) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate) {
      toast.error('Please select start and end dates');
      return;
    }
    // Validate end is after start
    const startISO = buildCSTDateTime(formData.startDate, formData.startTime);
    const endISO = buildCSTDateTime(formData.endDate, formData.endTime);
    if (new Date(endISO) <= new Date(startISO)) {
      toast.error('End date/time must be after start date/time');
      return;
    }
    saveMutation.mutate(syncToCalendar);
  };

  const syncedCount = existingCalendarLinks.filter((l: any) => l.google_calendar_event_id).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target?.closest('[data-radix-popper-content-wrapper]')) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target?.closest('[data-radix-popper-content-wrapper]')) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="pr-8">
          <div className="flex items-center justify-between">
            <DialogTitle>
              {appointment?.id ? 'Edit Appointment' : 'Add Calendar Appointment'}
            </DialogTitle>
            {appointment?.id && onClone && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mr-6"
                onClick={() => onClone(appointment)}
                title="Duplicate this appointment"
              >
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy
              </Button>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label>Appointment Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Installation Day 1, Site Survey"
            />
          </div>

          {/* Start Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Start Time <span className="text-xs text-muted-foreground font-normal">(CST)</span></Label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
          </div>

          {/* End Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End Time <span className="text-xs text-muted-foreground font-normal">(CST)</span></Label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </Label>
            <div className="flex gap-2">
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Event location address"
                className="flex-1"
              />
              {location && formData.location !== location && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, location: location })}
                >
                  Use Job Address
                </Button>
              )}
            </div>
            {location && (
              <p className="text-xs text-muted-foreground">
                Job address: {location}
              </p>
            )}
          </div>

          {/* Team Assignment */}
          <div className="space-y-2">
            <Label>Assign Team</Label>
            <Select
              value={formData.teamId}
              onValueChange={(v) => setFormData({ ...formData, teamId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team: any) => (
                  <SelectItem key={team.id} value={team.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: team.color }}
                      />
                      {team.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Attendees Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Attendees (will receive calendar invites)
            </Label>
            <MultiSelect
              options={teamMembers.map(m => ({
                value: m.id,
                label: `${m.first_name} ${m.last_name || ''}`.trim() + (m.email ? ` (${m.email})` : ''),
              }))}
              selected={formData.attendeeIds}
              onChange={(ids) => setFormData({ ...formData, attendeeIds: ids })}
              placeholder="Select team members..."
            />
            {formData.attendeeIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {formData.attendeeIds.length} attendee(s) will be invited when synced
              </p>
            )}
          </div>

          {/* Calendar Selection - Multi-Select */}
          <div className="space-y-2">
            <Label>Google Calendars</Label>
            <MultiSelect
              options={calendars.map((cal: any) => ({
                value: cal.id,
                label: `${cal.name}${cal.is_primary ? ' (Primary)' : ''}`,
              }))}
              selected={formData.calendarIds}
              onChange={(ids) => setFormData({ ...formData, calendarIds: ids })}
              placeholder="Select calendars..."
            />
            {formData.calendarIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Event will sync to {formData.calendarIds.length} calendar(s)
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Notes</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTranslateNotes}
                disabled={translating || (!formData.notes?.trim() && !formData.title?.trim())}
                className="border-[#d4a84b] text-[#d4a84b] hover:bg-[#d4a84b]/10 hover:text-[#d4a84b]"
              >
                {translating ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Languages className="h-3.5 w-3.5" />
                )}
                Translate to Spanish
              </Button>
            </div>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Appointment notes..."
              rows={4}
            />
          </div>


          {/* Sync status indicator */}
          {syncedCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Synced to {syncedCount} calendar(s)
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="outline"
              disabled={saveMutation.isPending}
            >
              Save Only
            </Button>
            <Button 
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={saveMutation.isPending || syncing || formData.calendarIds.length === 0}
            >
              {syncing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4 mr-2" />
              )}
              Save & Sync
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
