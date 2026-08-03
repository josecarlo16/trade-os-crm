import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Image as ImageIcon, Video, RefreshCw, Download, Search,
  CheckSquare, Square, Loader2, Camera, FileText, Mic, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

type MediaTypeFilter = 'all' | 'photo' | 'video';

interface WorkEdgeMedia {
  id: string;
  job_id: string;
  media_type: string;
  media_url: string | null;
  thumbnail_url: string | null;
  title: string | null;
  description: string | null;
  captured_at: string | null;
  captured_by: string | null;
}

interface JobContext {
  job_number: string;
  job_type_name: string | null;
  city: string | null;
  zip_code: string | null;
}

export function WorkEdgeMediaBrowser() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [mediaFilter, setMediaFilter] = useState<MediaTypeFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  // Fetch all workedge media with job context
  const { data: mediaItems = [], isLoading } = useQuery({
    queryKey: ['workedge-media-browser'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workedge_project_media')
        .select(`
          id, job_id, media_type, media_url, thumbnail_url, title, description, captured_at, captured_by,
          crm_jobs!inner(job_number, job_type_id, location_id,
            crm_job_types(name),
            crm_locations(city, zip_code)
          )
        `)
        .in('media_type', ['photo', 'video'])
        .order('captured_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch already-imported source_ids
  const { data: importedIds = [] } = useQuery({
    queryKey: ['gallery-imported-workedge-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gallery_images')
        .select('source_id')
        .eq('source', 'workedge');
      if (error) throw error;
      return data.map(d => d.source_id).filter(Boolean) as string[];
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      // Get all jobs with workedge project ids
      const { data: jobs } = await supabase
        .from('crm_jobs')
        .select('id, workedge_project_id')
        .not('workedge_project_id', 'is', null);
      if (!jobs || jobs.length === 0) {
        throw new Error('No jobs linked to WorkEdge');
      }
      let totalSynced = 0;
      for (const job of jobs) {
        const response = await supabase.functions.invoke('workedge-sync', {
          body: {
            action: 'get-project-media',
            jobId: job.id,
            workedgeProjectId: job.workedge_project_id,
          }
        });
        if (response.data?.media_count) totalSynced += response.data.media_count;
      }
      return totalSynced;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['workedge-media-browser'] });
      toast.success(`Synced media from ${count} items across all projects`);
    },
    onError: (error) => toast.error('Sync failed: ' + error.message),
  });

  // Parse job context from the nested query
  const getJobContext = (item: any): JobContext => {
    const job = item.crm_jobs;
    return {
      job_number: job?.job_number || '',
      job_type_name: job?.crm_job_types?.name || null,
      city: job?.crm_locations?.city || null,
      zip_code: job?.crm_locations?.zip_code || null,
    };
  };

  // Filter media
  const filtered = useMemo(() => {
    let items = mediaItems;
    if (mediaFilter !== 'all') {
      items = items.filter((m: any) => m.media_type === mediaFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((m: any) => {
        const ctx = getJobContext(m);
        return (
          ctx.job_number.toLowerCase().includes(q) ||
          (ctx.city && ctx.city.toLowerCase().includes(q)) ||
          (ctx.zip_code && ctx.zip_code.includes(q)) ||
          (ctx.job_type_name && ctx.job_type_name.toLowerCase().includes(q)) ||
          (m.title && m.title.toLowerCase().includes(q))
        );
      });
    }
    return items;
  }, [mediaItems, mediaFilter, search]);

  const importedSet = useMemo(() => new Set(importedIds), [importedIds]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const importable = filtered.filter((m: any) => !importedSet.has(m.id) && m.media_url);
    setSelected(new Set(importable.map((m: any) => m.id)));
  };

  const clearSelection = () => setSelected(new Set());

  // Import selected to gallery
  const handleImport = async () => {
    if (selected.size === 0) return;
    setImporting(true);
    let imported = 0;
    let skipped = 0;

    try {
      const selectedItems = mediaItems.filter((m: any) => selected.has(m.id));

      for (const item of selectedItems) {
        if (importedSet.has(item.id) || !item.media_url) {
          skipped++;
          continue;
        }

        const ctx = getJobContext(item);

        // Copy from workedge-media to gallery-images bucket
        const sourceUrl = item.media_url as string;
        const fileName = `workedge-${item.id}-${Date.now()}.${item.media_type === 'video' ? 'mp4' : 'jpg'}`;

        // Download from workedge-media and re-upload to gallery-images
        const response = await fetch(sourceUrl);
        if (!response.ok) {
          console.error(`Failed to fetch ${sourceUrl}`);
          skipped++;
          continue;
        }
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('gallery-images')
          .upload(fileName, blob, { contentType: blob.type });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          skipped++;
          continue;
        }

        const { data: publicUrl } = supabase.storage
          .from('gallery-images')
          .getPublicUrl(fileName);

        // Determine media_type for gallery
        const galleryMediaType = item.media_type === 'video' ? 'video' : 'image';

        // Create gallery image record
        const title = `${galleryMediaType === 'video' ? 'Video' : 'Photo'} – ${ctx.job_number}`;
        const { data: newImage, error: insertError } = await supabase
          .from('gallery_images')
          .insert({
            title,
            image_url: publicUrl.publicUrl,
            thumbnail_url: item.thumbnail_url || null,
            media_type: galleryMediaType,
            alt_text: `${ctx.job_type_name || 'HVAC'} work${ctx.city ? ' in ' + ctx.city : ''}`,
            is_active: true,
            is_featured: false,
            source: 'workedge',
            source_id: item.id,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          skipped++;
          continue;
        }

        // Auto-tag with city and ZIP
        if (newImage) {
          const tagsToCreate: string[] = [];
          if (ctx.city) tagsToCreate.push(ctx.city);
          if (ctx.zip_code) tagsToCreate.push(ctx.zip_code);
          if (ctx.job_type_name) tagsToCreate.push(ctx.job_type_name);

          for (const tagName of tagsToCreate) {
            const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            // Upsert tag
            let { data: existingTag } = await supabase
              .from('gallery_tags')
              .select('id')
              .eq('slug', slug)
              .maybeSingle();

            let tagId: string;
            if (existingTag) {
              tagId = existingTag.id;
            } else {
              const { data: newTag, error: tagErr } = await supabase
                .from('gallery_tags')
                .insert({ name: tagName, slug, is_active: true, sort_order: 99 })
                .select('id')
                .single();
              if (tagErr || !newTag) continue;
              tagId = newTag.id;
            }

            await supabase
              .from('gallery_image_tags')
              .insert({ image_id: newImage.id, tag_id: tagId });
          }
        }

        imported++;
      }

      queryClient.invalidateQueries({ queryKey: ['gallery-imported-workedge-ids'] });
      queryClient.invalidateQueries({ queryKey: ['gallery-images-admin-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['gallery-media-counts-admin'] });
      queryClient.invalidateQueries({ queryKey: ['gallery-tags-admin'] });
      setSelected(new Set());
      toast.success(`Imported ${imported} items${skipped > 0 ? `, ${skipped} skipped` : ''}`);
    } catch (error: any) {
      toast.error('Import failed: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const mediaIcon = (type: string) => {
    switch (type) {
      case 'photo': return <ImageIcon className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      default: return <Camera className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by job #, city, ZIP, type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <ToggleGroup type="single" value={mediaFilter} onValueChange={(v) => v && setMediaFilter(v as MediaTypeFilter)}>
            <ToggleGroupItem value="all" size="sm">All</ToggleGroupItem>
            <ToggleGroupItem value="photo" size="sm"><ImageIcon className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="video" size="sm"><Video className="h-4 w-4" /></ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sync All Projects
          </Button>
          {selected.size > 0 ? (
            <>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear ({selected.size})
              </Button>
              <Button size="sm" onClick={handleImport} disabled={importing}>
                {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Import {selected.size} to Gallery
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={selectAll}>
              <CheckSquare className="h-4 w-4 mr-2" />
              Select All
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{filtered.length} items</span>
        <span>·</span>
        <span>{filtered.filter((m: any) => m.media_type === 'photo').length} photos</span>
        <span>·</span>
        <span>{filtered.filter((m: any) => m.media_type === 'video').length} videos</span>
        <span>·</span>
        <span>{importedIds.length} already imported</span>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {mediaItems.length === 0
                ? 'No WorkEdge media synced yet. Click "Sync All Projects" to pull media.'
                : 'No media matches your search filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((item: any) => {
            const ctx = getJobContext(item);
            const isImported = importedSet.has(item.id);
            const isSelected = selected.has(item.id);
            const thumbUrl = item.thumbnail_url || item.media_url;

            return (
              <div
                key={item.id}
                className={`relative group rounded-lg border overflow-hidden cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-primary border-primary' : 'border-border hover:border-primary/50'
                } ${isImported ? 'opacity-60' : ''}`}
                onClick={() => !isImported && toggleSelect(item.id)}
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-muted relative">
                  {thumbUrl ? (
                    item.media_type === 'video' ? (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Video className="h-8 w-8 text-muted-foreground" />
                        {thumbUrl && (
                          <img
                            src={thumbUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                      </div>
                    ) : (
                      <img
                        src={thumbUrl}
                        alt={item.title || ''}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '';
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {mediaIcon(item.media_type)}
                    </div>
                  )}

                  {/* Checkbox overlay */}
                  {!isImported && (
                    <div className={`absolute top-2 left-2 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <div className="bg-background/80 rounded p-0.5">
                        <Checkbox checked={isSelected} />
                      </div>
                    </div>
                  )}

                  {/* Type badge */}
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                      {item.media_type}
                    </Badge>
                  </div>

                  {/* Imported badge */}
                  {isImported && (
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="default" className="text-xs px-1.5 py-0.5">
                        Imported
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-2 space-y-0.5">
                  <p className="text-xs font-medium truncate">{ctx.job_number}</p>
                  <div className="flex gap-1 flex-wrap">
                    {ctx.city && <Badge variant="outline" className="text-[10px] px-1 py-0">{ctx.city}</Badge>}
                    {ctx.zip_code && <Badge variant="outline" className="text-[10px] px-1 py-0">{ctx.zip_code}</Badge>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
