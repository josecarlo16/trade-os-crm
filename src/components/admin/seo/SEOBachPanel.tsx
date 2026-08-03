import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  HeartPulse,
  Link2,
  Target,
  TrendingUp,
  Loader2,
  Send,
  RotateCcw,
} from 'lucide-react';

const MODELS = [
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', hint: 'Best reasoning' },
  { value: 'openai/gpt-5', label: 'GPT-5', hint: 'Top accuracy' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', hint: 'Fast & cheap' },
];

const QUICK_ACTIONS = [
  {
    id: 'site_health',
    label: 'Site Health Audit',
    icon: HeartPulse,
    color: 'text-rose-600 bg-rose-50 hover:bg-rose-100 border-rose-200',
    description: 'Scan for missing schema, weak titles/descriptions, indexing problems.',
  },
  {
    id: 'internal_linking',
    label: 'Internal Linking',
    icon: Link2,
    color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200',
    description: 'Find pages that should link to each other within clusters.',
  },
  {
    id: 'cluster_gaps',
    label: 'Cluster & Keyword Gaps',
    icon: Target,
    color: 'text-violet-600 bg-violet-50 hover:bg-violet-100 border-violet-200',
    description: 'Identify under-built clusters and missing supporting content.',
  },
  {
    id: 'performance',
    label: 'Performance Insights',
    icon: TrendingUp,
    color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    description: 'Striking-distance pages, low-CTR opportunities, top performers.',
  },
] as const;

type ActionId = typeof QUICK_ACTIONS[number]['id'] | 'freeform';

export function SEOBachPanel() {
  const navigate = useNavigate();
  const [model, setModel] = useState('google/gemini-2.5-pro');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionId | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ model?: string; action?: string; totalAnalyzed?: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  async function archiveReport(promptText: string, responseText: string, modelUsed: string, totalAnalyzed?: number) {
    try {
      const { data, error } = await supabase.functions.invoke('seo-report-save', {
        body: {
          original_prompt: promptText,
          full_response: responseText,
          model_used: modelUsed,
          pages_analyzed: typeof totalAnalyzed === 'number' ? totalAnalyzed : null,
        },
      });
      if (error) throw error;
      const reportId = (data as any)?.report_id;
      if (reportId) {
        toast.success('Report archived', {
          duration: 8000,
          action: {
            label: 'View',
            onClick: () => navigate(`/admin/seo?tab=reports&report=${reportId}`),
          },
        });
      }
    } catch (e: any) {
      console.warn('Failed to archive report:', e?.message ?? e);
      // Silent — the user still has the answer in front of them.
    }
  }

  async function runAnalysis(action: ActionId, customQuestion?: string) {
    setLoading(true);
    setActiveAction(action);
    setAnswer(null);
    try {
      const promptText = customQuestion ?? (action === 'freeform' ? question : action);
      const { data, error } = await supabase.functions.invoke('seo-bach-analyst', {
        body: {
          action,
          question: customQuestion ?? (action === 'freeform' ? question : ''),
          model,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const responseText = (data as any).answer;
      const usedModel = (data as any).model;
      const totalAnalyzed = (data as any).meta?.totalAnalyzed;
      setAnswer(responseText);
      setMeta({
        model: usedModel,
        action: (data as any).action,
        totalAnalyzed,
      });
      // Fire-and-forget: save the report for later reference
      archiveReport(promptText, responseText, usedModel, totalAnalyzed);
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to run analysis';
      toast.error(msg);
      setAnswer(null);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setAnswer(null);
    setMeta(null);
    setActiveAction(null);
    setQuestion('');
  }

  // Allow other surfaces (e.g. Search Console "Ask Bach" buttons) to drive this panel.
  useEffect(() => {
    function onAsk(ev: Event) {
      const detail = (ev as CustomEvent<{ prompt?: string; autoSubmit?: boolean }>).detail || {};
      const prompt = (detail.prompt ?? '').trim();
      if (!prompt) return;
      setQuestion(prompt);
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (detail.autoSubmit !== false && !loadingRef.current) {
        // Defer so the textarea reflects the new value before submitting.
        setTimeout(() => runAnalysis('freeform', prompt), 50);
      }
    }
    window.addEventListener('seo-bach-ask', onAsk as EventListener);
    return () => window.removeEventListener('seo-bach-ask', onAsk as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="bg-gradient-to-br from-[#1e3a5f] via-[#1e3a5f] to-[#2a4d7d] rounded-xl border border-[#1e3a5f]/20 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#FFB547]/20 flex items-center justify-center ring-1 ring-[#FFB547]/40">
            <Sparkles className="h-5 w-5 text-[#FFB547]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold text-base">Bach SEO Analyst</h3>
              <Badge className="bg-[#FFB547] text-[#1e3a5f] hover:bg-[#FFB547] border-0 text-[10px] font-bold">
                AI
              </Badge>
            </div>
            <p className="text-white/70 text-xs">
              Ask questions or run a quick audit across all {' '}
              <span className="text-[#FFB547] font-medium">page_seo</span> records.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map(m => (
                <SelectItem key={m.value} value={m.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{m.label}</span>
                    <span className="text-[10px] text-muted-foreground">{m.hint}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(answer || activeAction) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={reset}
              className="text-white/80 hover:text-white hover:bg-white/10 h-9"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-4 sm:px-5 pb-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
        {QUICK_ACTIONS.map(a => {
          const Icon = a.icon;
          const isActive = activeAction === a.id && loading;
          return (
            <button
              key={a.id}
              onClick={() => runAnalysis(a.id)}
              disabled={loading}
              className={`text-left p-3 rounded-lg border transition-all bg-white/95 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed ${
                activeAction === a.id ? 'ring-2 ring-[#FFB547]' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`h-7 w-7 rounded-md inline-flex items-center justify-center border ${a.color}`}>
                  {isActive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
                </span>
                <span className="text-xs font-semibold text-[#1e3a5f]">{a.label}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{a.description}</p>
            </button>
          );
        })}
      </div>

      {/* Ask Bach */}
      <div className="px-4 sm:px-5 pb-4">
        <div className="bg-white/95 rounded-lg p-3 border border-white/20">
          <div className="flex items-start gap-2">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask Bach anything about your SEO health… e.g. 'Which Oak Cliff pages have weak titles?'"
              className="min-h-[60px] resize-none border-0 focus-visible:ring-0 shadow-none p-2 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  if (question.trim() && !loading) runAnalysis('freeform');
                }
              }}
            />
            <Button
              onClick={() => runAnalysis('freeform')}
              disabled={!question.trim() || loading}
              className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 h-10"
              size="sm"
            >
              {loading && activeAction === 'freeform' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1.5" />
                  Ask
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Answer */}
      {(loading || answer) && (
        <div className="bg-white border-t border-[#1e3a5f]/10 p-4 sm:p-5">
          {loading && !answer && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-[#1e3a5f]" />
              <span>Bach is analyzing your SEO data…</span>
            </div>
          )}
          {answer && (
            <>
              <div className="flex items-center gap-2 mb-3 text-[11px] text-muted-foreground">
                <Sparkles className="h-3 w-3 text-[#FFB547]" />
                <span>
                  Analyzed <strong className="text-foreground">{meta?.totalAnalyzed ?? 0}</strong> pages with{' '}
                  <strong className="text-foreground">{MODELS.find(m => m.value === meta?.model)?.label ?? meta?.model}</strong>
                </span>
              </div>
              <div className="prose prose-sm max-w-none prose-headings:text-[#1e3a5f] prose-strong:text-[#1e3a5f] prose-a:text-[#1e3a5f]">
                <ReactMarkdown>{answer}</ReactMarkdown>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
