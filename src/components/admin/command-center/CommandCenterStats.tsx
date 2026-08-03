import { useState, useEffect } from 'react';
import { Bell, CheckSquare, Calendar, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '../notifications/useNotifications';
import { startOfDay, endOfDay, subHours } from 'date-fns';

export const CommandCenterStats = () => {
  const { unreadCount } = useNotifications();
  const [tasksDue, setTasksDue] = useState(0);
  const [todayAppts, setTodayAppts] = useState(0);
  const [unassignedLeads, setUnassignedLeads] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const now = new Date();
      const todayEnd = endOfDay(now).toISOString();
      const cutoff48h = subHours(now, 48).toISOString();

      const [tasksRes, apptsRes, contactRes, ductlessRes] = await Promise.all([
        supabase.from('admin_tasks').select('id', { count: 'exact', head: true })
          .in('status', ['todo', 'in_progress'])
          .lte('due_date', todayEnd),
        supabase.from('crm_job_appointments').select('id', { count: 'exact', head: true })
          .gte('start_datetime', startOfDay(now).toISOString())
          .lte('start_datetime', todayEnd),
        supabase.from('contact_submissions').select('id', { count: 'exact', head: true })
          .eq('status', 'new').gte('created_at', cutoff48h),
        supabase.from('ductless_estimate_submissions').select('id', { count: 'exact', head: true })
          .eq('status', 'new').gte('created_at', cutoff48h),
      ]);

      setTasksDue(tasksRes.count || 0);
      setTodayAppts(apptsRes.count || 0);
      setUnassignedLeads((contactRes.count || 0) + (ductlessRes.count || 0));
    };
    fetch();
  }, []);

  const stats = [
    { label: 'Unread', value: unreadCount, icon: Bell, color: 'text-red-500 bg-red-50' },
    { label: 'Tasks Due', value: tasksDue, icon: CheckSquare, color: 'text-orange-500 bg-orange-50' },
    { label: "Today's Appts", value: todayAppts, icon: Calendar, color: 'text-blue-500 bg-blue-50' },
    { label: 'New Leads', value: unassignedLeads, icon: UserPlus, color: 'text-green-500 bg-green-50' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className={`flex items-center gap-3 rounded-lg p-3 ${s.color.split(' ')[1]}`}>
          <s.icon className={`h-5 w-5 ${s.color.split(' ')[0]}`} />
          <div>
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
