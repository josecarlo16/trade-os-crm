import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  Upload as UploadIcon,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Rocket,
  RefreshCw,
  ExternalLink,
  Trash2,
  Copy,
} from 'lucide-react';
import {
  parseFile,
  validateBatch,
  type ValidatedPage,
  type KnownSlugs,
} from '@/lib/seo/pageUploadParser';

interface DraftBatch {
  id: string;
  createdAt: string;
  pageIds: string[]; // seo_location_pages ids
  slugs: string[];
  deploy?: {
    triggeredAt: string;
    ok: boolean;
    error?: string;
  };
  verify?: Record<string, VerifyResult>;
  sitemapRegenerated?: boolean;
}

interface VerifyResult {
  slug: string;
  status: 'verified' | 'not_prerendered' | 'failed';
  http_status: number;
  errors?: string[];
  found?: { title?: string; description?: string; canonical?: string };
}

interface SaveOutcome {
  fileName: string;
  slug: string;
  status: 'inserted' | 'updated' | 'blocked' | 'error';
  message?: string;
}

const BATCH_STORAGE_KEY = 'seo_upload_batches_v1';

function loadBatches(): DraftBatch[] {
  try {
    const raw = localStorage.getItem(BATCH_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveBatches(batches: DraftBatch[]) {
  try {
    localStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify(batches));
  } catch {}
}

export default function SEOUpload() {
  const { toast } = useToast();
  const [files, setFiles] = useState<ValidatedPage[]>([]);
  const [existingSlugs, setExistingSlugs] = useState<Set<string>>(new Set());
  const [allDbSlugs, setAllDbSlugs] = useState<Set<string>>(new Set());
  const [loadingSlugs, setLoadingSlugs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishingBatchId, setPublishingBatchId] = useState<string | null>(null);
  const [verifyingBatchId, setVerifyingBatchId] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState<DraftBatch | null>(null);
  const [batches, setBatches] = useState<DraftBatch[]>(loadBatches());
  const [gsc, setGsc] = useState<Record<string, boolean>>({});
  const [saveResults, setSaveResults] = useState<SaveOutcome[] | null>(null);
  const [pendingPages, setPendingPages] = useState<{ id: string; url_slug: string }[]>([]);
  const [publishingAll, setPublishingAll] = useState(false);
  const [confirmPublishAll, setConfirmPublishAll] = useState(false);

  useEffect(() => {
    saveBatches(batches);
  }, [batches]);

  // Fetch known slug sets for validation.
  useEffect(() => {
    (async () => {
      setLoadingSlugs(true);
      const [{ data: published }, { data: all }] = await Promise.all([
        supabase.from('seo_location_pages' as any).select('url_slug').eq('published', true),
        supabase.from('seo_location_pages' as any).select('url_slug'),
      ]);
      const { data: pageSeo } = await supabase.from('page_seo' as any).select('page_path');
      const pubSet = new Set<string>((published || []).map((r: any) => r.url_slug));
      const allSet = new Set<string>([
        ...((all || []).map((r: any) => r.url_slug)),
        ...((pageSeo || []).map((r: any) => r.page_path)),
      ]);
      setExistingSlugs(pubSet);
      setAllDbSlugs(allSet);
      setLoadingSlugs(false);
    })();
  }, []);

  const loadPending = useCallback(async () => {
    const { data } = await supabase
      .from('seo_location_pages' as any)
      .select('id, url_slug')
      .eq('published', false)
      .order('url_slug', { ascending: true });
    setPendingPages(((data || []) as any[]).map((r) => ({ id: r.id, url_slug: r.url_slug })));
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const knownSlugs: Omit<KnownSlugs, 'batchSlugs'> = useMemo(
    () => ({ existing: existingSlugs, allDbSlugs }),
    [existingSlugs, allDbSlugs],
  );

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const arr = Array.from(fileList).filter((f) => /\.md$/i.test(f.name));
      if (!arr.length) {
        toast({ title: 'No .md files', description: 'Drop Markdown (.md) files only.', variant: 'destructive' });
        return;
      }
      if (arr.length > 15) {
        toast({ title: 'Too many files', description: 'Upload 1–15 files at a time.', variant: 'destructive' });
        return;
      }
      const parsed = await Promise.all(
        arr.map(async (f) => parseFile(f.name, await f.text())),
      );
      const validated = validateBatch(parsed, knownSlugs);
      setFiles(validated);
    },
    [knownSlugs, toast],
  );

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
  };
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = '';
  };

  const anyRed = files.some((f) => !f.canSave);
  const savableFiles = files.filter((f) => f.canSave);

  const handleSaveBatch = async () => {
    if (!savableFiles.length) return;

    // Ensure we have a valid, non-expired session before hitting RLS-protected tables.
    // (Cached role in sessionStorage can outlive the JWT; without a live token
    // auth.uid() is NULL and every insert into seo_location_pages fails RLS.)
    let session = (await supabase.auth.getSession()).data.session;
    if (!session || (session.expires_at && session.expires_at * 1000 < Date.now() + 5000)) {
      const refreshed = await supabase.auth.refreshSession();
      session = refreshed.data.session;
    }
    if (!session) {
      toast({
        title: 'Session expired',
        description: 'Please sign out and sign back in, then try again.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    setSaveResults(null);
    const outcomes: SaveOutcome[] = [];
    const pageIds: string[] = [];
    const savedSlugs: string[] = [];


    for (const file of savableFiles) {
      const fm = file.frontmatter;
      const slug = fm.url_slug;
      const pageName = fm.h1_title || fm.meta_title || slug;

      try {
        const [{ data: existingLoc, error: locLookupErr }, { data: existingSeo, error: seoLookupErr }] = await Promise.all([
          supabase
            .from('seo_location_pages' as any)
            .select('id, published, page_seo_id')
            .eq('url_slug', slug)
            .maybeSingle(),
          supabase
            .from('page_seo' as any)
            .select('id')
            .eq('page_path', slug)
            .maybeSingle(),
        ]);
        if (locLookupErr) throw locLookupErr;
        if (seoLookupErr) throw seoLookupErr;

        if (existingLoc && (existingLoc as any).published === true) {
          outcomes.push({ fileName: file.fileName, slug, status: 'blocked', message: 'Already live (published)' });
          continue;
        }

        const seoPayload: any = {
          page_path: slug,
          page_name: pageName,
          meta_title: fm.meta_title || null,
          meta_description: fm.meta_description || null,
          page_type: fm.page_type,
          target_keyword: fm.target_keyword || null,
          cluster: fm.cluster,
          index_status: 'Pending',
          schema_applied: true,
          robots: 'index, follow',
        };
        const locPayload: any = {
          neighborhood: fm.neighborhood || fm.city || 'Dallas',
          city: fm.city || 'Dallas',
          state: fm.state || 'TX',
          zip_code: fm.zip_code || null,
          cluster: fm.cluster,
          page_type: fm.page_type,
          url_slug: slug,
          h1_title: fm.h1_title || null,
          meta_title: fm.meta_title || null,
          meta_description: fm.meta_description || null,
          audience: fm.audience || null,
          search_intent: fm.search_intent || null,
          content: file.body,
          schema_enabled: true,
          schema_json: file.schemaJson,
          published: false,
        };

        if (existingLoc) {
          // Draft exists — update both rows in place.
          let seoId: string | null = (existingLoc as any).page_seo_id || (existingSeo as any)?.id || null;
          if (seoId) {
            const { error: e1 } = await supabase.from('page_seo' as any).update(seoPayload).eq('id', seoId);
            if (e1) throw e1;
          } else {
            const { data: newSeo, error: e1 } = await supabase
              .from('page_seo' as any)
              .insert(seoPayload)
              .select('id')
              .single();
            if (e1) throw e1;
            seoId = (newSeo as any).id;
          }
          const { error: e2 } = await supabase
            .from('seo_location_pages' as any)
            .update({ ...locPayload, page_seo_id: seoId })
            .eq('id', (existingLoc as any).id);
          if (e2) throw e2;
          pageIds.push((existingLoc as any).id);
          savedSlugs.push(slug);
          outcomes.push({ fileName: file.fileName, slug, status: 'updated' });
        } else {
          // No location row. Reuse orphan page_seo if present, else insert.
          let seoId: string;
          let createdSeo = false;
          if (existingSeo) {
            const { error: e1 } = await supabase.from('page_seo' as any).update(seoPayload).eq('id', (existingSeo as any).id);
            if (e1) throw e1;
            seoId = (existingSeo as any).id;
          } else {
            const { data: newSeo, error: e1 } = await supabase
              .from('page_seo' as any)
              .insert(seoPayload)
              .select('id')
              .single();
            if (e1) throw e1;
            seoId = (newSeo as any).id;
            createdSeo = true;
          }
          const { data: newLoc, error: e2 } = await supabase
            .from('seo_location_pages' as any)
            .insert({ ...locPayload, page_seo_id: seoId })
            .select('id')
            .single();
          if (e2) {
            // Roll back the page_seo insert to avoid an orphan.
            if (createdSeo) {
              await supabase.from('page_seo' as any).delete().eq('id', seoId);
            }
            throw e2;
          }
          pageIds.push((newLoc as any).id);
          savedSlugs.push(slug);
          outcomes.push({ fileName: file.fileName, slug, status: 'inserted' });
        }
      } catch (err: any) {
        console.error(`Save error for ${file.fileName}:`, err);
        outcomes.push({ fileName: file.fileName, slug, status: 'error', message: err?.message || String(err) });
      }
    }

    if (savedSlugs.length) {
      const newBatch: DraftBatch = {
        id: `batch_${Date.now()}`,
        createdAt: new Date().toISOString(),
        pageIds,
        slugs: savedSlugs,
      };
      setBatches((b) => [newBatch, ...b]);
      setAllDbSlugs((prev) => {
        const next = new Set(prev);
        savedSlugs.forEach((s) => next.add(s));
        return next;
      });
    }
    setSaveResults(outcomes);
    setFiles([]);
    setSaving(false);

    const ins = outcomes.filter((o) => o.status === 'inserted').length;
    const upd = outcomes.filter((o) => o.status === 'updated').length;
    const blk = outcomes.filter((o) => o.status === 'blocked').length;
    const err = outcomes.filter((o) => o.status === 'error').length;
    toast({
      title: 'Save complete',
      description: `${ins} inserted · ${upd} updated · ${blk} blocked · ${err} error`,
      variant: err > 0 ? 'destructive' : 'default',
    });
  };

  const handlePublishAllPending = async () => {
    if (!pendingPages.length) return;
    setPublishingAll(true);
    try {
      const ids = pendingPages.map((p) => p.id);
      const publishedSlugs = pendingPages.map((p) => p.url_slug);

      // 1. Flip every pending row to published.
      const { data: updated, error: upErr } = await supabase
        .from('seo_location_pages' as any)
        .update({ published: true })
        .in('id', ids)
        .select('id');
      if (upErr) throw upErr;

      const updatedCount = (updated || []).length;
      if (updatedCount === 0) {
        throw new Error('No rows were updated — possible RLS block. Sign out and back in, then retry.');
      }

      // 2. Fire ONE Vercel deploy for the whole set.
      const { data: deployRes, error: deployErr } = await supabase.functions.invoke('trigger-deploy');
      const deployOk = !deployErr && (deployRes as any)?.success;

      // 3. Mark any local batches whose pages were part of this run as deployed.
      const publishedIdSet = new Set(ids);
      setBatches((all) =>
        all.map((b) =>
          b.pageIds.some((pid) => publishedIdSet.has(pid))
            ? {
                ...b,
                deploy: {
                  triggeredAt: new Date().toISOString(),
                  ok: !!deployOk,
                  error: deployOk
                    ? undefined
                    : (deployRes as any)?.error || deployErr?.message || 'Deploy hook failed',
                },
              }
            : b,
        ),
      );

      // 4. Refresh known-slug sets so validation reflects the new published state.
      setExistingSlugs((prev) => {
        const next = new Set(prev);
        publishedSlugs.forEach((s) => next.add(s));
        return next;
      });
      await loadPending();

      if (deployOk) {
        toast({
          title: `Published ${updatedCount} page${updatedCount === 1 ? '' : 's'}`,
          description: 'Vercel deploy triggered. Live in ~2 minutes.',
        });
      } else {
        toast({
          title: `Published ${updatedCount} page${updatedCount === 1 ? '' : 's'}, deploy hook failed`,
          description: (deployRes as any)?.error || deployErr?.message || 'Trigger the deploy manually.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Publish all failed',
        description: err.message || String(err),
        variant: 'destructive',
      });
    } finally {
      setPublishingAll(false);
      setConfirmPublishAll(false);
    }
  };

  const handlePublishBatch = async (batch: DraftBatch) => {
    setPublishingBatchId(batch.id);
    try {
      // 1. Flip published=true
      const { error: upErr } = await supabase
        .from('seo_location_pages' as any)
        .update({ published: true })
        .in('id', batch.pageIds);
      if (upErr) throw upErr;

      // 2. Trigger deploy
      const { data: deployRes, error: deployErr } = await supabase.functions.invoke('trigger-deploy');
      if (deployErr || !(deployRes as any)?.success) {
        const errMsg = (deployRes as any)?.error || deployErr?.message || 'Deploy hook failed';
        setBatches((all) =>
          all.map((b) =>
            b.id === batch.id
              ? { ...b, deploy: { triggeredAt: new Date().toISOString(), ok: false, error: errMsg } }
              : b,
          ),
        );
        toast({
          title: 'Pages published, but deploy hook failed',
          description: errMsg,
          variant: 'destructive',
        });
        return;
      }
      setBatches((all) =>
        all.map((b) =>
          b.id === batch.id
            ? { ...b, deploy: { triggeredAt: new Date().toISOString(), ok: true } }
            : b,
        ),
      );
      toast({ title: 'Deploy triggered', description: 'Vercel is building. Verify live in ~2 minutes.' });
    } catch (err: any) {
      toast({ title: 'Publish failed', description: err.message || String(err), variant: 'destructive' });
    } finally {
      setPublishingBatchId(null);
      setConfirmPublish(null);
    }
  };

  const handleVerify = async (batch: DraftBatch) => {
    setVerifyingBatchId(batch.id);
    try {
      // Look up meta title/description for each page.
      const { data: pages, error } = await supabase
        .from('seo_location_pages' as any)
        .select('url_slug, meta_title, meta_description')
        .in('id', batch.pageIds);
      if (error) throw error;

      const payload = (pages || []).map((p: any) => ({
        slug: p.url_slug,
        meta_title: p.meta_title || '',
        meta_description: p.meta_description || '',
      }));

      const { data: res, error: fnErr } = await supabase.functions.invoke('verify-live-pages', {
        body: { pages: payload },
      });
      if (fnErr) throw fnErr;

      const results: VerifyResult[] = (res as any)?.results || [];
      const map: Record<string, VerifyResult> = {};
      results.forEach((r) => { map[r.slug] = r; });

      const allVerified = results.length > 0 && results.every((r) => r.status === 'verified');

      let sitemapRegenerated = batch.sitemapRegenerated || false;
      if (allVerified && !sitemapRegenerated) {
        try {
          await supabase.functions.invoke('regenerate-sitemap');
          sitemapRegenerated = true;
        } catch (e) {
          console.warn('regenerate-sitemap failed:', e);
        }
      }

      setBatches((all) =>
        all.map((b) => (b.id === batch.id ? { ...b, verify: map, sitemapRegenerated } : b)),
      );

      if (allVerified) {
        toast({ title: 'All pages verified live', description: 'Sitemap regenerated.' });
      } else {
        toast({
          title: 'Verify complete',
          description: `${results.filter((r) => r.status === 'verified').length}/${results.length} verified.`,
        });
      }
    } catch (err: any) {
      toast({ title: 'Verify failed', description: err.message || String(err), variant: 'destructive' });
    } finally {
      setVerifyingBatchId(null);
    }
  };

  const removeBatch = (id: string) => {
    setBatches((all) => all.filter((b) => b.id !== id));
  };

  const markGsc = async (batch: DraftBatch, slug: string, checked: boolean) => {
    setGsc((s) => ({ ...s, [`${batch.id}:${slug}`]: checked }));
    if (checked) {
      // Find page_seo row via page_path and mark Submitted.
      await supabase
        .from('page_seo' as any)
        .update({ index_status: 'Submitted' })
        .eq('page_path', slug);
    }
  };

  return (
    <AdminLayout title="Upload SEO Pages">
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/seo">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to SEO
            </Link>
          </Button>
          {loadingSlugs && <span className="text-sm text-muted-foreground">Loading existing pages…</span>}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadIcon className="h-5 w-5" />
              Drop Markdown files
            </CardTitle>
            <CardDescription>
              1–15 .md files with YAML frontmatter, a <code>```json</code> JSON-LD block, then the body.
              Files stay as drafts until you click Publish Batch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed rounded-lg p-10 text-center hover:bg-muted/40 transition"
            >
              <UploadIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Drag & drop .md files here</p>
              <label className="inline-block">
                <input
                  type="file"
                  accept=".md,text/markdown"
                  multiple
                  className="hidden"
                  onChange={onPick}
                />
                <Button variant="outline" asChild>
                  <span>Choose files</span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>

        {files.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Validation ({files.length} file{files.length === 1 ? '' : 's'})</CardTitle>
                  <CardDescription>
                    Red items block save. Yellow items are warnings you can proceed past.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => setFiles([])}>Clear</Button>
                  <Button
                    disabled={saving || !savableFiles.length}
                    onClick={handleSaveBatch}
                  >
                    {saving ? 'Saving…' : `Save Batch (${savableFiles.length})`}
                  </Button>
                </div>
              </div>
              {anyRed && (
                <Alert variant="destructive" className="mt-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Some files can't be saved</AlertTitle>
                  <AlertDescription>Fix the red items in the source .md file and re-drop it.</AlertDescription>
                </Alert>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {files.map((f) => (
                <FilePreviewCard key={f.fileName} file={f} />
              ))}
            </CardContent>
          </Card>
        )}

        {saveResults && saveResults.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Save results</CardTitle>
                  <CardDescription>Per-file outcome from the last Save Batch.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSaveResults(null)}>Dismiss</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {saveResults.map((r) => (
                <div key={r.fileName} className="flex items-start gap-2">
                  {r.status === 'inserted' && <Badge variant="outline" className="border-green-500 text-green-700">Inserted</Badge>}
                  {r.status === 'updated' && <Badge variant="outline" className="border-blue-500 text-blue-700">Updated draft</Badge>}
                  {r.status === 'blocked' && <Badge variant="outline" className="border-red-500 text-red-700">Blocked</Badge>}
                  {r.status === 'error' && <Badge variant="destructive">Error</Badge>}
                  <code className="truncate">{r.slug || r.fileName}</code>
                  {r.message && <span className="text-muted-foreground">— {r.message}</span>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {pendingPages.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>All Pending Pages</CardTitle>
                <CardDescription>
                  {pendingPages.length} unpublished page{pendingPages.length === 1 ? '' : 's'} in the database (across all batches, including uploads from other sessions).
                </CardDescription>
              </div>
              <Button
                onClick={() => setConfirmPublishAll(true)}
                disabled={publishingAll}
              >
                <Rocket className="h-4 w-4 mr-2" />
                {publishingAll ? 'Publishing…' : `Publish all ${pendingPages.length}`}
              </Button>
            </CardHeader>
            <CardContent>
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Show slugs
                </summary>
                <ul className="mt-2 list-disc pl-5 space-y-0.5 max-h-64 overflow-auto">
                  {pendingPages.map((p) => (
                    <li key={p.id}><code className="text-xs">{p.url_slug}</code></li>
                  ))}
                </ul>
              </details>
            </CardContent>
          </Card>
        )}


        {batches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Uploaded — Draft</CardTitle>
              <CardDescription>Batches you've saved. Click Publish Batch to flip them live.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {batches.map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={batch}
                  gsc={gsc}
                  onPublish={() => setConfirmPublish(batch)}
                  onVerify={() => handleVerify(batch)}
                  onRemove={() => removeBatch(batch.id)}
                  onMarkGsc={(slug, checked) => markGsc(batch, slug, checked)}
                  publishing={publishingBatchId === batch.id}
                  verifying={verifyingBatchId === batch.id}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!confirmPublish} onOpenChange={(o) => !o && setConfirmPublish(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this batch?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-2">This will set the pages to published and trigger a Vercel deploy.</p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {confirmPublish?.slugs.map((s) => <li key={s}><code>{s}</code></li>)}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmPublish && handlePublishBatch(confirmPublish)}>
              Publish & deploy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmPublishAll} onOpenChange={setConfirmPublishAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish all {pendingPages.length} pending page{pendingPages.length === 1 ? '' : 's'}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-2">This flips every unpublished page in the database to <strong>published</strong> and fires one Vercel deploy.</p>
                <ul className="list-disc pl-5 text-xs space-y-0.5 max-h-48 overflow-auto">
                  {pendingPages.map((p) => <li key={p.id}><code>{p.url_slug}</code></li>)}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={publishingAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublishAllPending} disabled={publishingAll}>
              {publishingAll ? 'Publishing…' : 'Publish all & deploy'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

// --- Sub-components ---

function FilePreviewCard({ file }: { file: ValidatedPage }) {
  const fm = file.frontmatter;
  const reds = file.issues.filter((i) => i.level === 'red');
  const yellows = file.issues.filter((i) => i.level === 'yellow');
  const [expanded, setExpanded] = useState(reds.length > 0);

  return (
    <div className={`border rounded-md p-4 ${file.canSave ? 'bg-white' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">{file.fileName}</span>
            {file.canSave ? (
              <Badge variant="outline" className="border-green-500 text-green-700">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Ready
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" /> Blocked
              </Badge>
            )}
            {yellows.length > 0 && (
              <Badge variant="outline" className="border-amber-500 text-amber-700">
                <AlertTriangle className="h-3 w-3 mr-1" /> {yellows.length} warning{yellows.length === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
            <div>Slug: <code>{fm.url_slug || '(missing)'}</code></div>
            <div>Title: {fm.meta_title || '(missing)'} <span className="text-xs">({(fm.meta_title || '').length} chars)</span></div>
            <div>Cluster: {fm.cluster || '(missing)'} · Type: {fm.page_type || '(missing)'} · Audience: {fm.audience || '(missing)'}</div>
            <div>Body: {file.bodyWordCount} words</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Hide checks' : 'Show checks'}
        </Button>
      </div>

      {expanded && (
        <div className="mt-3 pl-6 space-y-1 text-sm">
          {file.issues.length === 0 ? (
            <div className="text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> All checks passed.
            </div>
          ) : (
            file.issues.map((i, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 ${i.level === 'red' ? 'text-red-700' : 'text-amber-700'}`}
              >
                {i.level === 'red' ? <XCircle className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
                <span>{i.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function BatchCard({
  batch,
  gsc,
  onPublish,
  onVerify,
  onRemove,
  onMarkGsc,
  publishing,
  verifying,
}: {
  batch: DraftBatch;
  gsc: Record<string, boolean>;
  onPublish: () => void;
  onVerify: () => void;
  onRemove: () => void;
  onMarkGsc: (slug: string, checked: boolean) => void;
  publishing: boolean;
  verifying: boolean;
}) {
  const { toast } = useToast();
  const allVerified =
    batch.verify &&
    batch.slugs.length > 0 &&
    batch.slugs.every((s) => batch.verify?.[s]?.status === 'verified');

  const copyLinks = () => {
    const text = batch.slugs.map((s) => `https://truficient.com${s}`).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${batch.slugs.length} URL(s) copied.` });
  };

  return (
    <div className="border rounded-md p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="font-medium">
            Batch · {batch.slugs.length} page{batch.slugs.length === 1 ? '' : 's'}
          </div>
          <div className="text-xs text-muted-foreground">
            Saved {new Date(batch.createdAt).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!batch.deploy && (
            <Button onClick={onPublish} disabled={publishing}>
              <Rocket className="h-4 w-4 mr-2" />
              {publishing ? 'Publishing…' : 'Publish Batch'}
            </Button>
          )}
          {batch.deploy?.ok && (
            <Button variant="outline" onClick={onVerify} disabled={verifying}>
              <RefreshCw className={`h-4 w-4 mr-2 ${verifying ? 'animate-spin' : ''}`} />
              {verifying ? 'Verifying…' : 'Verify Live'}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {batch.deploy && !batch.deploy.ok && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Deploy hook error</AlertTitle>
          <AlertDescription>{batch.deploy.error}</AlertDescription>
        </Alert>
      )}
      {batch.deploy?.ok && !batch.verify && (
        <Alert>
          <Rocket className="h-4 w-4" />
          <AlertTitle>Deploying…</AlertTitle>
          <AlertDescription>Deploy triggered at {new Date(batch.deploy.triggeredAt).toLocaleTimeString()}. Wait ~2 min, then click Verify Live.</AlertDescription>
        </Alert>
      )}
      {allVerified && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-700" />
          <AlertTitle className="text-green-800">Batch live and verified</AlertTitle>
          <AlertDescription className="text-green-900">
            <div className="flex items-center gap-2 mb-2">
              <span>Request indexing in Search Console for each URL:</span>
              <Button size="sm" variant="outline" onClick={copyLinks}>
                <Copy className="h-3 w-3 mr-1" /> Copy all
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="divide-y border-t">
        {batch.slugs.map((slug) => {
          const v = batch.verify?.[slug];
          const gscKey = `${batch.id}:${slug}`;
          return (
            <div key={slug} className="py-2 flex items-center gap-3 flex-wrap text-sm">
              <a
                href={`https://truficient.com${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1 min-w-0 truncate"
              >
                <code className="truncate">{slug}</code>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
              <div className="flex-1" />
              {v?.status === 'verified' && (
                <Badge variant="outline" className="border-green-500 text-green-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                </Badge>
              )}
              {v?.status === 'not_prerendered' && (
                <Badge variant="outline" className="text-muted-foreground">
                  Not prerendered yet
                </Badge>
              )}
              {v?.status === 'failed' && (
                <Badge variant="destructive" title={(v.errors || []).join('\n')}>
                  <XCircle className="h-3 w-3 mr-1" /> Failed
                </Badge>
              )}
              {allVerified && (
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={!!gsc[gscKey]}
                    onCheckedChange={(c) => onMarkGsc(slug, !!c)}
                  />
                  Marked as submitted in GSC
                </label>
              )}
            </div>
          );
        })}
      </div>

      {batch.verify && Object.values(batch.verify).some((r) => r.status === 'failed') && (
        <div className="text-xs text-red-700 space-y-1">
          {Object.values(batch.verify)
            .filter((r) => r.status === 'failed')
            .map((r) => (
              <div key={r.slug}>
                <strong>{r.slug}:</strong> {(r.errors || []).join('; ')}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
