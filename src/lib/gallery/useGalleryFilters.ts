import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FACET_ORDER, emptySelected, type Facet, type Selected } from './facets';

const PARAM_FACETS: Facet[] = [...FACET_ORDER, 'media'];

/**
 * Gallery filter state mirrored to the URL query string, e.g.
 * `?city=Dallas&brand=Mitsubishi&systemType=Ductless|Ducted`.
 * Shareable + restorable; the canonical /gallery (no query) shows everything.
 */
export function useGalleryFilters() {
  const [params, setParams] = useSearchParams();

  const selected = useMemo<Selected>(() => {
    const s = emptySelected();
    for (const f of PARAM_FACETS) {
      const raw = params.get(f);
      if (raw) s[f] = raw.split('|').map((v) => v.trim()).filter(Boolean);
    }
    return s;
  }, [params]);

  const commit = (next: Selected) => {
    const p = new URLSearchParams();
    for (const f of PARAM_FACETS) if (next[f].length) p.set(f, next[f].join('|'));
    setParams(p, { replace: true });
  };

  const clone = (): Selected => {
    const c = emptySelected();
    for (const f of PARAM_FACETS) c[f] = [...selected[f]];
    return c;
  };

  const toggle = (f: Facet, v: string) => {
    const next = clone();
    next[f] = next[f].includes(v) ? next[f].filter((x) => x !== v) : [...next[f], v];
    commit(next);
  };
  const add = (f: Facet, v: string) => {
    if (selected[f].includes(v)) return;
    const next = clone();
    next[f] = [...next[f], v];
    commit(next);
  };
  const remove = (f: Facet, v: string) => {
    const next = clone();
    next[f] = next[f].filter((x) => x !== v);
    commit(next);
  };
  const setMedia = (v: 'Photos' | 'Videos' | null) => {
    const next = clone();
    next.media = v ? [v] : [];
    commit(next);
  };
  const clearAll = () => commit(emptySelected());

  const activeCount = PARAM_FACETS.reduce((n, f) => n + selected[f].length, 0);

  return { selected, toggle, add, remove, setMedia, clearAll, activeCount };
}
