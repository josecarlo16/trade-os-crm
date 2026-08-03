import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Plus, Search, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CatalogMaterial = {
  id: string;
  name: string;
  name_es: string | null;
  request_category: string | null;
  image_url: string | null;
  unit: string;
  part_number: string | null;
};

type SupplierLink = {
  material_id: string;
  preference_rank: number | null;
  supplier: { id: string; name: string; is_active: boolean; is_default: boolean } | null;
};

const CATEGORIES = ['Tools', 'Electrical', 'Refrigerant', 'Install Materials', 'Other'];

export function formatSuppliersLine(
  materialId: string,
  links: SupplierLink[],
  defaultSupplier: { name: string } | null,
): string {
  const rows = links.filter((l) => l.material_id === materialId && l.supplier?.is_active);
  if (rows.length === 0) {
    return defaultSupplier ? `Default: ${defaultSupplier.name}` : '';
  }
  const ranked = rows.filter((r) => r.preference_rank != null)
    .sort((a, b) => (a.preference_rank! - b.preference_rank!));
  const unranked = rows.filter((r) => r.preference_rank == null);
  if (ranked.length > 0 && unranked.length === 0) {
    return ranked.map((r) => `${r.preference_rank}. ${r.supplier!.name}`).join(' · ');
  }
  if (ranked.length === 0 && unranked.length > 0) {
    return 'any of: ' + unranked.map((r) => r.supplier!.name).join(', ');
  }
  const a = ranked.map((r) => `${r.preference_rank}. ${r.supplier!.name}`).join(' · ');
  const b = unranked.map((r) => r.supplier!.name).join(', ');
  return `${a} · also: ${b}`;
}

interface Props {
  language: 'en' | 'es';
  onLanguageChange: (lang: 'en' | 'es') => void;
  onPick: (m: CatalogMaterial) => void;
  addedCounts: Record<string, number>;
}

export default function MaterialCatalogPicker({
  language,
  onLanguageChange,
  onPick,
  addedCounts,
}: Props) {
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string>(CATEGORIES[0]);

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['materials_catalog_takeoff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials_catalog')
        // explicitly DO NOT select unit_cost
        .select('id, name, name_es, request_category, image_url, unit, part_number')
        .eq('show_in_takeoff', true)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as CatalogMaterial[];
    },
  });

  const materialIds = useMemo(() => materials.map((m) => m.id), [materials]);

  const { data: supplierLinks = [] } = useQuery({
    queryKey: ['material_suppliers_for_picker', materialIds.length],
    enabled: materialIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_suppliers')
        .select('material_id, preference_rank, supplier:crm_suppliers(id, name, is_active, is_default)')
        .in('material_id', materialIds);
      if (error) throw error;
      return (data || []) as unknown as SupplierLink[];
    },
  });

  const { data: defaultSupplier = null } = useQuery({
    queryKey: ['crm_suppliers_default'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_suppliers')
        .select('id, name')
        .eq('is_default', true)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials.filter((m) => {
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.name_es || '').toLowerCase().includes(q) ||
        (m.part_number || '').toLowerCase().includes(q)
      );
    });
  }, [materials, search]);

  const byCat = useMemo(() => {
    const map: Record<string, CatalogMaterial[]> = {};
    CATEGORIES.forEach((c) => (map[c] = []));
    filtered.forEach((m) => {
      const c = m.request_category && CATEGORIES.includes(m.request_category)
        ? m.request_category
        : 'Other';
      map[c].push(m);
    });
    return map;
  }, [filtered]);

  const displayName = (m: CatalogMaterial) =>
    language === 'es' ? (m.name_es || m.name) : m.name;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'es' ? 'Buscar materiales…' : 'Search materials…'}
            className="pl-9 h-11"
          />
        </div>
        <div className="flex rounded-md border overflow-hidden text-xs font-medium">
          <button
            type="button"
            onClick={() => onLanguageChange('en')}
            className={cn('px-3 py-2', language === 'en' ? 'bg-foreground text-background' : 'bg-background')}
          >EN</button>
          <button
            type="button"
            onClick={() => onLanguageChange('es')}
            className={cn('px-3 py-2', language === 'es' ? 'bg-foreground text-background' : 'bg-background')}
          >ES</button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          {language === 'es' ? 'Cargando…' : 'Loading…'}
        </div>
      ) : (
        <Tabs value={activeCat} onValueChange={setActiveCat}>
          <TabsList className="w-full overflow-x-auto justify-start flex-nowrap">
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c} value={c} className="text-xs sm:text-sm whitespace-nowrap">
                {c} <span className="ml-1 opacity-60">({byCat[c]?.length || 0})</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map((c) => (
            <TabsContent key={c} value={c} className="mt-3">
              {(byCat[c] || []).length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {language === 'es' ? 'Nada aquí.' : 'Nothing here.'}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {byCat[c].map((m) => {
                    const supLine = formatSuppliersLine(m.id, supplierLinks, defaultSupplier);
                    const count = addedCounts[m.id] || 0;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onPick(m)}
                        className="relative text-left border rounded-lg overflow-hidden bg-card hover:border-foreground/40 active:scale-[0.98] transition"
                      >
                        <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                          {m.image_url ? (
                            <img
                              src={m.image_url}
                              alt={displayName(m)}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <Package className="h-10 w-10 text-muted-foreground/40" />
                          )}
                        </div>
                        {count > 0 && (
                          <Badge className="absolute top-2 right-2 bg-[#d4a84b] text-[#1e3a5f] hover:bg-[#d4a84b]">
                            {count}
                          </Badge>
                        )}
                        <div className="p-2 space-y-1">
                          <div className="text-sm font-medium leading-tight line-clamp-2">
                            {displayName(m)}
                          </div>
                          {supLine && (
                            <div className="text-[11px] text-muted-foreground line-clamp-2">
                              {supLine}
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-muted-foreground">{m.unit}</span>
                            <span className="inline-flex items-center text-[11px] text-[#1e3a5f] font-medium">
                              <Plus className="h-3 w-3 mr-0.5" /> Add
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
