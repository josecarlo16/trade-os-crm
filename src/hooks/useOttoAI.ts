import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

async function callOttoAI(action: string, payload: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke('otto-ai', {
    body: { action, payload },
  });
  if (error) throw new Error(error.message || 'AI request failed');
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useLineItemAssist() {
  const [loading, setLoading] = useState(false);

  const assist = async (description: string): Promise<string> => {
    if (!description.trim()) {
      toast.error('Enter a description first');
      return description;
    }
    setLoading(true);
    try {
      const data = await callOttoAI('line-item-assist', { description });
      return data.result || description;
    } catch (e: any) {
      toast.error(e.message || 'AI assist failed');
      return description;
    } finally {
      setLoading(false);
    }
  };

  return { assist, loading };
}

export function useBusinessSnapshot() {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async (metrics: {
    totalRevenue: number;
    outstanding: number;
    overdueCount: number;
    thisMonth: number;
    recentPayments: number;
  }) => {
    setLoading(true);
    try {
      const data = await callOttoAI('business-snapshot', { metrics });
      setSummary(data.result || null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate snapshot');
    } finally {
      setLoading(false);
    }
  };

  return { summary, loading, refresh };
}

export function useReceiptScanner() {
  const [loading, setLoading] = useState(false);

  const scan = async (imageBase64: string): Promise<{
    vendor: string;
    amount: number;
    date: string;
    category: string;
  } | null> => {
    setLoading(true);
    try {
      const data = await callOttoAI('scan-receipt', { imageBase64 });
      return data.result || null;
    } catch (e: any) {
      toast.error(e.message || 'Receipt scan failed');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { scan, loading };
}

export function usePhotoCatalog() {
  const [loading, setLoading] = useState(false);

  const identify = async (imageBase64: string): Promise<{
    name: string;
    category: string;
    description: string;
    suggested_price: number;
    item_type: 'material' | 'equipment';
  } | null> => {
    setLoading(true);
    try {
      const data = await callOttoAI('photo-catalog', { imageBase64 });
      return data.result || null;
    } catch (e: any) {
      toast.error(e.message || 'Photo identification failed');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { identify, loading };
}
