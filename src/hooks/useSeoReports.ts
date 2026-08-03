import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SeoReportListItem = {
  id: string;
  title: string;
  summary: string;
  report_type: string | null;
  pages_analyzed: number | null;
  pages_flagged: number | null;
  model_used: string | null;
  tags: string[];
  related_page_paths: string[];
  related_clusters: string[];
  created_at: string;
};

export type SeoReportDetail = SeoReportListItem & {
  original_prompt: string;
  full_response: string;
  created_by: string | null;
  updated_at: string;
};

export type SeoReportMessage = {
  id: string;
  report_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

export type SeoReportAction = {
  id: string;
  report_id: string;
  action_text: string;
  page_path: string | null;
  status: 'open' | 'in_progress' | 'done' | 'skipped';
  completed_at: string | null;
  created_at: string;
};

interface UseSeoReportsParams {
  search?: string;
  reportType?: string | 'all';
  tag?: string | 'all';
  dateRange?: { from?: Date; to?: Date };
  pageSize?: number;
  page?: number;
}

export function useSeoReports(params: UseSeoReportsParams = {}) {
  const {
    search = '',
    reportType = 'all',
    tag = 'all',
    dateRange,
    pageSize = 50,
    page = 0,
  } = params;

  const [reports, setReports] = useState<SeoReportListItem[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = (supabase.from as any)('seo_reports')
        .select(
          'id, title, summary, report_type, pages_analyzed, pages_flagged, model_used, tags, related_page_paths, related_clusters, created_at',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);

      if (search.trim()) {
        // Full text via the to_tsvector index
        query = query.textSearch(
          'fts' as any,
          search.trim().replace(/\s+/g, ' & '),
          { config: 'english' }
        ).or(
          `title.ilike.%${search}%,summary.ilike.%${search}%`
        );
      }
      if (reportType && reportType !== 'all') {
        query = query.eq('report_type', reportType);
      }
      if (tag && tag !== 'all') {
        query = query.contains('tags', [tag]);
      }
      if (dateRange?.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        const to = new Date(dateRange.to);
        to.setHours(23, 59, 59, 999);
        query = query.lte('created_at', to.toISOString());
      }

      const { data, error: err, count: total } = await query;
      if (err) {
        // textSearch may fail if expression index isn't queryable that way — fall back to ilike
        if (search.trim()) {
          const fallback = await (supabase.from as any)('seo_reports')
            .select(
              'id, title, summary, report_type, pages_analyzed, pages_flagged, model_used, tags, related_page_paths, related_clusters, created_at',
              { count: 'exact' }
            )
            .or(`title.ilike.%${search}%,summary.ilike.%${search}%,full_response.ilike.%${search}%`)
            .order('created_at', { ascending: false })
            .range(page * pageSize, page * pageSize + pageSize - 1);
          if (fallback.error) throw fallback.error;
          setReports((fallback.data ?? []) as SeoReportListItem[]);
          setCount(fallback.count ?? 0);
          return;
        }
        throw err;
      }
      setReports((data ?? []) as SeoReportListItem[]);
      setCount(total ?? 0);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load reports');
      setReports([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [search, reportType, tag, dateRange?.from, dateRange?.to, page, pageSize]);

  const fetchTags = useCallback(async () => {
    const { data } = await (supabase.from as any)('seo_reports')
      .select('tags')
      .limit(500);
    const set = new Set<string>();
    (data ?? []).forEach((row: any) => (row.tags ?? []).forEach((t: string) => set.add(t)));
    setAllTags([...set].sort());
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);
  useEffect(() => { fetchTags(); }, [fetchTags]);

  return { reports, count, allTags, loading, error, refetch: fetchReports };
}

export function useSeoReport(reportId: string | null) {
  const [report, setReport] = useState<SeoReportDetail | null>(null);
  const [messages, setMessages] = useState<SeoReportMessage[]>([]);
  const [actions, setActions] = useState<SeoReportAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!reportId) {
      setReport(null);
      setMessages([]);
      setActions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [r, m, a] = await Promise.all([
        (supabase.from as any)('seo_reports').select('*').eq('id', reportId).maybeSingle(),
        (supabase.from as any)('seo_report_messages')
          .select('*')
          .eq('report_id', reportId)
          .order('created_at', { ascending: true }),
        (supabase.from as any)('seo_report_actions')
          .select('*')
          .eq('report_id', reportId)
          .order('created_at', { ascending: true }),
      ]);
      if (r.error) throw r.error;
      setReport((r.data as SeoReportDetail) ?? null);
      setMessages((m.data ?? []) as SeoReportMessage[]);
      setActions((a.data ?? []) as SeoReportAction[]);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleAction = async (actionId: string, currentStatus: SeoReportAction['status']) => {
    const next = currentStatus === 'done' ? 'open' : 'done';
    const completed_at = next === 'done' ? new Date().toISOString() : null;
    setActions(prev => prev.map(a => a.id === actionId ? { ...a, status: next, completed_at } : a));
    const { error: err } = await (supabase.from as any)('seo_report_actions')
      .update({ status: next, completed_at })
      .eq('id', actionId);
    if (err) {
      // revert on error
      fetchAll();
    }
  };

  return { report, messages, actions, loading, error, refetch: fetchAll, toggleAction };
}
