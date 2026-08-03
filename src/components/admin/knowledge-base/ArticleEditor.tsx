import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Sparkles, Upload, Trash2, Link2, GripVertical, X, Plus,
} from 'lucide-react';
import { toast } from 'sonner';

interface KbCategory { id: string; name: string; }
interface KbArticle {
  id?: string;
  category_id: string | null;
  title_en: string;
  title_es: string | null;
  content_en: string | null;
  content_es: string | null;
  tag_type: string | null;
  model_number: string | null;
  tags: string[] | null;
}
interface KbMedia {
  id: string; // temp uuid for new
  persistedId?: string; // db id when saved
  article_id?: string;
  media_type: 'image' | 'video';
  url: string;
  caption_en: string | null;
  caption_es: string | null;
  sort_order: number;
  isNew?: boolean;
  isEmbed?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  article: KbArticle | null;
  categories: KbCategory[];
  onSaved: () => void;
}

const VIDEO_HOST_RE = /(youtube\.com|youtu\.be|vimeo\.com|loom\.com)/i;
const uid = () => (crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2);

export default function ArticleEditor({ open, onOpenChange, article, categories, onSaved }: Props) {
  const isEdit = !!article?.id;
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [form, setForm] = useState<KbArticle>({
    category_id: '',
    title_en: '',
    title_es: '',
    content_en: '',
    content_es: '',
    tag_type: 'general',
    model_number: '',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [media, setMedia] = useState<KbMedia[]>([]);
  const [embedUrl, setEmbedUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (article) {
      setForm({
        ...article,
        title_es: article.title_es || '',
        content_en: article.content_en || '',
        content_es: article.content_es || '',
        tag_type: article.tag_type || 'general',
        model_number: article.model_number || '',
        tags: article.tags || [],
      });
      if (article.id) loadMedia(article.id);
    } else {
      setForm({
        category_id: '', title_en: '', title_es: '', content_en: '', content_es: '',
        tag_type: 'general', model_number: '', tags: [],
      });
      setMedia([]);
    }
    setTagInput('');
    setEmbedUrl('');
  }, [open, article?.id]);

  const loadMedia = async (articleId: string) => {
    const { data } = await (supabase as any)
      .from('kb_media').select('*').eq('article_id', articleId).order('sort_order');
    setMedia((data || []).map((m: any) => ({
      id: m.id, persistedId: m.id, article_id: m.article_id,
      media_type: m.media_type, url: m.url,
      caption_en: m.caption_en, caption_es: m.caption_es,
      sort_order: m.sort_order ?? 0,
      isEmbed: m.media_type === 'video' && !m.url.startsWith('http') ? false : VIDEO_HOST_RE.test(m.url),
    })));
  };

  const uploadFile = async (file: File): Promise<KbMedia | null> => {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${article?.id ?? 'new'}/${uid()}.${ext}`;
    const { error } = await supabase.storage.from('knowledge-base').upload(path, file, {
      cacheControl: '3600', upsert: false, contentType: file.type,
    });
    if (error) { toast.error(error.message); return null; }
    const { data } = supabase.storage.from('knowledge-base').getPublicUrl(path);
    const isVideo = file.type.startsWith('video/');
    return {
      id: uid(), media_type: isVideo ? 'video' : 'image', url: data.publicUrl,
      caption_en: '', caption_es: '',
      sort_order: media.length, isNew: true,
    };
  };

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const out: KbMedia[] = [];
    for (const f of arr) {
      const m = await uploadFile(f);
      if (m) out.push(m);
    }
    if (out.length) setMedia(prev => [...prev, ...out]);
  };

  const onPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === 'file') {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length) {
      e.preventDefault();
      await handleFiles(files);
    }
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) await handleFiles(e.dataTransfer.files);
  };

  const addEmbed = () => {
    const url = embedUrl.trim();
    if (!url || !VIDEO_HOST_RE.test(url)) {
      toast.error('Enter a YouTube, Vimeo, or Loom URL');
      return;
    }
    setMedia(prev => [...prev, {
      id: uid(), media_type: 'video', url,
      caption_en: '', caption_es: '',
      sort_order: prev.length, isNew: true, isEmbed: true,
    }]);
    setEmbedUrl('');
  };

  const removeMedia = (id: string) => {
    setMedia(prev => prev.filter(m => m.id !== id).map((m, i) => ({ ...m, sort_order: i })));
  };

  const moveMedia = (id: string, dir: -1 | 1) => {
    setMedia(prev => {
      const idx = prev.findIndex(m => m.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy.map((m, i) => ({ ...m, sort_order: i }));
    });
  };

  const updateMediaField = (id: string, patch: Partial<KbMedia>) => {
    setMedia(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!(form.tags || []).includes(t)) {
      setForm(f => ({ ...f, tags: [...(f.tags || []), t] }));
    }
    setTagInput('');
  };
  const removeTag = (t: string) => setForm(f => ({ ...f, tags: (f.tags || []).filter(x => x !== t) }));

  const translate = async () => {
    if (!form.title_en && !form.content_en) {
      toast.error('Add English content before translating');
      return;
    }
    const hasEsContent = form.title_es || form.content_es || media.some(m => m.caption_es);
    if (hasEsContent && !confirm('Overwrite existing Spanish content?')) return;

    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('kb-translate', {
        body: {
          title_en: form.title_en,
          content_en: form.content_en,
          media: media.map(m => ({ id: m.id, caption_en: m.caption_en || '' })),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      setForm(f => ({
        ...f,
        title_es: (data as any).title_es || f.title_es,
        content_es: (data as any).content_es || f.content_es,
      }));
      const map = new Map<string, string>(
        ((data as any).captions || []).map((c: any) => [c.id, c.caption_es || ''])
      );
      setMedia(prev => prev.map(m => map.has(m.id) ? { ...m, caption_es: map.get(m.id) || '' } : m));
      toast.success('Translated to Spanish — review before saving');
    } catch (e: any) {
      toast.error(e.message || 'Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const save = async () => {
    if (!form.title_en.trim() || !form.category_id) {
      toast.error('Category and English title are required');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      const payload = {
        category_id: form.category_id,
        title_en: form.title_en.trim(),
        title_es: form.title_es?.trim() || null,
        content_en: form.content_en || null,
        content_es: form.content_es || null,
        tag_type: form.tag_type,
        model_number: form.model_number?.trim() || null,
        tags: form.tags && form.tags.length ? form.tags : null,
        updated_by: userId,
      };

      let articleId = article?.id;
      if (isEdit && articleId) {
        const { error } = await (supabase as any).from('kb_articles').update(payload).eq('id', articleId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any).from('kb_articles')
          .insert({ ...payload, created_by: userId }).select('id').single();
        if (error) throw error;
        articleId = data.id;
      }

      // Sync media: upsert all; delete missing
      const { data: existing } = await (supabase as any)
        .from('kb_media').select('id').eq('article_id', articleId);
      const existingIds = new Set((existing || []).map((m: any) => m.id));
      const keptIds = new Set(media.filter(m => m.persistedId).map(m => m.persistedId!));
      const toDelete = [...existingIds].filter(id => !keptIds.has(id as string));
      if (toDelete.length) {
        await (supabase as any).from('kb_media').delete().in('id', toDelete);
      }
      for (const m of media) {
        const row = {
          article_id: articleId,
          media_type: m.media_type,
          url: m.url,
          caption_en: m.caption_en || null,
          caption_es: m.caption_es || null,
          sort_order: m.sort_order,
        };
        if (m.persistedId) {
          await (supabase as any).from('kb_media').update(row).eq('id', m.persistedId);
        } else {
          await (supabase as any).from('kb_media').insert(row);
        }
      }

      toast.success(isEdit ? 'Article updated' : 'Article created');
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[92vh] overflow-y-auto"
        onPaste={onPaste}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? 'Edit Article' : 'New Article'}
            <Button
              type="button" size="sm" variant="outline"
              className="ml-auto" onClick={translate} disabled={translating}
            >
              {translating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Sparkles className="h-3.5 w-3.5 mr-2" />}
              Translate to Spanish
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Category *</Label>
              <Select value={form.category_id || ''} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tag Type</Label>
              <Select value={form.tag_type || 'general'} onValueChange={v => setForm(f => ({ ...f, tag_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="install">Install</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Model Number</Label>
              <Input value={form.model_number || ''} onChange={e => setForm(f => ({ ...f, model_number: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                  placeholder="Type and press Enter"
                />
                <Button type="button" variant="outline" size="icon" onClick={addTag}><Plus className="h-4 w-4" /></Button>
              </div>
              {(form.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {(form.tags || []).map(t => (
                    <Badge key={t} variant="secondary" className="gap-1">
                      {t}
                      <button type="button" onClick={() => removeTag(t)}><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Tabs defaultValue="en" className="w-full">
            <TabsList>
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="es">Spanish</TabsTrigger>
            </TabsList>
            <TabsContent value="en" className="space-y-3">
              <div>
                <Label className="text-xs">Title (EN) *</Label>
                <Input value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Content (EN) — Markdown supported</Label>
                <Textarea rows={10} value={form.content_en || ''} onChange={e => setForm(f => ({ ...f, content_en: e.target.value }))} />
              </div>
            </TabsContent>
            <TabsContent value="es" className="space-y-3">
              <div>
                <Label className="text-xs">Title (ES)</Label>
                <Input value={form.title_es || ''} onChange={e => setForm(f => ({ ...f, title_es: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Content (ES) — Markdown supported</Label>
                <Textarea rows={10} value={form.content_es || ''} onChange={e => setForm(f => ({ ...f, content_es: e.target.value }))} />
              </div>
            </TabsContent>
          </Tabs>

          <div className="border rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Media</Label>
              <div className="flex gap-2">
                <input
                  ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden"
                  onChange={e => e.target.files && handleFiles(e.target.files)}
                />
                <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-2" />Upload
                </Button>
              </div>
            </div>

            <div
              ref={dropRef}
              onDragOver={e => e.preventDefault()}
              onDrop={onDrop}
              className="border-2 border-dashed border-muted rounded-md p-4 text-center text-xs text-muted-foreground"
            >
              Drag & drop files here, or paste a screenshot anywhere in this dialog.
            </div>

            <div className="flex gap-2">
              <Input
                value={embedUrl}
                onChange={e => setEmbedUrl(e.target.value)}
                placeholder="Paste YouTube / Vimeo / Loom URL"
              />
              <Button type="button" variant="outline" onClick={addEmbed}>
                <Link2 className="h-4 w-4 mr-2" />Add Embed
              </Button>
            </div>

            {media.length > 0 && (
              <div className="space-y-2">
                {media.map((m, i) => (
                  <div key={m.id} className="flex gap-3 items-start p-2 border rounded-md bg-muted/30">
                    <div className="flex flex-col gap-1 pt-1">
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveMedia(m.id, -1)} disabled={i === 0}>
                        <GripVertical className="h-3 w-3" />↑
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveMedia(m.id, 1)} disabled={i === media.length - 1}>
                        ↓
                      </Button>
                    </div>
                    <div className="w-24 h-20 bg-background rounded flex items-center justify-center overflow-hidden">
                      {m.media_type === 'image'
                        ? <img src={m.url} alt="" className="object-cover w-full h-full" />
                        : <div className="text-xs text-center p-1 break-all">{m.isEmbed ? 'Embed' : 'Video'}</div>}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="text-xs text-muted-foreground truncate">{m.url}</div>
                      <Input placeholder="Caption (EN)" value={m.caption_en || ''} onChange={e => updateMediaField(m.id, { caption_en: e.target.value })} />
                      <Input placeholder="Caption (ES)" value={m.caption_es || ''} onChange={e => updateMediaField(m.id, { caption_es: e.target.value })} />
                    </div>
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeMedia(m.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? 'Save Changes' : 'Create Article'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
