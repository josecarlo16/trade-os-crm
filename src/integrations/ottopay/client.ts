/**
 * Otto Pay API Client
 * Routes all requests through the ottopay-proxy edge function.
 * No API keys or credentials touch the browser.
 */

import { supabase } from '@/integrations/supabase/client';

export interface OttoApiResponse<T = any> {
  data: T | null;
  error: { message: string } | null;
}

/**
 * GET a resource (list or single by id)
 */
export async function ottoGet<T = any>(
  resource: string,
  params?: {
    id?: string;
    select?: string;
    order?: string;
    limit?: number;
    filters?: Record<string, string>;
  }
): Promise<OttoApiResponse<T>> {
  const { data, error } = await supabase.functions.invoke('ottopay-proxy', {
    body: {
      entity: resource,
      method: 'GET',
      id: params?.id,
      params: {
        select: params?.select,
        order: params?.order,
        limit: params?.limit,
        filters: params?.filters,
      },
    },
  });

  if (error) {
    return { data: null, error: { message: error.message || 'Proxy request failed' } };
  }
  return data as OttoApiResponse<T>;
}

/**
 * POST — create a new record
 */
export async function ottoPost<T = any>(
  resource: string,
  payload: Record<string, any>
): Promise<OttoApiResponse<T>> {
  const { data, error } = await supabase.functions.invoke('ottopay-proxy', {
    body: {
      entity: resource,
      method: 'POST',
      params: payload,
    },
  });

  if (error) {
    return { data: null, error: { message: error.message || 'Proxy request failed' } };
  }
  return data as OttoApiResponse<T>;
}

/**
 * PATCH — update an existing record
 */
export async function ottoPatch<T = any>(
  resource: string,
  id: string,
  payload: Record<string, any>
): Promise<OttoApiResponse<T>> {
  const { data, error } = await supabase.functions.invoke('ottopay-proxy', {
    body: {
      entity: resource,
      method: 'PATCH',
      id,
      params: payload,
    },
  });

  if (error) {
    return { data: null, error: { message: error.message || 'Proxy request failed' } };
  }
  return data as OttoApiResponse<T>;
}

/**
 * DELETE a record
 */
export async function ottoDelete(
  resource: string,
  id: string
): Promise<OttoApiResponse<null>> {
  const { data, error } = await supabase.functions.invoke('ottopay-proxy', {
    body: {
      entity: resource,
      method: 'DELETE',
      id,
    },
  });

  if (error) {
    return { data: null, error: { message: error.message || 'Proxy request failed' } };
  }
  return data as OttoApiResponse<null>;
}

/**
 * Upload a file via the proxy
 */
export async function ottoUpload(
  bucket: string,
  path: string,
  file: File
): Promise<OttoApiResponse<{ publicUrl: string }>> {
  const { data, error } = await supabase.functions.invoke('ottopay-proxy', {
    body: {
      entity: 'upload',
      method: 'POST',
      params: { bucket, path, fileName: file.name, fileType: file.type, fileSize: file.size },
    },
  });

  if (error) {
    return { data: null, error: { message: error.message || 'Upload failed' } };
  }
  return data as OttoApiResponse<{ publicUrl: string }>;
}

// Re-export — always true now since proxy handles config check server-side
export const isOttoPayConfigured = true;
