import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns';
import { Clock, Play, Square, Plus, ChevronLeft, ChevronRight, CalendarIcon, Check, X, Trash2, Copy, Pencil } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const OVERTIME_THRESHOLD = 8;

// Active stage IDs for timesheet job linking
const ACTIVE_STAGE_IDS = new Set([
  '0270f3d5-6fd5-4fc3-9a44-30b737cfa68c', 'f9171c65-3454-4f59-94a6-1ff0aac5e12b',
  '1025c1e5-ae09-41ca-9df6-00f2095e5106', 'cfb45d0c-d696-405b-9ac4-46726fcfc519',
  'a568ba3d-f5a3-4893-8a69-1d1897aac076',
  '01928c3a-66d5-4fc2-b86b-3291d5a2b6ca', 'dc48d353-3813-4e96-acab-038a01465a4f',
  '6b7c3d05-582f-4ae6-a37c-448006da0646',
  '8324b420-c6f4-4bb0-a9df-9d3b877a0d51', '47d7b7a7-bd43-4d1c-9033-fac04b4ca232',
  'ecb09ca7-7ccb-4bf8-86d2-0a091bfb4dd4', 'd626c1b3-40fe-4df6-8002-df2d00aed820',
  '38fa8291-e66e-43c8-889d-b8d805ac026e', '0e419499-bb5e-45ea-b2c0-9cc2d5f19e02',
  '56431c10-f97b-4d59-9462-c56db7067af4', '67bfc1fa-c6af-492d-9913-469fec63b8e4',
  '287e661f-36b2-42f0-8d4b-2a9868d83dd1', 'f873a88e-15a3-4951-8f76-a1b130e436b4',
  '355ed7e4-29d6-4aab-b5f8-d3a725ff337d',
]);

export default function Timesheets() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryType, setEntryType] = useState<'manual' | 'clock'>('manual');
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [manualStart, setManualStart] = useState('08:00');
  const [manualEnd, setManualEnd] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState('30');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStartStr]);

  // Fetch active team members
  const { data: members = [] } = useQuery({
    queryKey: ['timesheet-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_team_members')
        .select('id, first_name, last_name, role, hourly_rate, overtime_rate')
        .eq('is_active', true)
        .order('first_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch time entries for selected date (daily view)
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['time-entries', dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          team_member:crm_team_members(id, first_name, last_name, role, hourly_rate, overtime_rate),
          job:crm_jobs(id, job_number, title)
        `)
        .eq('entry_date', dateStr)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch time entries for the week (weekly view)
  const { data: weekEntries = [], isLoading: weekLoading } = useQuery({
    queryKey: ['time-entries-week', weekStartStr, weekEndStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          team_member:crm_team_members(id, first_name, last_name, role, hourly_rate, overtime_rate),
          job:crm_jobs(id, job_number, title)
        `)
        .gte('entry_date', weekStartStr)
        .lte('entry_date', weekEndStr)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: viewMode === 'week',
  });

  // Fetch active jobs for linking
  const { data: activeJobs = [] } = useQuery({
    queryKey: ['timesheet-active-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_jobs')
        .select('id, job_number, title, current_stage_id')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).filter((j: any) => j.current_stage_id && ACTIVE_STAGE_IDS.has(j.current_stage_id));
    },
  });

  // Look up effective rate from history (falls back to cached current rate)
  const getEffectiveRate = async (memberId: string, onDate: string, fallback: { hourly_rate: number | null; overtime_rate: number | null }) => {
    const { data } = await supabase
      .from('crm_team_member_rate_history' as any)
      .select('hourly_rate, overtime_rate')
      .eq('team_member_id', memberId)
      .lte('effective_date', onDate)
      .order('effective_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    const row = data as any;
    return {
      hourly_rate: row?.hourly_rate ?? fallback.hourly_rate,
      overtime_rate: row?.overtime_rate ?? fallback.overtime_rate,
    };
  };

  // Add or update manual entry
  const saveEntry = useMutation({
    mutationFn: async () => {
      const member = members.find(m => m.id === selectedMember);
      if (!member) throw new Error('Select a team member');
      
      const [startH, startM] = manualStart.split(':').map(Number);
      const [endH, endM] = manualEnd.split(':').map(Number);
      const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM) - Number(breakMinutes || 0);
      const totalHours = Math.max(0, totalMinutes / 60);
      const overtimeHours = Math.max(0, totalHours - OVERTIME_THRESHOLD);

      const entryDateStr = format(entryDate, 'yyyy-MM-dd');
      const rate = await getEffectiveRate(selectedMember, entryDateStr, { hourly_rate: member.hourly_rate, overtime_rate: member.overtime_rate });

      if (editingEntryId) {
        const { error } = await supabase.from('time_entries').update({
          team_member_id: selectedMember,
          entry_date: entryDateStr,
          manual_start: manualStart,
          manual_end: manualEnd,
          break_minutes: Number(breakMinutes || 0),
          total_hours: Math.round(totalHours * 100) / 100,
          overtime_hours: Math.round(overtimeHours * 100) / 100,
          hourly_rate: rate.hourly_rate,
          overtime_rate: rate.overtime_rate,
          job_id: selectedJobs.length > 0 ? selectedJobs[0] : null,
          notes: notes || null,
          entry_type: 'manual',
        }).eq('id', editingEntryId);
        if (error) throw error;
      } else {
        const jobIds = selectedJobs.length > 0 ? selectedJobs : [null];
        for (const jobId of jobIds) {
          const { error } = await supabase.from('time_entries').insert({
            team_member_id: selectedMember,
            entry_date: entryDateStr,
            manual_start: manualStart,
            manual_end: manualEnd,
            break_minutes: Number(breakMinutes || 0),
            total_hours: Math.round(totalHours * 100) / 100,
            overtime_hours: Math.round(overtimeHours * 100) / 100,
            hourly_rate: rate.hourly_rate,
            overtime_rate: rate.overtime_rate,
            job_id: jobId,
            notes: notes || null,
            entry_type: 'manual',
          });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success(editingEntryId ? 'Entry updated' : 'Time entry added');
      resetForm();
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const clockIn = useMutation({
    mutationFn: async (memberId: string) => {
      const member = members.find(m => m.id === memberId);
      if (!member) throw new Error('Member not found');
      const { error } = await supabase.from('time_entries').insert({
        team_member_id: memberId,
        entry_date: dateStr,
        clock_in: new Date().toISOString(),
        hourly_rate: member.hourly_rate,
        overtime_rate: member.overtime_rate,
        entry_type: 'clock',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Clocked in');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const clockOut = useMutation({
    mutationFn: async (entryId: string) => {
      const entry = entries.find(e => e.id === entryId);
      if (!entry?.clock_in) throw new Error('No clock-in found');
      const clockInTime = new Date(entry.clock_in);
      const clockOutTime = new Date();
      const totalHours = Math.max(0, (clockOutTime.getTime() - clockInTime.getTime()) / 3600000 - (entry.break_minutes || 0) / 60);
      const overtimeHours = Math.max(0, totalHours - OVERTIME_THRESHOLD);
      
      const { error } = await supabase.from('time_entries').update({
        clock_out: clockOutTime.toISOString(),
        total_hours: Math.round(totalHours * 100) / 100,
        overtime_hours: Math.round(overtimeHours * 100) / 100,
      }).eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Clocked out');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('time_entries').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Status updated');
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('time_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Entry deleted');
    },
  });

  const prefillFromEntry = (entry: any, isEdit: boolean) => {
    setSelectedMember(entry.team_member_id || '');
    setEntryDate(entry.entry_date ? parseISO(entry.entry_date) : new Date());
    setManualStart(entry.manual_start?.slice(0, 5) || '08:00');
    setManualEnd(entry.manual_end?.slice(0, 5) || '17:00');
    setBreakMinutes(String(entry.break_minutes ?? 30));
    setSelectedJobs(entry.job_id ? [entry.job_id] : []);
    setNotes(entry.notes || '');
    setEntryType('manual');
    setEditingEntryId(isEdit ? entry.id : null);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedMember('');
    setSelectedJobs([]);
    setEntryDate(new Date());
    setManualStart('08:00');
    setManualEnd('17:00');
    setBreakMinutes('30');
    setNotes('');
    setEntryType('manual');
    setEditingEntryId(null);
  };

  const getMemberName = (m: any) => `${m.first_name || ''} ${m.last_name || ''}`.trim();

  // Daily summary calculations
  const totalHoursToday = entries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
  const totalOvertimeToday = entries.reduce((sum, e) => sum + (e.overtime_hours || 0), 0);
  const totalRegular = totalHoursToday - totalOvertimeToday;
  const totalLabourCost = entries.reduce((sum, e) => {
    const regular = (e.total_hours || 0) - (e.overtime_hours || 0);
    const ot = e.overtime_hours || 0;
    return sum + regular * (e.hourly_rate || 0) + ot * (e.overtime_rate || e.hourly_rate || 0);
  }, 0);

  // Weekly summary calculations
  const weeklyByMember = useMemo(() => {
    const map = new Map<string, { member: any; days: Record<string, { hours: number; ot: number; pay: number; entries: any[] }> }>();
    for (const e of weekEntries) {
      if (!e.team_member) continue;
      const mid = e.team_member_id;
      if (!map.has(mid)) {
        map.set(mid, { member: e.team_member, days: {} });
      }
      const dayKey = e.entry_date;
      const record = map.get(mid)!;
      if (!record.days[dayKey]) {
        record.days[dayKey] = { hours: 0, ot: 0, pay: 0, entries: [] };
      }
      const d = record.days[dayKey];
      d.hours += e.total_hours || 0;
      d.ot += e.overtime_hours || 0;
      const regular = (e.total_hours || 0) - (e.overtime_hours || 0);
      d.pay += regular * (e.hourly_rate || 0) + (e.overtime_hours || 0) * (e.overtime_rate || e.hourly_rate || 0);
      d.entries.push(e);
    }
    return Array.from(map.values());
  }, [weekEntries]);

  const weekTotals = useMemo(() => {
    let hours = 0, ot = 0, pay = 0;
    for (const row of weeklyByMember) {
      for (const d of Object.values(row.days)) {
        hours += d.hours;
        ot += d.ot;
        pay += d.pay;
      }
    }
    return { hours, ot, regular: hours - ot, pay };
  }, [weeklyByMember]);

  const activeClocks = entries.filter(e => e.entry_type === 'clock' && e.clock_in && !e.clock_out);
  const clockedInMemberIds = new Set(activeClocks.map(e => e.team_member_id));

  const navigateBack = () => {
    setSelectedDate(d => viewMode === 'week' ? subWeeks(d, 1) : subDays(d, 1));
  };
  const navigateForward = () => {
    setSelectedDate(d => viewMode === 'week' ? addWeeks(d, 1) : addDays(d, 1));
  };

  const dateLabel = viewMode === 'week'
    ? `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`
    : format(selectedDate, 'MMM d, yyyy');

  const currentEntries = viewMode === 'day' ? entries : weekEntries;
  const currentLoading = viewMode === 'day' ? isLoading : weekLoading;

  // Summary data based on view mode
  const summaryEntries = currentEntries.reduce((sum, e) => sum + 1, 0);
  const summaryRegular = viewMode === 'day' ? totalRegular : weekTotals.regular;
  const summaryOT = viewMode === 'day' ? totalOvertimeToday : weekTotals.ot;
  const summaryCost = viewMode === 'day' ? totalLabourCost : weekTotals.pay;

  return (
    <AdminLayout title="Timesheets">
      {/* Date Nav + View Toggle + Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={navigateBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[220px]">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {dateLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" onClick={navigateForward}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>
            Today
          </Button>
          <div className="flex items-center border rounded-md overflow-hidden ml-2">
            <Button
              variant={viewMode === 'day' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none h-8 px-3"
              onClick={() => setViewMode('day')}
            >
              Day
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none h-8 px-3"
              onClick={() => setViewMode('week')}
            >
              Week
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Play className="h-4 w-4 mr-1" /> Clock In
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-1">
                <p className="text-sm font-medium mb-2">Select crew member:</p>
                {members.filter(m => !clockedInMemberIds.has(m.id)).map(m => (
                  <Button key={m.id} variant="ghost" size="sm" className="w-full justify-start" onClick={() => clockIn.mutate(m.id)}>
                    {getMemberName(m)}
                  </Button>
                ))}
                {members.filter(m => !clockedInMemberIds.has(m.id)).length === 0 && (
                  <p className="text-xs text-muted-foreground">All members clocked in</p>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-1" /> Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>{editingEntryId ? 'Edit Time Entry' : 'Add Time Entry'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Crew Member</Label>
                  <Select value={selectedMember} onValueChange={setSelectedMember}>
                    <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                    <SelectContent>
                      {members.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {getMemberName(m)} ({m.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {format(entryDate, 'MMM d, yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={entryDate}
                        onSelect={(d) => d && setEntryDate(d)}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Time</Label>
                    <Input type="time" value={manualStart} onChange={e => setManualStart(e.target.value)} />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input type="time" value={manualEnd} onChange={e => setManualEnd(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Break (minutes)</Label>
                  <Input type="number" value={breakMinutes} onChange={e => setBreakMinutes(e.target.value)} min="0" />
                </div>
                <div>
                  <Label>Link to Jobs (optional)</Label>
                  <MultiSelect
                    options={activeJobs.map((j: any) => ({
                      value: j.id,
                      label: `${j.job_number} — ${j.title}`,
                    }))}
                    selected={selectedJobs}
                    onChange={setSelectedJobs}
                    placeholder="Select jobs..."
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes..." />
                </div>
                <Button className="w-full" onClick={() => saveEntry.mutate()} disabled={!selectedMember || saveEntry.isPending}>
                  {saveEntry.isPending ? 'Saving...' : editingEntryId ? 'Update Entry' : 'Add Entry'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Entries</p>
            <p className="text-2xl font-bold">{summaryEntries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Regular Hours</p>
            <p className="text-2xl font-bold">{summaryRegular.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Overtime</p>
            <p className="text-2xl font-bold text-destructive">{summaryOT.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Est. Labor Cost</p>
            <p className="text-2xl font-bold">${summaryCost.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Clocks */}
      {activeClocks.length > 0 && (
        <Card className="mb-6 border-green-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Currently Clocked In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {activeClocks.map(e => (
                <div key={e.id} className="flex items-center gap-2 bg-green-500/10 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium">{getMemberName(e.team_member)}</span>
                  <span className="text-xs text-muted-foreground">
                    since {format(new Date(e.clock_in), 'h:mm a')}
                  </span>
                  <Button variant="destructive" size="sm" onClick={() => clockOut.mutate(e.id)}>
                    <Square className="h-3 w-3 mr-1" /> Out
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly View */}
      {viewMode === 'week' && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Weekly Summary — {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weekLoading ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Loading...</p>
            ) : weeklyByMember.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No time entries this week</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10 min-w-[140px]">Crew Member</TableHead>
                      {weekDays.map(day => (
                        <TableHead key={day.toISOString()} className="text-center min-w-[80px]">
                          <div className="text-xs">{format(day, 'EEE')}</div>
                          <div className="text-xs text-muted-foreground">{format(day, 'M/d')}</div>
                        </TableHead>
                      ))}
                      <TableHead className="text-center min-w-[70px]">Total</TableHead>
                      <TableHead className="text-center min-w-[60px]">OT</TableHead>
                      <TableHead className="text-right min-w-[80px]">Est. Pay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weeklyByMember.map(row => {
                      let totalHrs = 0, totalOt = 0, totalPay = 0;
                      for (const d of Object.values(row.days)) {
                        totalHrs += d.hours;
                        totalOt += d.ot;
                        totalPay += d.pay;
                      }
                      return (
                        <TableRow key={row.member.id}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium">
                            {getMemberName(row.member)}
                            <span className="block text-xs text-muted-foreground">{row.member.role}</span>
                          </TableCell>
                          {weekDays.map(day => {
                            const dayKey = format(day, 'yyyy-MM-dd');
                            const d = row.days[dayKey];
                            return (
                              <TableCell key={dayKey} className="text-center">
                                {d ? (
                                  <div>
                                    <span className="font-medium text-sm">{d.hours.toFixed(1)}</span>
                                    {d.ot > 0 && (
                                      <span className="block text-xs text-destructive">{d.ot.toFixed(1)} OT</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center font-bold">{totalHrs.toFixed(1)}</TableCell>
                          <TableCell className="text-center">
                            {totalOt > 0 ? <span className="text-destructive font-medium">{totalOt.toFixed(1)}</span> : '—'}
                          </TableCell>
                          <TableCell className="text-right font-medium">${totalPay.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Week totals row */}
                    <TableRow className="border-t-2 font-bold">
                      <TableCell className="sticky left-0 bg-background z-10">Totals</TableCell>
                      {weekDays.map(day => {
                        const dayKey = format(day, 'yyyy-MM-dd');
                        let dayTotal = 0;
                        for (const row of weeklyByMember) {
                          dayTotal += row.days[dayKey]?.hours || 0;
                        }
                        return (
                          <TableCell key={dayKey} className="text-center">
                            {dayTotal > 0 ? dayTotal.toFixed(1) : '—'}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">{weekTotals.hours.toFixed(1)}</TableCell>
                      <TableCell className="text-center text-destructive">{weekTotals.ot.toFixed(1)}</TableCell>
                      <TableCell className="text-right">${weekTotals.pay.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Daily Entries Table */}
      {viewMode === 'day' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Entries — {format(selectedDate, 'EEE, MMM d')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Loading...</p>
            ) : entries.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No time entries for this date</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Crew Member</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Break</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>OT</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Est. Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map(entry => {
                    const regular = (entry.total_hours || 0) - (entry.overtime_hours || 0);
                    const ot = entry.overtime_hours || 0;
                    const pay = regular * (entry.hourly_rate || 0) + ot * (entry.overtime_rate || entry.hourly_rate || 0);
                    const timeDisplay = entry.entry_type === 'clock'
                      ? `${entry.clock_in ? format(new Date(entry.clock_in), 'h:mm a') : '—'} – ${entry.clock_out ? format(new Date(entry.clock_out), 'h:mm a') : 'active'}`
                      : `${entry.manual_start?.slice(0, 5) || '—'} – ${entry.manual_end?.slice(0, 5) || '—'}`;
                      
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {getMemberName(entry.team_member)}
                          <span className="block text-xs text-muted-foreground">{entry.team_member?.role}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.entry_type === 'clock' ? 'default' : 'secondary'} className="text-xs">
                            {entry.entry_type === 'clock' ? 'Clock' : 'Manual'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{timeDisplay}</TableCell>
                        <TableCell className="text-sm">{entry.break_minutes || 0}m</TableCell>
                        <TableCell className="font-medium">{entry.total_hours?.toFixed(1) ?? '—'}</TableCell>
                        <TableCell>
                          {ot > 0 ? <span className="text-destructive font-medium">{ot.toFixed(1)}</span> : '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {entry.job ? (
                            <span className="font-mono">{entry.job.job_number}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">${pay.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            entry.status === 'approved' ? 'default' : 
                            entry.status === 'rejected' ? 'destructive' : 'secondary'
                          } className="text-xs">
                            {entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {entry.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => updateStatus.mutate({ id: entry.id, status: 'approved' })}
                                >
                                  <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => updateStatus.mutate({ id: entry.id, status: 'rejected' })}
                                >
                                  <X className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => prefillFromEntry(entry, true)}
                              title="Edit entry"
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => prefillFromEntry(entry, false)}
                              title="Duplicate entry"
                            >
                              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => deleteEntry.mutate(entry.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}
