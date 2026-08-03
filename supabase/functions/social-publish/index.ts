// social-publish — single publish entry point with per-platform adapters.
// Input: { post_id, target_id }
// Loads the target + parent post + connection, dispatches to the correct adapter,
// and writes the result back to crm_social_post_targets.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

type AdapterOutcome =
  | { status: 'posted'; external_id?: string | null; detail?: string }
  | { status: 'draft_only'; external_id?: string | null; detail: string }
  | { status: 'failed'; detail: string }

interface Post {
  id: string
  title: string | null
  body: string
  media_urls: string[] | null
}
interface Target {
  id: string
  post_id: string
  platform: string
  platform_copy: string | null
}
interface Connection {
  platform: string
  is_connected: boolean
  live_enabled: boolean
  token_status: string
  meta: Record<string, any>
}

function isPublicHttpUrl(u: string | undefined | null): boolean {
  if (!u) return false
  try {
    const parsed = new URL(u)
    return parsed.protocol === 'https:' && !parsed.hostname.includes('localhost')
  } catch { return false }
}

// ───────────────────────────── Facebook ─────────────────────────────
async function publishFacebook(post: Post, target: Target, conn: Connection): Promise<AdapterOutcome> {
  if (!conn.live_enabled) return { status: 'draft_only', detail: 'Facebook live publishing toggled off.' }
  const token = Deno.env.get('FACEBOOK_PAGE_TOKEN')
  const pageId = Deno.env.get('FB_PAGE_ID') || conn.meta?.page_id
  if (!token || !pageId) return { status: 'failed', detail: 'Missing FACEBOOK_PAGE_TOKEN or FB_PAGE_ID secret.' }
  const message = target.platform_copy || post.body
  const firstImage = (post.media_urls || []).find(isPublicHttpUrl)
  let url: string
  const body = new URLSearchParams()
  body.set('access_token', token)
  if (firstImage) {
    url = `https://graph.facebook.com/v21.0/${pageId}/photos`
    body.set('url', firstImage)
    body.set('caption', message)
  } else {
    url = `https://graph.facebook.com/v21.0/${pageId}/feed`
    body.set('message', message)
  }
  const res = await fetch(url, { method: 'POST', body })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { status: 'failed', detail: `Facebook: ${data?.error?.message || res.statusText}` }
  const externalId = data.post_id || data.id
  return { status: 'posted', external_id: externalId, detail: `Posted ${externalId}` }
}

// ───────────────────────────── Instagram ─────────────────────────────
async function publishInstagram(post: Post, target: Target, conn: Connection): Promise<AdapterOutcome> {
  if (!conn.live_enabled) return { status: 'draft_only', detail: 'Pending Meta App Review.' }
  const token = Deno.env.get('FACEBOOK_PAGE_TOKEN')
  const igUserId = Deno.env.get('IG_USER_ID') || conn.meta?.ig_user_id
  if (!token || !igUserId) return { status: 'failed', detail: 'Missing FACEBOOK_PAGE_TOKEN or IG_USER_ID secret.' }
  const imageUrl = (post.media_urls || []).find(isPublicHttpUrl)
  if (!imageUrl) return { status: 'failed', detail: 'Instagram requires a publicly accessible image URL in media_urls.' }
  const caption = target.platform_copy || post.body

  // 1. Create container
  const createRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
    method: 'POST',
    body: new URLSearchParams({ image_url: imageUrl, caption, access_token: token }),
  })
  const createData = await createRes.json().catch(() => ({}))
  if (!createRes.ok) return { status: 'failed', detail: `IG create: ${createData?.error?.message || createRes.statusText}` }
  const creationId = createData.id

  // 2. Poll container status (max ~30s)
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const statusRes = await fetch(`https://graph.facebook.com/v21.0/${creationId}?fields=status_code&access_token=${encodeURIComponent(token)}`)
    const statusData = await statusRes.json().catch(() => ({}))
    if (statusData.status_code === 'FINISHED') break
    if (statusData.status_code === 'ERROR') return { status: 'failed', detail: 'IG container processing failed.' }
  }

  // 3. Publish
  const pubRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
    method: 'POST',
    body: new URLSearchParams({ creation_id: creationId, access_token: token }),
  })
  const pubData = await pubRes.json().catch(() => ({}))
  if (!pubRes.ok) return { status: 'failed', detail: `IG publish: ${pubData?.error?.message || pubRes.statusText}` }
  return { status: 'posted', external_id: pubData.id, detail: `Posted ${pubData.id}` }
}

// ───────────────────────────── TikTok ─────────────────────────────
async function publishTikTok(post: Post, target: Target, conn: Connection): Promise<AdapterOutcome> {
  const token = Deno.env.get('TIKTOK_ACCESS_TOKEN')
  if (!token) return { status: 'failed', detail: 'Missing TIKTOK_ACCESS_TOKEN secret.' }
  const videoUrl = (post.media_urls || []).find(isPublicHttpUrl)
  if (!videoUrl) return { status: 'failed', detail: 'TikTok requires a publicly accessible video URL in media_urls.' }
  const caption = target.platform_copy || post.body

  // 1. creator_info query (required per post)
  const ciRes = await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const ciData = await ciRes.json().catch(() => ({}))
  if (!ciRes.ok) return { status: 'failed', detail: `TikTok creator_info: ${ciData?.error?.message || ciRes.statusText}` }
  const privacyOptions: string[] = ciData?.data?.privacy_level_options || []

  if (conn.live_enabled) {
    // Direct Post
    const privacy = privacyOptions.includes('PUBLIC_TO_EVERYONE') ? 'PUBLIC_TO_EVERYONE' : (privacyOptions[0] || 'SELF_ONLY')
    const res = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        post_info: { title: caption.slice(0, 2200), privacy_level: privacy, disable_comment: false, disable_duet: false, disable_stitch: false },
        source_info: { source: 'PULL_FROM_URL', video_url: videoUrl },
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { status: 'failed', detail: `TikTok direct post: ${data?.error?.message || res.statusText}` }
    return { status: 'posted', external_id: data?.data?.publish_id || null, detail: 'TikTok direct post initiated.' }
  }

  // Creator's Draft (MEDIA_UPLOAD) — lands in user's inbox
  const res = await fetch('https://open.tiktokapis.com/v2/post/publish/inbox/video/init/', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ source_info: { source: 'PULL_FROM_URL', video_url: videoUrl } }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { status: 'failed', detail: `TikTok inbox: ${data?.error?.message || res.statusText}` }
  return { status: 'draft_only', external_id: data?.data?.publish_id || null, detail: 'Sent to TikTok drafts.' }
}

// ───────────────────────────── Google Business Profile ─────────────────────────────
async function getGbpAccessToken(): Promise<string | null> {
  const clientId = Deno.env.get('GBP_CLIENT_ID')
  const clientSecret = Deno.env.get('GBP_CLIENT_SECRET')
  const refreshToken = Deno.env.get('GBP_REFRESH_TOKEN')
  if (!clientId || !clientSecret || !refreshToken) return null
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  })
  const data = await res.json().catch(() => ({}))
  return res.ok ? (data?.access_token || null) : null
}

async function publishGoogleBusiness(post: Post, target: Target, conn: Connection): Promise<AdapterOutcome> {
  if (!conn.live_enabled) return { status: 'draft_only', detail: 'Pending Google API access grant.' }
  const accountId = Deno.env.get('GBP_ACCOUNT_ID')
  const locationId = Deno.env.get('GBP_LOCATION_ID')
  if (!accountId || !locationId) return { status: 'failed', detail: 'Missing GBP_ACCOUNT_ID or GBP_LOCATION_ID secret.' }
  const access = await getGbpAccessToken()
  if (!access) return { status: 'failed', detail: 'Could not refresh Google access token.' }
  const summary = (target.platform_copy || post.body).slice(0, 1500)
  const res = await fetch(`https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ languageCode: 'en-US', summary, topicType: 'STANDARD' }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { status: 'failed', detail: `GBP: ${data?.error?.message || res.statusText}` }
  return { status: 'posted', external_id: data.name || null, detail: 'GBP local post created.' }
}

const ADAPTERS: Record<string, (p: Post, t: Target, c: Connection) => Promise<AdapterOutcome>> = {
  facebook: publishFacebook,
  instagram: publishInstagram,
  tiktok: publishTikTok,
  google_business: publishGoogleBusiness,
}

export async function publishOne(post_id: string, target_id: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const started = Date.now()

  const { data: target, error: tErr } = await supabase
    .from('crm_social_post_targets').select('*').eq('id', target_id).maybeSingle()
  if (tErr || !target) return { ok: false, error: 'target not found' }

  const { data: post } = await supabase
    .from('crm_social_posts').select('id,title,body,media_urls').eq('id', post_id).maybeSingle()
  if (!post) return { ok: false, error: 'post not found' }

  const { data: conn } = await supabase
    .from('crm_social_connections').select('*').eq('platform', target.platform).maybeSingle()

  async function writeOutcome(outcome: AdapterOutcome) {
    const patch: Record<string, unknown> = {
      status: outcome.status,
      error_message: outcome.status === 'failed' ? outcome.detail : null,
    }
    if (outcome.status === 'posted') {
      patch.posted_at = new Date().toISOString()
      patch.external_id = (outcome as any).external_id ?? null
    } else if (outcome.status === 'draft_only') {
      patch.external_id = (outcome as any).external_id ?? null
    }
    await supabase.from('crm_social_post_targets').update(patch).eq('id', target_id)

    try {
      await supabase.from('assistant_logs').insert({
        user_message: `[SOCIAL-PUBLISH] platform=${target.platform} post_id=${post_id} target_id=${target_id}`,
        assistant_response: `${outcome.status}: ${(outcome as any).detail || ''}`,
        duration_ms: Date.now() - started,
      })
    } catch (_e) {/* non-fatal */}
  }

  if (!conn || !conn.is_connected || conn.token_status !== 'valid') {
    const outcome: AdapterOutcome = { status: 'failed', detail: `Connection invalid for ${target.platform} (status=${conn?.token_status || 'none'}).` }
    await writeOutcome(outcome)
    return { ok: false, ...outcome }
  }

  const adapter = ADAPTERS[target.platform]
  if (!adapter) {
    const outcome: AdapterOutcome = { status: 'failed', detail: `No adapter for platform ${target.platform}` }
    await writeOutcome(outcome)
    return { ok: false, ...outcome }
  }

  let outcome: AdapterOutcome
  try {
    outcome = await adapter(post as Post, target as Target, conn as Connection)
  } catch (e) {
    outcome = { status: 'failed', detail: e instanceof Error ? e.message : String(e) }
  }
  await writeOutcome(outcome)
  return { ok: outcome.status !== 'failed', ...outcome }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { post_id, target_id } = await req.json()
    if (!post_id || !target_id) {
      return new Response(JSON.stringify({ error: 'post_id and target_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const result = await publishOne(post_id, target_id)
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('social-publish error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
