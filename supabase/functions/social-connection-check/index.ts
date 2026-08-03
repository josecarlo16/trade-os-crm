// social-connection-check
// Lightweight verification per platform. Updates crm_social_connections.token_status,
// token_expires_at (where derivable), last_checked_at, last_check_detail.
// Never returns the token itself.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

type CheckResult = {
  status: 'valid' | 'expired' | 'error' | 'none'
  detail: string
  display_name?: string | null
  account_id?: string | null
  meta?: Record<string, unknown>
  expires_at?: string | null
}

async function checkFacebook(): Promise<CheckResult> {
  const token = Deno.env.get('FACEBOOK_PAGE_TOKEN')
  const pageId = Deno.env.get('FB_PAGE_ID')
  if (!token || !pageId) return { status: 'none', detail: 'Missing FACEBOOK_PAGE_TOKEN or FB_PAGE_ID secret.' }
  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=id,name&access_token=${encodeURIComponent(token)}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { status: 'error', detail: `Facebook: ${data?.error?.message || res.statusText}` }
  return { status: 'valid', detail: `Connected to Page "${data.name}"`, display_name: data.name, account_id: data.id, meta: { page_id: pageId } }
}

async function checkInstagram(): Promise<CheckResult> {
  const token = Deno.env.get('FACEBOOK_PAGE_TOKEN')
  const igUserId = Deno.env.get('IG_USER_ID')
  if (!token || !igUserId) return { status: 'none', detail: 'Missing FACEBOOK_PAGE_TOKEN or IG_USER_ID secret.' }
  const res = await fetch(`https://graph.facebook.com/v21.0/${igUserId}?fields=id,username&access_token=${encodeURIComponent(token)}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { status: 'error', detail: `Instagram: ${data?.error?.message || res.statusText}` }
  return { status: 'valid', detail: `Connected to @${data.username}`, display_name: data.username, account_id: data.id, meta: { ig_user_id: igUserId } }
}

async function checkTikTok(): Promise<CheckResult> {
  const token = Deno.env.get('TIKTOK_ACCESS_TOKEN')
  if (!token) return { status: 'none', detail: 'Missing TIKTOK_ACCESS_TOKEN secret.' }
  const res = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.error?.code && data.error.code !== 'ok') {
    return { status: 'error', detail: `TikTok: ${data?.error?.message || res.statusText}` }
  }
  const u = data?.data?.user
  return { status: 'valid', detail: `Connected as @${u?.username || u?.display_name || 'tiktok user'}`, display_name: u?.display_name || u?.username || null, account_id: u?.open_id || null }
}

async function getGbpAccessToken(): Promise<string | null> {
  const clientId = Deno.env.get('GBP_CLIENT_ID')
  const clientSecret = Deno.env.get('GBP_CLIENT_SECRET')
  const refreshToken = Deno.env.get('GBP_REFRESH_TOKEN')
  if (!clientId || !clientSecret || !refreshToken) return null
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return null
  return data?.access_token || null
}

async function checkGoogleBusiness(): Promise<CheckResult> {
  const accountId = Deno.env.get('GBP_ACCOUNT_ID')
  const locationId = Deno.env.get('GBP_LOCATION_ID')
  if (!accountId || !locationId) return { status: 'none', detail: 'Missing GBP_ACCOUNT_ID or GBP_LOCATION_ID secret.' }
  const access = await getGbpAccessToken()
  if (!access) return { status: 'error', detail: 'Could not refresh Google access token (check GBP_CLIENT_ID/SECRET/REFRESH_TOKEN).' }
  const res = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/locations/${locationId}?readMask=name,title`, {
    headers: { Authorization: `Bearer ${access}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { status: 'error', detail: `GBP: ${data?.error?.message || res.statusText}` }
  return { status: 'valid', detail: `Connected to location "${data.title || data.name}"`, display_name: data.title || data.name, account_id: locationId, meta: { account_id: accountId, location_id: locationId } }
}

export async function runCheck(platform: string): Promise<CheckResult> {
  switch (platform) {
    case 'facebook': return await checkFacebook()
    case 'instagram': return await checkInstagram()
    case 'tiktok': return await checkTikTok()
    case 'google_business': return await checkGoogleBusiness()
    default: return { status: 'error', detail: `Unknown platform "${platform}"` }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { platform } = await req.json()
    if (!platform || typeof platform !== 'string') {
      return new Response(JSON.stringify({ error: 'platform required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const result = await runCheck(platform)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const update: Record<string, unknown> = {
      token_status: result.status,
      last_checked_at: new Date().toISOString(),
      last_check_detail: result.detail,
      is_connected: result.status === 'valid',
    }
    if (result.display_name) update.display_name = result.display_name
    if (result.account_id) update.account_id = result.account_id
    if (result.meta) update.meta = result.meta
    if (result.expires_at) update.token_expires_at = result.expires_at
    await supabase.from('crm_social_connections').update(update).eq('platform', platform)
    return new Response(JSON.stringify({ status: result.status, detail: result.detail }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('social-connection-check error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
