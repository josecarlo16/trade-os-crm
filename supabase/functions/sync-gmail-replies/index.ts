import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1'
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2.95.0/cors'

const GMAIL_CLIENT_ID = Deno.env.get('GMAIL_CLIENT_ID')!
const GMAIL_CLIENT_SECRET = Deno.env.get('GMAIL_CLIENT_SECRET')!
const GMAIL_REFRESH_TOKEN = Deno.env.get('GMAIL_REFRESH_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function getAccessToken(): Promise<string> {
  console.log('Attempting Gmail token refresh...', {
    hasClientId: !!GMAIL_CLIENT_ID,
    hasClientSecret: !!GMAIL_CLIENT_SECRET,
    hasRefreshToken: !!GMAIL_REFRESH_TOKEN,
    clientIdLength: GMAIL_CLIENT_ID?.length,
    refreshTokenLength: GMAIL_REFRESH_TOKEN?.length,
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) {
    console.error('Gmail token refresh failed:', JSON.stringify(data))
    throw new Error('Failed to refresh Gmail token: ' + (data.error_description || data.error || 'unknown'))
  }
  return data.access_token
}

function extractEmail(header: string): string {
  const match = header.match(/<([^>]+)>/)
  return match ? match[1] : header.trim()
}

function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  return atob(base64)
}

function getBody(payload: any): { html: string | null; text: string | null } {
  let html: string | null = null
  let text: string | null = null

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        html = decodeBase64Url(part.body.data)
      } else if (part.mimeType === 'text/plain' && part.body?.data) {
        text = decodeBase64Url(part.body.data)
      } else if (part.parts) {
        const nested = getBody(part)
        if (nested.html) html = nested.html
        if (nested.text) text = nested.text
      }
    }
  } else if (payload.body?.data) {
    if (payload.mimeType === 'text/html') {
      html = decodeBase64Url(payload.body.data)
    } else {
      text = decodeBase64Url(payload.body.data)
    }
  }
  return { html, text }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const accessToken = await getAccessToken()

    // Get last sync timestamp from integration_configs
    const { data: configData } = await supabase
      .from('integration_configs')
      .select('config_value')
      .eq('config_key', 'gmail_last_sync')
      .single()

    const lastSyncEpoch = configData?.config_value
      ? parseInt(configData.config_value as string)
      : Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000) // default: 24h ago

    // Search Gmail for messages to bach@truficient.com after last sync
    const query = `to:bach@truficient.com after:${lastSyncEpoch}`
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const listData = await listRes.json()

    if (!listData.messages || listData.messages.length === 0) {
      // Update sync timestamp
      await supabase.from('integration_configs').upsert({
        config_key: 'gmail_last_sync',
        config_value: String(Math.floor(Date.now() / 1000)),
      }, { onConflict: 'config_key' })

      return new Response(JSON.stringify({ synced: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let synced = 0

    for (const msg of listData.messages) {
      // Check if already synced
      const { data: existing } = await supabase
        .from('crm_email_log')
        .select('id')
        .eq('gmail_message_id', msg.id)
        .maybeSingle()

      if (existing) continue

      // Fetch full message
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const msgData = await msgRes.json()

      const headers = msgData.payload?.headers || []
      const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || ''
      const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || ''
      const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || ''

      const fromEmail = extractEmail(fromHeader)
      
      // Skip emails FROM bach (outbound)
      if (fromEmail.toLowerCase() === 'bach@truficient.com') continue

      const { html, text } = getBody(msgData.payload)

      // Match to customer
      const { data: customer } = await supabase
        .from('crm_customers')
        .select('id')
        .eq('email', fromEmail.toLowerCase())
        .maybeSingle()

      const { error: insertError } = await supabase.from('crm_email_log').insert({
        customer_id: customer?.id || null,
        direction: 'inbound',
        subject: subjectHeader,
        body_html: html,
        body_text: text,
        from_email: fromEmail,
        to_email: 'bach@truficient.com',
        status: 'received',
        gmail_message_id: msg.id,
        gmail_thread_id: msgData.threadId,
        is_read: false,
        received_at: dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString(),
      })

      if (insertError) {
        console.error('Insert error:', insertError)
        continue
      }

      // Log interaction
      if (customer?.id) {
        await supabase.from('crm_interactions').insert({
          customer_id: customer.id,
          interaction_type: 'email',
          direction: 'inbound',
          subject: subjectHeader,
          content: text?.substring(0, 500) || html?.replace(/<[^>]*>/g, '').substring(0, 500) || '',
        })
      }

      synced++
    }

    // Update sync timestamp
    await supabase.from('integration_configs').upsert({
      config_key: 'gmail_last_sync',
      config_value: String(Math.floor(Date.now() / 1000)),
    }, { onConflict: 'config_key' })

    return new Response(JSON.stringify({ synced }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Gmail sync error:', error)
    return new Response(JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
