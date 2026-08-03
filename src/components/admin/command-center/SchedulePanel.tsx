import { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface Appointment {
  id: string;
  title: string | null;
  start_datetime: string;
  end_datetime: string;
  job: { job_number: string; title: string; customer: { first_name: string | null; last_name: string | null } | null } | null;
}

export const SchedulePanel = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const now = new Date();
      const { data } = await supabase
        .from('crm_job_appointments')
        .select('id, title, start_datetime, end_datetime, job:crm_jobs(job_number, title, customer:crm_customers(first_name, last_name))')
        .gte('start_datetime', startOfDay(now).toISOString())
        .lte('start_datetime', endOfDay(now).toISOString())
        .order('start_datetime', { ascending: true })
        .limit(5);
      if (data) setAppointments(data as any);
    };
    fetch();
  }, []);

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#1e3a5f]" />
          <h3 className="font-semibold text-sm">Today's Schedule</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate('/admin/calendar')}>View Calendar</Button>
      </div>
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {appointments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No appointments today</p>
        ) : (
          appointments.map(apt => {
            const customer = apt.job?.customer;
            const name = customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : apt.job?.job_number || '';
            return (
              <div key={apt.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
                <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{name} — {apt.title || apt.job?.title || 'Appointment'}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(apt.start_datetime), 'h:mm a')} – {format(new Date(apt.end_datetime), 'h:mm a')}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
