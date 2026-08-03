import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1'
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2.95.0/cors'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, cc, subject, bodyHtml, bodyText, customerId, templateId } = await req.json()

    if (!to || !subject || (!bodyHtml && !bodyText)) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, and bodyHtml or bodyText' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build Resend payload
    const resendPayload: Record<string, unknown> = {
      from: 'Truficient <bach@truficient.com>',
      to: [to],
      subject,
      html: bodyHtml || undefined,
      text: bodyText || undefined,
    }

    // Add CC if provided
    const ccList = Array.isArray(cc) ? cc.filter(Boolean) : []
    if (ccList.length > 0) {
      resendPayload.cc = ccList
    }

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(resendPayload),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      console.error('Resend error:', resendData)
      return new Response(JSON.stringify({ error: 'Failed to send email', details: resendData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Log to database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { error: logError } = await supabase.from('crm_email_log').insert({
      customer_id: customerId || null,
      direction: 'outbound',
      subject,
      body_html: bodyHtml || null,
      body_text: bodyText || null,
      from_email: 'bach@truficient.com',
      to_email: to,
      cc_emails: ccList.length > 0 ? ccList.join(', ') : null,
      template_id: templateId || null,
      status: 'sent',
      resend_message_id: resendData.id,
      sent_at: new Date().toISOString(),
    })

    if (logError) console.error('Log error:', logError)

    // Also log to crm_interactions if customer linked
    if (customerId) {
      await supabase.from('crm_interactions').insert({
        customer_id: customerId,
        interaction_type: 'email',
        direction: 'outbound',
        subject,
        content: bodyText || bodyHtml?.replace(/<[^>]*>/g, '').substring(0, 500) || '',
      })
    }

    return new Response(JSON.stringify({ success: true, messageId: resendData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Send email error:', error)
    return new Response(JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
