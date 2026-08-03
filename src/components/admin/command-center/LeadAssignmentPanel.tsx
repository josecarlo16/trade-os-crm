import { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { subHours, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface Lead {
  id: string;
  name: string;
  type: string;
  created_at: string;
}

export const LeadAssignmentPanel = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const cutoff = subHours(new Date(), 48).toISOString();
      const [contactRes, ductlessRes] = await Promise.all([
        supabase.from('contact_submissions').select('id, first_name, last_name, created_at')
          .eq('status', 'new').gte('created_at', cutoff).order('created_at', { ascending: false }).limit(5),
        supabase.from('ductless_estimate_submissions').select('id, customer_name, created_at')
          .eq('status', 'new').gte('created_at', cutoff).order('created_at', { ascending: false }).limit(5),
      ]);

      const all: Lead[] = [];
      (contactRes.data || []).forEach(s => all.push({ id: s.id, name: `${s.first_name} ${s.last_name}`, type: 'Contact', created_at: s.created_at }));
      (ductlessRes.data || []).forEach(s => all.push({ id: s.id, name: s.customer_name || 'Unknown', type: 'Ductless', created_at: s.created_at }));
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setLeads(all.slice(0, 5));
    };
    fetch();
  }, []);

  const typeColors: Record<string, string> = { Contact: 'bg-blue-100 text-blue-700', Ductless: 'bg-purple-100 text-purple-700' };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-[#1e3a5f]" />
          <h3 className="font-semibold text-sm">New Leads (48h)</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate('/admin/submissions')}>View All</Button>
      </div>
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No new leads</p>
        ) : (
          leads.map(lead => (
            <div key={lead.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{lead.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</p>
              </div>
              <Badge className={`text-[10px] px-1.5 py-0 ${typeColors[lead.type] || ''}`} variant="secondary">{lead.type}</Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
