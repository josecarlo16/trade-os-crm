import { useCallback, useEffect, useState } from 'react';
import { BlockId } from '@/lib/tradeOSRoles';

/**
 * Per-user, per-browser dashboard block order/visibility — the "drag cards
 * to rearrange, hide what you don't need" feature from the client-approved
 * mockup. This is a LOCAL, personal-device stand-in for what will become
 * the `dashboard_layouts` table's user-override row once that migration
 * lands (see supabase/migrations/_draft_dashboard_layouts_schema.sql).
 * It never lets a user add a block outside their role's permitted set —
 * this hook only ever reorders/hides within `defaultOrder`, which the
 * caller must already have filtered to what the role can see.
 */
interface LayoutPrefs {
  order: BlockId[];
  hidden: BlockId[];
}

const storageKey = (roleTemplate: string) => `tradeos_layout_${roleTemplate}`;

function loadPrefs(roleTemplate: string): LayoutPrefs | null {
  try {
    const raw = localStorage.getItem(storageKey(roleTemplate));
    return raw ? (JSON.parse(raw) as LayoutPrefs) : null;
  } catch {
    return null;
  }
}

function savePrefs(roleTemplate: string, prefs: LayoutPrefs) {
  try {
    localStorage.setItem(storageKey(roleTemplate), JSON.stringify(prefs));
  } catch {
    // localStorage unavailable (private mode, etc.) — layout just won't persist
  }
}

export function useTradeOSLayoutPrefs(roleTemplate: string | null, defaultOrder: BlockId[]) {
  const [order, setOrder] = useState<BlockId[]>(defaultOrder);
  const [hidden, setHidden] = useState<Set<BlockId>>(new Set());
  const defaultKey = defaultOrder.join(',');

  useEffect(() => {
    if (!roleTemplate) return;
    const stored = loadPrefs(roleTemplate);
    if (stored) {
      // Reconcile against the role's current permitted set: drop blocks no
      // longer permitted, append any newly-permitted ones the stored prefs
      // predate.
      const validOrder = stored.order.filter((b) => defaultOrder.includes(b));
      const missing = defaultOrder.filter((b) => !validOrder.includes(b));
      setOrder([...validOrder, ...missing]);
      setHidden(new Set(stored.hidden.filter((b) => defaultOrder.includes(b))));
    } else {
      setOrder(defaultOrder);
      setHidden(new Set());
    }
    // defaultOrder is derived fresh each render from a role — key on its
    // content, not identity, to avoid re-running every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleTemplate, defaultKey]);

  const reorder = useCallback(
    (activeId: BlockId, overId: BlockId) => {
      if (!roleTemplate || activeId === overId) return;
      setOrder((prev) => {
        const oldIndex = prev.indexOf(activeId);
        const newIndex = prev.indexOf(overId);
        if (oldIndex === -1 || newIndex === -1) return prev;
        const next = [...prev];
        next.splice(oldIndex, 1);
        next.splice(newIndex, 0, activeId);
        savePrefs(roleTemplate, { order: next, hidden: Array.from(hidden) });
        return next;
      });
    },
    [roleTemplate, hidden]
  );

  const toggleHidden = useCallback(
    (id: BlockId) => {
      if (!roleTemplate) return;
      setHidden((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        savePrefs(roleTemplate, { order, hidden: Array.from(next) });
        return next;
      });
    },
    [roleTemplate, order]
  );

  const reset = useCallback(() => {
    setOrder(defaultOrder);
    setHidden(new Set());
    if (roleTemplate) {
      try {
        localStorage.removeItem(storageKey(roleTemplate));
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultKey, roleTemplate]);

  return { order, hidden, reorder, toggleHidden, reset };
}
