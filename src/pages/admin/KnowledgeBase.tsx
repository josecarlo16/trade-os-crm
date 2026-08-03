import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Plus, BookOpen, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ArticleEditor from '@/components/admin/knowledge-base/ArticleEditor';
import IconPicker from '@/components/admin/knowledge-base/IconPicker';
import { useUserRole } from '@/hooks/useUserRole';

interface KbCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

interface KbArticle {
  id: string;
  category_id: string | null;
  title_en: string;
  title_es: string | null;
  content_en: string | null;
  content_es: string | null;
  tag_type: string | null;
  model_number: string | null;
  tags: string[] | null;
  updated_at: string;
}

export default function KnowledgeBase() {
  const { isAdmin, isSuperAdmin } = useUserRole();
  const canEdit = isAdmin || isSuperAdmin;

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<KbCategory[]>([]);
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');
  const [lang, setLang] = useState<'en' | 'es'>('en');

  const [catOpen, setCatOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', slug: '', icon: '' });
  const [editingCategory, setEditingCategory] = useState<KbCategory | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KbArticle | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: cats }, { data: arts }] = await Promise.all([
      (supabase as any).from('kb_categories').select('*').eq('is_active', true).order('sort_order'),
      (supabase as any).from('kb_articles').select('*').order('updated_at', { ascending: false }),
    ]);
    setCategories(cats || []);
    setArticles(arts || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const saveCategory = async () => {
    if (!catForm.name) return;
    const slug = catForm.slug || slugify(catForm.name);
    if (editingCategory) {
      const { error } = await (supabase as any).from('kb_categories').update({
        name: catForm.name,
        slug,
        icon: catForm.icon || null,
      }).eq('id', editingCategory.id);
      if (error) return toast.error(error.message);
      toast.success('Category updated');
    } else {
      const { error } = await (supabase as any).from('kb_categories').insert({
        name: catForm.name,
        slug,
        icon: catForm.icon || null,
      });
      if (error) return toast.error(error.message);
      toast.success('Category created');
    }
    setCatOpen(false);
    setEditingCategory(null);
    setCatForm({ name: '', slug: '', icon: '' });
    load();
  };

  const openCategoryEditor = (cat?: KbCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setCatForm({ name: cat.name, slug: cat.slug, icon: cat.icon || '' });
    } else {
      setEditingCategory(null);
      setCatForm({ name: '', slug: '', icon: '' });
    }
    setCatOpen(true);
  };

  const deleteCategory = async (cat: KbCategory) => {
    const count = articles.filter(a => a.category_id === cat.id).length;
    if (!confirm(`Delete category "${cat.name}"?${count > 0 ? ` This will also delete ${count} article(s).` : ''}`)) return;
    const { error } = await (supabase as any).from('kb_categories').delete().eq('id', cat.id);
    if (error) return toast.error(error.message);
    toast.success('Category deleted');
    if (activeCategory === cat.id) setActiveCategory('all');
    load();
  };

  const openEditor = (article?: KbArticle) => {
    setEditingArticle(article || null);
    setEditorOpen(true);
  };

  const deleteArticle = async (id: string) => {
    if (!confirm('Delete this article?')) return;
    const { error } = await (supabase as any).from('kb_articles').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    load();
  };

  const filtered = activeCategory === 'all'
    ? articles
    : articles.filter(a => a.category_id === activeCategory);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" /> Knowledge Base
          </h1>
          <p className="text-muted-foreground text-sm">Bilingual install &amp; service articles for technicians.</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Dialog open={catOpen} onOpenChange={(o) => { setCatOpen(o); if (!o) { setEditingCategory(null); setCatForm({ name: '', slug: '', icon: '' }); } }}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => openCategoryEditor()}><Plus className="h-4 w-4 mr-2" />Category</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingCategory ? 'Edit Category' : 'New Category'}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Name" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} />
                  <Input placeholder="Slug (auto)" value={catForm.slug} onChange={e => setCatForm({ ...catForm, slug: e.target.value })} />
                  <IconPicker value={catForm.icon} onChange={v => setCatForm({ ...catForm, icon: v })} />
                </div>
                <DialogFooter><Button onClick={saveCategory}>{editingCategory ? 'Save' : 'Create'}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={() => openEditor()}><Plus className="h-4 w-4 mr-2" />Add Article</Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={activeCategory === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setActiveCategory('all')}>
          All ({articles.length})
        </Button>
        {categories.map(c => (
          <div key={c.id} className="inline-flex items-center rounded-md border bg-background overflow-hidden">
            <Button variant={activeCategory === c.id ? 'default' : 'ghost'} size="sm" className="rounded-none border-0" onClick={() => setActiveCategory(c.id)}>
              {c.name} ({articles.filter(a => a.category_id === c.id).length})
            </Button>
            {canEdit && (
              <>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-none" onClick={() => openCategoryEditor(c)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-none" onClick={() => deleteCategory(c)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        ))}
        <div className="ml-auto inline-flex rounded-md border overflow-hidden">
          <Button variant={lang === 'en' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setLang('en')}>EN</Button>
          <Button variant={lang === 'es' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setLang('es')}>ES</Button>
        </div>
      </div>


      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No articles yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(a => {
            const cat = categories.find(c => c.id === a.category_id);
            const showEs = lang === 'es';
            const title = showEs ? (a.title_es || a.title_en) : a.title_en;
            const content = showEs ? (a.content_es || a.content_en) : a.content_en;
            const altTitle = showEs ? a.title_en : a.title_es;
            const altLabel = showEs ? 'EN' : 'ES';
            const missingEs = showEs && !a.title_es;
            return (
              <Card key={a.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{title}</CardTitle>
                      {altTitle && <p className="text-xs text-muted-foreground mt-1">{altLabel}: {altTitle}</p>}
                      {missingEs && <p className="text-xs text-amber-600 mt-1">No Spanish translation yet</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {cat && <Badge variant="secondary">{cat.name}</Badge>}
                      {a.tag_type && <Badge variant="outline">{a.tag_type}</Badge>}
                      {a.model_number && <Badge variant="outline">{a.model_number}</Badge>}
                      {canEdit && (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => openEditor(a)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteArticle(a.id)}><Trash2 className="h-4 w-4" /></Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {(content || (a.tags && a.tags.length)) && (
                  <CardContent className="pt-0">
                    {content && <p className="text-sm text-muted-foreground line-clamp-2">{content}</p>}
                    {a.tags && a.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {a.tags.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <ArticleEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        article={editingArticle as any}
        categories={categories}
        onSaved={load}
      />
    </div>
  );
}
