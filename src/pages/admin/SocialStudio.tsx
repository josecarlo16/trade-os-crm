import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Sparkles, Save, Trash2, Megaphone, Lightbulb, Check, X, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ConnectionsPanel } from './social-studio/ConnectionsPanel';
import { QueuePanel } from './social-studio/QueuePanel';


const PROVIDERS = [
  { value: 'lovable', label: 'Lovable AI (Built-in)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'xai', label: 'xAI' },
  { value: 'google', label: 'Google AI' },
];

const MODELS_BY_PROVIDER: Record<string, { value: string; label: string }[]> = {
  lovable: [
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast)' },
    { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Powerful)' },
    { value: 'openai/gpt-5', label: 'GPT-5 (Powerful)' },
    { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini (Balanced)' },
  ],
  openai: [
    { value: 'openai/gpt-5', label: 'GPT-5' },
    { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
    { value: 'openai/gpt-5.4', label: 'GPT-5.4' },
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  ],
  xai: [
    { value: 'grok-4-1-fast-reasoning', label: 'Grok 4.1 Fast Reasoning' },
    { value: 'grok-3', label: 'Grok 3' },
  ],
  google: [
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
};

const PILLARS = [
  { value: 'comfort', label: 'Comfort' },
  { value: 'energy_costs', label: 'Energy Costs' },
  { value: 'equipment_education', label: 'Equipment Education' },
  { value: 'how_we_think', label: 'How We Think' },
  { value: 'proof', label: 'Proof' },
];

const PLATFORMS = [
  { value: 'google_business', label: 'Google Business' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
];

const FORMATS: Record<string, string> = {
  reel: 'Reel',
  short_video: 'Short Video',
  carousel: 'Carousel',
  photo_post: 'Photo Post',
  story: 'Story',
  text_post: 'Text Post',
  gmb_update: 'GMB Update',
  gmb_offer: 'GMB Offer',
  gmb_event: 'GMB Event',
};

const IDEA_STATUSES = ['suggested', 'approved', 'dismissed', 'used'] as const;
type IdeaStatus = typeof IDEA_STATUSES[number];

interface SocialPost {
  id: string;
  title: string | null;
  body: string;
  pillar: string | null;
  status: string;
  scheduled_for: string | null;
  created_at: string;
  ai_model: string | null;
  source_idea_id: string | null;
  crm_social_post_targets?: { platform: string }[];
}

interface DraftIdea {
  hook: string;
  angle: string;
  pillar: string | null;
  suggested_platforms: string[];
  format: string | null;
  source_context: string;
}

interface SavedIdea extends DraftIdea {
  id: string;
  status: IdeaStatus;
  ai_model: string | null;
  created_at: string;
}

export default function SocialStudio() {
  const { toast } = useToast();
  const [tab, setTab] = useState('composer');
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Composer state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pillar, setPillar] = useState<string>('comfort');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['google_business']);
  const [provider, setProvider] = useState('lovable');
  const [model, setModel] = useState('google/gemini-2.5-flash');
  const [scheduledFor, setScheduledFor] = useState('');
  const [sourceIdeaId, setSourceIdeaId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Ideas state
  const [ideasProvider, setIdeasProvider] = useState('lovable');
  const [ideasModel, setIdeasModel] = useState('google/gemini-2.5-flash');
  const [ideasPillar, setIdeasPillar] = useState<string>('all');
  const [ideasCount, setIdeasCount] = useState<number>(5);
  const [useJobData, setUseJobData] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [draftIdeas, setDraftIdeas] = useState<DraftIdea[]>([]);
  const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>([]);
  const [ideaTab, setIdeaTab] = useState<IdeaStatus>('suggested');
  const [keepBatchOpen, setKeepBatchOpen] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    const { data, error } = await supabase
      .from('crm_social_posts')
      .select('id, title, body, pillar, status, scheduled_for, created_at, ai_model, source_idea_id, crm_social_post_targets(platform)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) toast({ title: 'Failed to load posts', description: error.message, variant: 'destructive' });
    else setPosts((data as SocialPost[]) || []);
    setLoadingPosts(false);
  }, [toast]);

  const loadSavedIdeas = useCallback(async () => {
    setLoadingSaved(true);
    const { data, error } = await supabase
      .from('crm_social_ideas')
      .select('id, hook, angle, pillar, suggested_platforms, format, source_context, status, ai_model, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) toast({ title: 'Failed to load ideas', description: error.message, variant: 'destructive' });
    else setSavedIdeas((data as SavedIdea[]) || []);
    setLoadingSaved(false);
  }, [toast]);

  useEffect(() => { loadPosts(); loadSavedIdeas(); }, [loadPosts, loadSavedIdeas]);

  const togglePlatform = (p: string) =>
    setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleProviderChange = (p: string) => {
    setProvider(p);
    const first = MODELS_BY_PROVIDER[p]?.[0]?.value;
    if (first) setModel(first);
  };

  const handleIdeasProviderChange = (p: string) => {
    setIdeasProvider(p);
    const first = MODELS_BY_PROVIDER[p]?.[0]?.value;
    if (first) setIdeasModel(first);
  };

  const handleGenerate = async () => {
    if (selectedPlatforms.length === 0) {
      toast({ title: 'Pick at least one platform', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-generate', {
        body: { pillar, platforms: selectedPlatforms, provider, model, seedText: body },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.content) setBody(data.content);
      toast({ title: 'Draft generated', description: `Model: ${data?.model || model}` });
    } catch (e) {
      toast({ title: 'Generation failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveClick = () => {
    if (!body.trim()) return toast({ title: 'Body is required', variant: 'destructive' });
    if (selectedPlatforms.length === 0) return toast({ title: 'Pick at least one platform', variant: 'destructive' });
    setConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setConfirmOpen(false);
    setSaving(true);
    try {
      const status = scheduledFor ? 'scheduled' : 'draft';
      const { data: { user } } = await supabase.auth.getUser();
      const { data: post, error } = await supabase
        .from('crm_social_posts')
        .insert({
          title: title || null,
          body,
          pillar,
          status,
          ai_provider: provider,
          ai_model: model,
          scheduled_for: scheduledFor || null,
          source_idea_id: sourceIdeaId,
          created_by: user?.id || null,
        })
        .select('id')
        .single();
      if (error) throw error;

      const targets = selectedPlatforms.map(platform => ({
        post_id: post.id,
        platform,
        status: 'draft_only' as const,
      }));
      const { error: targetsErr } = await supabase.from('crm_social_post_targets').insert(targets);
      if (targetsErr) throw targetsErr;

      // If from an idea, flip it to 'used'
      if (sourceIdeaId) {
        await supabase.from('crm_social_ideas').update({ status: 'used' }).eq('id', sourceIdeaId);
      }

      toast({ title: 'Post saved', description: `${selectedPlatforms.length} platform target(s) created.` });
      setTitle(''); setBody(''); setScheduledFor(''); setSourceIdeaId(null);
      await Promise.all([loadPosts(), loadSavedIdeas()]);
    } catch (e) {
      toast({ title: 'Save failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    const { error } = await supabase.from('crm_social_posts').delete().eq('id', id);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Deleted' }); loadPosts(); }
  };

  // ===== Ideas tab =====

  const handleSuggest = async () => {
    setSuggesting(true);
    setDraftIdeas([]);
    try {
      const { data, error } = await supabase.functions.invoke('social-suggest-ideas', {
        body: {
          provider: ideasProvider,
          model: ideasModel,
          count: ideasCount,
          pillar: ideasPillar === 'all' ? null : ideasPillar,
          platforms: null,
          useJobData,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const ideas: DraftIdea[] = data?.ideas || [];
      setDraftIdeas(ideas);
      toast({ title: `${ideas.length} idea(s) generated`, description: `Model: ${data?.model || ideasModel}` });
    } catch (e) {
      toast({ title: 'Suggest failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setSuggesting(false);
    }
  };

  const discardDraft = (idx: number) => setDraftIdeas(prev => prev.filter((_, i) => i !== idx));

  const keepSingleDraft = async (idx: number) => {
    const i = draftIdeas[idx];
    if (!i) return;
    const { error } = await supabase.from('crm_social_ideas').insert({
      hook: i.hook, angle: i.angle, pillar: i.pillar, suggested_platforms: i.suggested_platforms,
      format: i.format, source_context: i.source_context, status: 'suggested', ai_model: ideasModel,
    });
    if (error) return toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    discardDraft(idx);
    await loadSavedIdeas();
    toast({ title: 'Idea kept' });
  };

  const keepAllDrafts = async () => {
    setKeepBatchOpen(false);
    if (draftIdeas.length === 0) return;
    const rows = draftIdeas.map(i => ({
      hook: i.hook, angle: i.angle, pillar: i.pillar, suggested_platforms: i.suggested_platforms,
      format: i.format, source_context: i.source_context, status: 'suggested' as const, ai_model: ideasModel,
    }));
    const { error } = await supabase.from('crm_social_ideas').insert(rows);
    if (error) return toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    setDraftIdeas([]);
    await loadSavedIdeas();
    toast({ title: `${rows.length} idea(s) saved` });
  };

  const setIdeaStatus = async (id: string, status: IdeaStatus) => {
    const { error } = await supabase.from('crm_social_ideas').update({ status }).eq('id', id);
    if (error) return toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    await loadSavedIdeas();
  };

  const sendIdeaToComposer = (idea: SavedIdea) => {
    setTitle(idea.hook.slice(0, 80));
    const seed = idea.angle ? `${idea.hook}\n\nAngle: ${idea.angle}` : idea.hook;
    setBody(seed);
    if (idea.pillar) setPillar(idea.pillar);
    if (idea.suggested_platforms && idea.suggested_platforms.length > 0) {
      setSelectedPlatforms(idea.suggested_platforms);
    }
    setSourceIdeaId(idea.id);
    setTab('composer');
    toast({ title: 'Sent to Composer', description: 'Idea pre-filled. Save the post to mark it used.' });
  };

  const availableModels = MODELS_BY_PROVIDER[provider] || [];
  const ideasAvailableModels = MODELS_BY_PROVIDER[ideasProvider] || [];
  const filteredSaved = savedIdeas.filter(i => i.status === ideaTab);

  return (
    <AdminLayout title="Social Studio">
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList>
          <TabsTrigger value="composer">Composer</TabsTrigger>
          <TabsTrigger value="ideas">Ideas</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
        </TabsList>

        <TabsContent value="composer" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" /> Compose a Post</CardTitle>
              <CardDescription>
                Draft a post Bach can help write — anchored to the Truficient social strategy doc.
                {sourceIdeaId && <span className="ml-2 text-amber-600 font-medium">• From saved idea (will flip to "used" on save)</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Internal title</Label>
                  <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Variable-speed explainer" />
                </div>
                <div>
                  <Label htmlFor="pillar">Pillar</Label>
                  <Select value={pillar} onValueChange={setPillar}>
                    <SelectTrigger id="pillar"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PILLARS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Platforms</Label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {PLATFORMS.map(p => (
                    <label key={p.value} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={selectedPlatforms.includes(p.value)} onCheckedChange={() => togglePlatform(p.value)} />
                      <span className="text-sm">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="provider">AI Provider</Label>
                  <Select value={provider} onValueChange={handleProviderChange}>
                    <SelectTrigger id="provider"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger id="model"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availableModels.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="body">Body</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
                    {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Generate with Bach
                  </Button>
                </div>
                <Textarea id="body" value={body} onChange={e => setBody(e.target.value)} rows={14} placeholder="Write your post here, or hit Generate with Bach to draft from the pillar + platforms above." className="font-mono text-sm" />
              </div>

              <div className="grid md:grid-cols-2 gap-4 items-end">
                <div>
                  <Label htmlFor="scheduled">Schedule for (optional)</Label>
                  <Input id="scheduled" type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} />
                </div>
                <div className="flex gap-2 justify-end">
                  {sourceIdeaId && (
                    <Button variant="ghost" onClick={() => setSourceIdeaId(null)}>Clear idea link</Button>
                  )}
                  <Button variant="outline" disabled title="Live publishing coming in a later update.">Publish</Button>
                  <Button onClick={handleSaveClick} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Post
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing Posts</CardTitle>
              <CardDescription>Drafts and scheduled posts. Live publishing is not enabled yet.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPosts ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : posts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No posts yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Pillar</TableHead>
                      <TableHead>Platforms</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="max-w-[260px] truncate">
                          {p.title || <span className="text-muted-foreground italic">untitled</span>}
                          {p.source_idea_id && <Badge variant="outline" className="ml-2 text-[10px]">from idea</Badge>}
                        </TableCell>
                        <TableCell>{p.pillar || '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(p.crm_social_post_targets || []).map(t => (
                              <Badge key={t.platform} variant="secondary">{t.platform.replace('_', ' ')}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell><Badge>{p.status}</Badge></TableCell>
                        <TableCell>{p.scheduled_for ? format(new Date(p.scheduled_for), 'PP p') : '—'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============== IDEAS TAB ============== */}
        <TabsContent value="ideas" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5" /> Bach Idea Engine</CardTitle>
              <CardDescription>Generate strong, on-strategy post ideas grounded in the Truficient strategy doc and (optionally) recent jobs / cities / equipment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Provider</Label>
                  <Select value={ideasProvider} onValueChange={handleIdeasProviderChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Model</Label>
                  <Select value={ideasModel} onValueChange={setIdeasModel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ideasAvailableModels.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pillar</Label>
                  <Select value={ideasPillar} onValueChange={setIdeasPillar}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All pillars</SelectItem>
                      {PILLARS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Count (max 10)</Label>
                  <Input type="number" min={1} max={10} value={ideasCount} onChange={e => setIdeasCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 5)))} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={useJobData} onCheckedChange={setUseJobData} />
                  <span className="text-sm">Use real job / location / equipment data for grounding</span>
                </label>
                <Button onClick={handleSuggest} disabled={suggesting}>
                  {suggesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Suggest Ideas with Bach
                </Button>
              </div>
            </CardContent>
          </Card>

          {draftIdeas.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Fresh ideas — review before saving</CardTitle>
                  <CardDescription>Keep the ones you like. Discarded ideas are not saved.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDraftIdeas([])}>Discard all</Button>
                  <Button onClick={() => setKeepBatchOpen(true)}>Keep all {draftIdeas.length}</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {draftIdeas.map((i, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-2">
                    <div className="font-semibold">{i.hook}</div>
                    {i.angle && <div className="text-sm text-muted-foreground">{i.angle}</div>}
                    <div className="flex flex-wrap gap-2 items-center">
                      {i.pillar && <Badge variant="secondary">{PILLARS.find(p => p.value === i.pillar)?.label || i.pillar}</Badge>}
                      {i.format && <Badge className="bg-[#FFB547] text-[#002244] hover:bg-[#FFB547]">{FORMATS[i.format] || i.format}</Badge>}
                      {i.suggested_platforms.map(p => (
                        <Badge key={p} variant="outline">{PLATFORMS.find(pl => pl.value === p)?.label || p}</Badge>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground italic">Source: {i.source_context || 'evergreen'}</div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => discardDraft(idx)}>
                        <X className="h-4 w-4 mr-1" /> Discard
                      </Button>
                      <Button size="sm" onClick={() => keepSingleDraft(idx)}>
                        <Check className="h-4 w-4 mr-1" /> Keep
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Saved Ideas</CardTitle>
              <CardDescription>Approve, dismiss, or send to the Composer.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={ideaTab} onValueChange={v => setIdeaTab(v as IdeaStatus)}>
                <TabsList>
                  {IDEA_STATUSES.map(s => (
                    <TabsTrigger key={s} value={s} className="capitalize">
                      {s} ({savedIdeas.filter(i => i.status === s).length})
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value={ideaTab} className="mt-4 space-y-3">
                  {loadingSaved ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                  ) : filteredSaved.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No {ideaTab} ideas.</p>
                  ) : filteredSaved.map(idea => (
                    <div key={idea.id} className="border rounded-lg p-4 space-y-2">
                      <div className="font-semibold">{idea.hook}</div>
                      {idea.angle && <div className="text-sm text-muted-foreground">{idea.angle}</div>}
                      <div className="flex flex-wrap gap-2 items-center">
                        {idea.pillar && <Badge variant="secondary">{PILLARS.find(p => p.value === idea.pillar)?.label || idea.pillar}</Badge>}
                        {idea.format && <Badge className="bg-[#FFB547] text-[#002244] hover:bg-[#FFB547]">{FORMATS[idea.format] || idea.format}</Badge>}
                        {(idea.suggested_platforms || []).map(p => (
                          <Badge key={p} variant="outline">{PLATFORMS.find(pl => pl.value === p)?.label || p}</Badge>
                        ))}
                        <span className="text-xs text-muted-foreground">• {format(new Date(idea.created_at), 'PP')}</span>
                      </div>
                      <div className="text-xs text-muted-foreground italic">Source: {idea.source_context || 'evergreen'}</div>
                      <div className="flex gap-2 pt-2 flex-wrap">
                        {idea.status !== 'approved' && (
                          <Button size="sm" variant="outline" onClick={() => setIdeaStatus(idea.id, 'approved')}>
                            <Check className="h-4 w-4 mr-1" /> Approve
                          </Button>
                        )}
                        {idea.status !== 'dismissed' && (
                          <Button size="sm" variant="outline" onClick={() => setIdeaStatus(idea.id, 'dismissed')}>
                            <X className="h-4 w-4 mr-1" /> Dismiss
                          </Button>
                        )}
                        {idea.status !== 'used' && (
                          <Button size="sm" onClick={() => sendIdeaToComposer(idea)}>
                            <Send className="h-4 w-4 mr-1" /> Send to Composer
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="mt-6">
          <QueuePanel />
        </TabsContent>
        <TabsContent value="connections" className="mt-6">
          <ConnectionsPanel />
        </TabsContent>

      </Tabs>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a draft post and {selectedPlatforms.length} platform target row(s). No live publishing happens — Eric stays in control of the final post.
              {sourceIdeaId && <span className="block mt-2 text-amber-600">The linked idea will be marked "used".</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>Confirm Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={keepBatchOpen} onOpenChange={setKeepBatchOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save these {draftIdeas.length} ideas?</AlertDialogTitle>
            <AlertDialogDescription>They will land in the Saved Ideas board as "suggested" for you to approve later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={keepAllDrafts}>Confirm Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
