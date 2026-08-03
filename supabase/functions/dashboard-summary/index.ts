import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify caller is authenticated
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(weekStart.getDate() - 7);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Run all aggregations in parallel
    const [
      contactSubs,
      landingSubs,
      ductlessSubs,
      scannerSubs,
      ductedSubs,
    ] = await Promise.all([
      supabase
        .from('contact_submissions')
        .select('id, status, created_at, first_name, last_name, email, service_type'),
      supabase
        .from('landing_page_submissions')
        .select('id, status, created_at, first_name, last_name, email, service_type'),
      supabase
        .from('ductless_estimate_submissions')
        .select('id, status, created_at, customer_name, customer_email, final_total, zone_count'),
      supabase
        .from('equipment_scans')
        .select('id, status, created_at, customer_name, email')
        .not('email', 'is', null),
      supabase
        .from('ducted_estimate_submissions')
        .select('id, status, created_at, customer_name, customer_email, final_total'),
    ]);

    // ---- Aggregated stats (replaces Dashboard's 4 fetches) ----
    type NormSub = {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      service_type: string | null;
      status: string;
      created_at: string;
      source: string;
    };

    const allSubs: NormSub[] = [];

    (contactSubs.data || []).forEach((s: any) => allSubs.push({
      id: s.id, first_name: s.first_name, last_name: s.last_name,
      email: s.email, service_type: s.service_type,
      status: s.status || 'new', created_at: s.created_at, source: 'Contact',
    }));

    (landingSubs.data || []).forEach((s: any) => allSubs.push({
      id: s.id, first_name: s.first_name, last_name: s.last_name,
      email: s.email, service_type: s.service_type,
      status: s.status || 'new', created_at: s.created_at, source: 'Landing',
    }));

    (ductlessSubs.data || []).forEach((s: any) => {
      const parts = (s.customer_name || '').split(' ');
      allSubs.push({
        id: s.id, first_name: parts[0] || '', last_name: parts.slice(1).join(' '),
        email: s.customer_email || '', service_type: 'Ductless',
        status: s.status || 'new', created_at: s.created_at, source: 'Ductless',
      });
    });

    (scannerSubs.data || []).forEach((s: any) => {
      const parts = (s.customer_name || '').split(' ');
      allSubs.push({
        id: s.id, first_name: parts[0] || '', last_name: parts.slice(1).join(' '),
        email: s.email || '', service_type: 'Scanner',
        status: s.status || 'new', created_at: s.created_at, source: 'Scanner',
      });
    });

    allSubs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const weekStartIso = weekStart.toISOString();
    const lastWeekStartIso = lastWeekStart.toISOString();

    const stats = {
      total: allSubs.length,
      new: allSubs.filter(s => s.status === 'new').length,
      reviewed: allSubs.filter(s => ['reviewed', 'contacted', 'closed'].includes(s.status)).length,
      thisWeek: allSubs.filter(s => s.created_at >= weekStartIso).length,
    };

    // ---- Lead metrics ----
    const converted = allSubs.filter(s => s.status === 'contacted' || s.status === 'closed').length;
    const conversionRate = allSubs.length > 0 ? Math.round((converted / allSubs.length) * 100) : 0;
    const thisWeekLeads = allSubs.filter(s => s.created_at >= weekStartIso).length;
    const lastWeekLeads = allSubs.filter(s => s.created_at >= lastWeekStartIso && s.created_at < weekStartIso).length;
    const weekGrowth = lastWeekLeads > 0
      ? Math.round(((thisWeekLeads - lastWeekLeads) / lastWeekLeads) * 100)
      : thisWeekLeads > 0 ? 100 : 0;

    const sourceCounts: Record<string, number> = {};
    allSubs.forEach(s => { sourceCounts[s.source] = (sourceCounts[s.source] || 0) + 1; });
    const topSource = Object.entries(sourceCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    const leadMetrics = {
      total: allSubs.length,
      conversionRate,
      thisWeekLeads,
      weekGrowth,
      topSource,
    };

    // ---- Revenue summary ----
    const ducted = (ductedSubs.data || []).filter((s: any) => s.status !== 'partial');
    const ductless = (ductlessSubs.data || []).filter((s: any) => s.status !== 'partial');
    const ductedTotal = ducted.reduce((sum: number, s: any) => sum + (s.final_total || 0), 0);
    const ductlessTotal = ductless.reduce((sum: number, s: any) => sum + (s.final_total || 0), 0);
    const totalQuoted = ductedTotal + ductlessTotal;
    const totalCount = ducted.length + ductless.length;
    const closedValue =
      ducted.filter((s: any) => s.status === 'closed').reduce((sum: number, s: any) => sum + (s.final_total || 0), 0) +
      ductless.filter((s: any) => s.status === 'closed').reduce((sum: number, s: any) => sum + (s.final_total || 0), 0);

    const revenue = {
      totalQuoted,
      averageQuote: totalCount > 0 ? totalQuoted / totalCount : 0,
      ductedTotal,
      ductlessTotal,
      ductedCount: ducted.length,
      ductlessCount: ductless.length,
      closedValue,
    };

    // ---- Pipeline status ----
    const allEstimates = [...(ductedSubs.data || []), ...(ductlessSubs.data || [])];
    const pipelineStages = ['partial', 'new', 'reviewed', 'contacted', 'closed'].map(stage => {
      const items = allEstimates.filter((s: any) => (s.status || 'new') === stage);
      return {
        name: stage,
        count: items.length,
        value: items.reduce((sum: number, s: any) => sum + (s.final_total || 0), 0),
      };
    });

    // ---- Ducted/Ductless metrics cards ----
    const buildEstimatorMetrics = (all: any[]) => {
      const completed = all.filter(s => s.status !== 'partial');
      const abandoned = all.filter(s => s.status === 'partial');
      const totalValue = completed.reduce((sum, s) => sum + (s.final_total || 0), 0);
      return {
        totalQuotes: completed.length,
        totalValue,
        avgQuoteValue: completed.length > 0 ? totalValue / completed.length : 0,
        abandonedCarts: abandoned.length,
        newCount: all.filter(s => s.status === 'new').length,
        closedCount: all.filter(s => s.status === 'closed').length,
      };
    };

    const ductedMetrics = buildEstimatorMetrics(ductedSubs.data || []);
    const ductlessMetrics = {
      ...buildEstimatorMetrics(ductlessSubs.data || []),
      avgZoneCount: (() => {
        const completed = (ductlessSubs.data || []).filter((s: any) => s.status !== 'partial');
        const zones = completed.reduce((sum: number, s: any) => sum + (s.zone_count || 0), 0);
        return completed.length > 0 ? zones / completed.length : 0;
      })(),
    };

    // ---- Recent submissions for chart and list ----
    const recentSubmissions = allSubs.slice(0, 5);
    const chartSubmissions = allSubs.map(s => ({ id: s.id, created_at: s.created_at }));

    return new Response(
      JSON.stringify({
        stats,
        leadMetrics,
        revenue,
        pipelineStages,
        ductedMetrics,
        ductlessMetrics,
        recentSubmissions,
        chartSubmissions,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('dashboard-summary error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
