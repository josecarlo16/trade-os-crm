import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Pencil, Trash2, CheckCircle2, Clock, Users, Copy, Eye } from 'lucide-react';
import { formatInCST, formatTimeCSTDisplay } from '@/lib/cstTimezone';
import { toast } from 'sonner';
import JobAppointmentDialog from './JobAppointmentDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface JobAppointmentsCardProps {
  jobId: string;
  jobNumber: string;
  jobTitle: string;
  customerName: string;
  customerPhone?: string | null;
  location?: string | null;
}

export default function JobAppointmentsCard({
  jobId,
  jobNumber,
  jobTitle,
  customerName,
  customerPhone,
  location
}: JobAppointmentsCardProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['crm_job_appointments', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_job_appointments')
        .select(`
          *,
          team:crm_teams(id, name, color),
          calendar_links:crm_job_appointment_calendars(
            id,
            google_calendar_db_id,
            google_calendar_event_id,
            calendar:google_calendars(id, name, color, calendar_id)
          )
        `)
        .eq('job_id', jobId)
        .order('start_datetime');
      if (error) throw error;
      return data;
    },
    enabled: !!jobId
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const appointment = appointments.find((a: any) => a.id === id);
      
      // Delete from Google Calendar for all linked calendars
      if (appointment?.calendar_links) {
        for (const link of appointment.calendar_links) {
          if (link.google_calendar_event_id && link.calendar) {
            try {
              await supabase.functions.invoke('google-calendar-sync', {
                body: {
                  action: 'delete-event',
                  calendarId: link.calendar.calendar_id,
                  eventId: link.google_calendar_event_id,
                },
              });
            } catch (err) {
              console.error('Failed to delete calendar event:', err);
            }
          }
        }
      }

      const { error } = await supabase
        .from('crm_job_appointments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_job_appointments', jobId] });
      toast.success('Appointment deleted');
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error(`Delete failed: ${error.message}`);
    }
  });

  const handleEdit = (appointment: any) => {
    setEditingAppointment(appointment);
    setDialogOpen(true);
  };

  // Auto-open appointment from URL param (e.g. ?tab=appointments&apt=<id>)
  useEffect(() => {
    const aptId = searchParams.get('apt');
    if (aptId && appointments.length > 0) {
      const found = appointments.find((a: any) => a.id === aptId);
      if (found) {
        handleEdit(found);
        searchParams.delete('apt');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [appointments, searchParams]);

  const handleClone = (appointment: any) => {
    // Create a clone object without id/calendar links so dialog treats it as new
    setEditingAppointment({
      ...appointment,
      id: undefined,
      title: `${appointment.title || 'Appointment'} (Copy)`,
      google_calendar_event_id: null,
      calendar_links: [],
    });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingAppointment(null);
    setDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar Appointments
            </span>
            <Button size="sm" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments scheduled</p>
          ) : (
            appointments.map((apt: any) => (
              <div 
                key={apt.id}
                className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      {apt.title || 'Appointment'}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(apt.start_datetime).toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      {' • '}
                      {formatTimeCSTDisplay(apt.start_datetime)} - {formatTimeCSTDisplay(apt.end_datetime)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {apt.team && (
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ borderColor: apt.team.color, color: apt.team.color }}
                        >
                          <Users className="h-3 w-3 mr-1" />
                          {apt.team.name}
                        </Badge>
                      )}
                      {(() => {
                        const syncedCount = apt.calendar_links?.filter((l: any) => l.google_calendar_event_id).length || 0;
                        const totalLinks = apt.calendar_links?.length || 0;
                        if (syncedCount > 0) {
                          return (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Synced to {syncedCount} calendar{syncedCount > 1 ? 's' : ''}
                            </Badge>
                          );
                        } else if (totalLinks > 0) {
                          return (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              {totalLinks} calendar{totalLinks > 1 ? 's' : ''} (not synced)
                            </Badge>
                          );
                        } else {
                          return (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              No calendars
                            </Badge>
                          );
                        }
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="View appointment details"
                      onClick={() => handleEdit(apt)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Clone appointment"
                      onClick={() => handleClone(apt)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Edit appointment"
                      onClick={() => handleEdit(apt)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      title="Delete appointment"
                      onClick={() => setDeleteId(apt.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {apt.notes && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {apt.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <JobAppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        jobId={jobId}
        jobNumber={jobNumber}
        jobTitle={jobTitle}
        customerName={customerName}
        customerPhone={customerPhone}
        location={location}
        appointment={editingAppointment}
        onClone={handleClone}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the appointment and delete it from Google Calendar if synced.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
