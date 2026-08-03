import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { CalendarIcon, Search, ArrowLeft, ExternalLink, MessageSquare, ListChecks, Loader2, Copy, FileDown, FileText, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useSeoReport, useSeoReports, type SeoReportListItem } from '@/hooks/useSeoReports';

const REPORT_TYPES = [
  { value: 'all', label: 'All types' },
  { value: 'site_audit', label: 'Site audit' },
  { value: 'keyword_gap', label: 'Keyword gap' },
  { value: 'indexing', label: 'Indexing' },
  { value: 'performance', label: 'Performance' },
  { value: 'cluster', label: 'Cluster' },
  { value: 'general', label: 'General' },
];

const STATUS_PILL: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800 border-amber-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  done: 'bg-green-100 text-green-800 border-green-200',
  skipped: 'bg-gray-100 text-gray-600 border-gray-200',
};

export function SEOReportsTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reportFromUrl = searchParams.get('report');

  const [search, setSearch] = useState('');
  const [reportType, setReportType] = useState<string>('all');
  const [tag, setTag] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedId, setSelectedId] = useState<string | null>(reportFromUrl);
  const [mobileShowDetail, setMobileShowDetail] = useState(!!reportFromUrl);

  const { reports, count, allTags, loading } = useSeoReports({
    search, reportType, tag, dateRange,
  });

  // Sync ?report= URL param → selectedId (e.g. when navigating from "View" toast)
  useEffect(() => {
    if (reportFromUrl && reportFromUrl !== selectedId) {
      setSelectedId(reportFromUrl);
      setMobileShowDetail(true);
    }
  }, [reportFromUrl]);

  const dateLabel = useMemo(() => {
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, 'MMM d')} – ${format(dateRange.to, 'MMM d')}`;
    }
    if (dateRange.from) return `From ${format(dateRange.from, 'MMM d, yyyy')}`;
    return 'Any date';
  }, [dateRange]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMobileShowDetail(true);
    const next = new URLSearchParams(searchParams);
    next.set('report', id);
    setSearchParams(next, { replace: true });
  };

  const handleBack = () => {
    setMobileShowDetail(false);
    const next = new URLSearchParams(searchParams);
    next.delete('report');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-[600px]">
      {/* LEFT RAIL */}
      <aside className={cn(
        'lg:w-[350px] lg:shrink-0 bg-white border border-border rounded-lg flex flex-col',
        mobileShowDetail && 'hidden lg:flex'
      )}>
        <div className="p-3 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1e3a5f]">Reports</h2>
            <Badge variant="outline" className="text-[10px]">{count}</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports…"
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                {allTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-start font-normal h-8 text-xs">
                <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                {dateLabel}
                {(dateRange.from || dateRange.to) && (
                  <span
                    role="button"
                    tabIndex={0}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); setDateRange({}); }}
                  >×</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange.from ? { from: dateRange.from, to: dateRange.to } : undefined}
                onSelect={(r: any) => setDateRange({ from: r?.from, to: r?.to })}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-[#1e3a5f]" />
            </div>
          ) : reports.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No reports yet. Ask Bach a question on the SEO page to create your first report.
            </div>
          ) : (
            <ul className="divide-y">
              {reports.map(r => (
                <li key={r.id}>
                  <ReportCard
                    report={r}
                    active={selectedId === r.id}
                    onClick={() => handleSelect(r.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* RIGHT PANE */}
      <section className={cn(
        'flex-1 min-w-0 bg-white border border-border rounded-lg',
        !mobileShowDetail && 'hidden lg:block'
      )}>
        {selectedId ? (
          <ReportDetail
            reportId={selectedId}
            onBack={handleBack}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-24 px-6 h-full">
            <MessageSquare className="h-10 w-10 mb-3 text-[#1e3a5f]/40" />
            <p className="text-sm">Select a report to view details</p>
          </div>
        )}
      </section>
    </div>
  );
}

function ReportCard({ report, active, onClick }: {
  report: SeoReportListItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 hover:bg-muted/50 transition-colors border-l-2 border-transparent',
        active && 'bg-[#1e3a5f]/5 border-l-[#1e3a5f]'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm font-medium text-[#1e3a5f] line-clamp-1">{report.title}</h3>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
        </span>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{report.summary}</p>
      <div className="flex flex-wrap items-center gap-1">
        {(report.pages_flagged ?? 0) > 0 && (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50 text-[10px] px-1.5 py-0 h-4">
            {report.pages_flagged} flagged
          </Badge>
        )}
        {report.tags.slice(0, 3).map(t => (
          <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">{t}</Badge>
        ))}
      </div>
    </button>
  );
}

function buildReportMarkdown(report: any, actions: any[], messages: any[]) {
  const lines: string[] = [];
  lines.push(`# ${report.title}`, '');
  lines.push(`*Generated ${format(new Date(report.created_at), 'MMM d, yyyy h:mm a')} · ${report.pages_analyzed ?? 0} pages analyzed · ${report.pages_flagged ?? 0} flagged*`, '');
  if (report.model_used) lines.push(`*Model: ${report.model_used}*`, '');
  lines.push('## Original Prompt', '', `> ${report.original_prompt.replace(/\n/g, '\n> ')}`, '');
  lines.push('## Response', '', report.full_response, '');
  if (actions.length) {
    lines.push('## Action Items', '');
    actions.forEach(a => {
      const box = a.status === 'done' ? '[x]' : '[ ]';
      lines.push(`- ${box} ${a.action_text}${a.page_path ? ` — \`${a.page_path}\`` : ''} _(${a.status})_`);
    });
    lines.push('');
  }
  if (messages.length) {
    lines.push('## Follow-up Conversation', '');
    messages.forEach(m => {
      lines.push(`**${m.role === 'user' ? 'You' : 'Bach'}** · ${format(new Date(m.created_at), 'MMM d, h:mm a')}`, '', m.content, '');
    });
  }
  if (report.related_page_paths?.length) {
    lines.push('## Related Pages', '', ...report.related_page_paths.map((p: string) => `- ${p}`), '');
  }
  return lines.join('\n');
}

function downloadBlob(content: string | Blob, filename: string, mime: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ReportDetail({ reportId, onBack }: { reportId: string; onBack: () => void }) {
  const { report, messages, actions, loading, toggleAction, refetch } = useSeoReport(reportId);
  const [followUp, setFollowUp] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const safeFilename = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'seo-report';

  async function handleCopy() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(buildReportMarkdown(report, actions, messages));
      setCopied(true);
      toast.success('Report copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }

  function handleExportMd() {
    if (!report) return;
    const md = buildReportMarkdown(report, actions, messages);
    const date = format(new Date(report.created_at), 'yyyy-MM-dd');
    downloadBlob(md, `${date}-${safeFilename(report.title)}.md`, 'text/markdown');
    toast.success('Markdown downloaded');
  }

  async function handleExportPdf() {
    if (!report || exportingPdf) return;
    setExportingPdf(true);
    try {
      const node = document.getElementById('seo-report-printable');
      if (!node) throw new Error('Report content not found');
      const printWindow = window.open('', '_blank', 'width=900,height=1000');
      if (!printWindow) throw new Error('Popup blocked — allow popups to export PDF');
      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(el => el.outerHTML).join('\n');
      printWindow.document.write(`<!doctype html><html><head><title>${report.title}</title>${styles}
        <style>
          body { padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; }
          @media print { body { padding: 0; } .no-print { display: none !important; } }
          h1, h2, h3 { color: #1e3a5f; }
          blockquote { border-left: 4px solid #FFB547; padding: 8px 16px; background: #f8f8f8; margin: 12px 0; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          th { background: #f4f4f4; }
        </style>
      </head><body>${node.innerHTML}</body></html>`);
      printWindow.document.close();
      await new Promise(r => setTimeout(r, 400));
      printWindow.focus();
      printWindow.print();
      toast.success('Print dialog opened — choose "Save as PDF"');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to export PDF');
    } finally {
      setExportingPdf(false);
    }
  }

  async function sendFollowUp() {
    const text = followUp.trim();
    if (!text || sending) return;
    setSending(true);
    setFollowUp('');
    try {
      const { data, error } = await supabase.functions.invoke('seo-report-followup', {
        body: { report_id: reportId, user_message: text },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      await refetch();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to send follow-up');
      setFollowUp(text);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Report not found.</div>
    );
  }

  return (
    <div className="flex flex-col xl:flex-row gap-6 p-5">
      <div className="flex-1 min-w-0 space-y-6">
        {/* Mobile back */}
        <Button variant="ghost" size="sm" onClick={onBack} className="lg:hidden -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        {/* Action toolbar */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b">
          <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 text-xs">
            {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportMd} className="h-8 text-xs">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Export .md
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exportingPdf} className="h-8 text-xs">
            {exportingPdf ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5 mr-1.5" />}
            Export PDF
          </Button>
        </div>

        <div id="seo-report-printable" className="space-y-6">
          {/* Header */}
          <header className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold text-[#1e3a5f]">{report.title}</h2>
              {report.model_used && (
                <Badge className="bg-[#FFB547] text-[#1e3a5f] border-0 hover:bg-[#FFB547] shrink-0">
                  {report.model_used}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Generated {format(new Date(report.created_at), 'MMM d, yyyy h:mm a')}
              {' · '}analyzed <strong className="text-foreground">{report.pages_analyzed ?? 0}</strong> pages
              {' · '}flagged <strong className="text-foreground">{report.pages_flagged ?? 0}</strong>
            </p>
          </header>

        {/* Original prompt */}
        <blockquote className="bg-muted/60 border-l-4 border-[#FFB547] rounded-r-md px-4 py-3 text-sm text-foreground/80 whitespace-pre-wrap">
          {report.original_prompt}
        </blockquote>

        {/* Full response */}
        <div className="prose prose-sm max-w-none
          prose-headings:text-[#1e3a5f] prose-headings:font-semibold
          prose-strong:text-[#1e3a5f]
          prose-a:text-[#1e3a5f] prose-a:underline-offset-2
          prose-code:text-[#1e3a5f] prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
          prose-pre:bg-[#1e3a5f] prose-pre:text-white
          prose-table:text-xs prose-th:bg-muted prose-th:text-[#1e3a5f]
          prose-blockquote:border-l-[#FFB547] prose-blockquote:text-foreground/70
          prose-li:my-0.5">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.full_response}</ReactMarkdown>
        </div>

        {/* Action items */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="h-4 w-4 text-[#1e3a5f]" />
            <h3 className="text-sm font-semibold text-[#1e3a5f]">Action Items</h3>
            <Badge variant="outline" className="text-[10px]">{actions.length}</Badge>
          </div>
          {actions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No actions captured for this report.</p>
          ) : (
            <ul className="space-y-2">
              {actions.map(a => (
                <li key={a.id} className="flex items-start gap-3 p-3 rounded-md border bg-white">
                  <Checkbox
                    checked={a.status === 'done'}
                    onCheckedChange={() => toggleAction(a.id, a.status)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm', a.status === 'done' && 'line-through text-muted-foreground')}>
                      {a.action_text}
                    </p>
                    {a.page_path && (
                      <Link
                        to={`/admin/seo?path=${encodeURIComponent(a.page_path)}`}
                        className="text-xs text-[#1e3a5f] hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        {a.page_path}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                  <Badge variant="outline" className={cn('text-[10px] capitalize', STATUS_PILL[a.status])}>
                    {a.status.replace('_', ' ')}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
        </div>{/* /#seo-report-printable */}

        {/* Follow-up Conversation */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-[#1e3a5f]" />
            <h3 className="text-sm font-semibold text-[#1e3a5f]">Follow-up Conversation</h3>
          </div>
          <div className="border rounded-md bg-muted/30 max-h-[400px] overflow-auto p-3 space-y-3">
            {messages.length === 0 && !sending ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No follow-ups yet.
              </p>
            ) : (
              <>
                {messages.map(m => (
                  <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                      m.role === 'user'
                        ? 'bg-[#1e3a5f] text-white'
                        : 'bg-white border'
                    )}>
                      <div className={cn(
                        'prose prose-sm max-w-none prose-p:my-1',
                        m.role === 'user' && 'prose-invert prose-p:text-white prose-strong:text-white prose-headings:text-white prose-li:text-white'
                      )}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>
                      <div className={cn('text-[10px] mt-1', m.role === 'user' ? 'text-white/60' : 'text-muted-foreground')}>
                        {format(new Date(m.created_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-white border inline-flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1e3a5f]" />
                      <span className="text-xs">Bach is thinking…</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              placeholder="Ask a follow-up about this report…"
              className="flex-1 h-9 text-sm"
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendFollowUp();
                }
              }}
            />
            <Button
              size="sm"
              onClick={sendFollowUp}
              disabled={!followUp.trim() || sending}
              className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
            </Button>
          </div>
        </section>
      </div>

      {/* Related sidebar */}
      <aside className="xl:w-64 xl:shrink-0">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-[#1e3a5f] mb-3">Related Pages</h3>
            {report.related_page_paths.length === 0 ? (
              <p className="text-xs text-muted-foreground">None linked.</p>
            ) : (
              <ul className="space-y-1.5">
                {report.related_page_paths.map(path => (
                  <li key={path}>
                    <Link
                      to={`/admin/seo?path=${encodeURIComponent(path)}`}
                      className="text-xs text-[#1e3a5f] hover:underline inline-flex items-start gap-1"
                    >
                      <ExternalLink className="h-3 w-3 mt-0.5 shrink-0" />
                      <span className="break-all">{path}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {report.related_clusters.length > 0 && (
              <>
                <h4 className="text-xs font-semibold text-[#1e3a5f] mt-4 mb-2">Clusters</h4>
                <div className="flex flex-wrap gap-1">
                  {report.related_clusters.map(c => (
                    <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
