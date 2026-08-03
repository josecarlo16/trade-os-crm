import { useMemo, useRef, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
}

function useAllEstimateTags() {
  return useQuery({
    queryKey: ['estimate-tags-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimates')
        .select('tags')
        .not('tags', 'is', null);
      if (error) throw error;
      const counts = new Map<string, { tag: string; count: number }>();
      for (const row of (data || []) as { tags: string[] | null }[]) {
        for (const raw of row.tags || []) {
          const t = (raw || '').trim();
          if (!t) continue;
          const key = t.toLowerCase();
          const existing = counts.get(key);
          if (existing) existing.count += 1;
          else counts.set(key, { tag: t, count: 1 });
        }
      }
      return Array.from(counts.values()).sort((a, b) => b.count - a.count);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function EstimateTagAutocomplete({ tags, onChange }: Props) {
  const { data: allTags = [] } = useAllEstimateTags();
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const lowerExisting = useMemo(() => new Set(tags.map((t) => t.toLowerCase())), [tags]);

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (!q) return [];
    return allTags
      .filter((t) => t.tag.toLowerCase().includes(q) && !lowerExisting.has(t.tag.toLowerCase()))
      .slice(0, 8);
  }, [input, allTags, lowerExisting]);

  useEffect(() => {
    setHighlight(0);
  }, [input]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const addTag = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    // Reuse exact existing spelling if there's a case-insensitive match
    const existing = allTags.find((t) => t.tag.toLowerCase() === trimmed.toLowerCase());
    const finalTag = existing ? existing.tag : trimmed;
    if (lowerExisting.has(finalTag.toLowerCase())) {
      setInput('');
      return;
    }
    onChange([...tags, finalTag]);
    setInput('');
    setOpen(false);
  };

  const removeTag = (idx: number) => onChange(tags.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
          >
            {tag}
            <button type="button" onClick={() => removeTag(i)} className="hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div ref={wrapRef} className="relative flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Add a tag — start typing to see existing tags"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setOpen(true);
            }}
            onFocus={() => input && setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setOpen(true);
                setHighlight((h) => Math.min(h + 1, Math.max(suggestions.length - 1, 0)));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === 'Escape') {
                setOpen(false);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (open && suggestions[highlight]) {
                  addTag(suggestions[highlight].tag);
                } else if (input.trim()) {
                  addTag(input);
                }
              }
            }}
          />
          {open && suggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover border rounded-md shadow-md max-h-64 overflow-auto">
              {suggestions.map((s, i) => (
                <button
                  key={s.tag}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addTag(s.tag);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${
                    i === highlight ? 'bg-accent text-accent-foreground' : ''
                  }`}
                >
                  <span>{s.tag}</span>
                  <span className="text-xs text-muted-foreground">{s.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => addTag(input)}>
          Add
        </Button>
      </div>
    </div>
  );
}
