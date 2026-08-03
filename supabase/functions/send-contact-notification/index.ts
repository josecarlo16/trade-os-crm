// Sends contact form notification emails using editable templates from
// crm_email_templates (Email Settings → Templates).
//
// Looks up active templates by trigger_event:
//   - contact_form_internal_alert  → Internal team notification
//   - contact_form_customer_ack    → Customer acknowledgement
//
// Falls back gracefully (skips that send) if a template is missing/inactive.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FROM = 'Truficient <bach@truficient.com>';
const REPLY_TO = 'info@truficient.com';

interface Payload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  serviceType: string;
  message: string;
  source?: string;
}

const escape = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Replace {{merge_tag}} occurrences. HTML values are escaped; the template HTML itself is trusted.
const renderMergeTags = (template: string, vars: Record<string, string>) => {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined || v === null ? '' : escape(v);
  });
};

// Strip HTML for plain-text fallback
const htmlToText = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const sendEmail = async (payload: Record<string, unknown>) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('Resend error:', data);
    throw new Error(data?.message || 'Resend send failed');
  }
  return data;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload;

    if (!body.firstName || !body.lastName) {
      return new Response(JSON.stringify({ error: 'Missing required fields: firstName, lastName' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Detect placeholder/empty emails — we still send the internal alert,
    // but skip the customer acknowledgement (no real inbox to reach).
    const hasRealEmail =
      !!body.email &&
      body.email.includes('@') &&
      !body.email.startsWith('noemail+') &&
      !body.email.endsWith('@truficient.com');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const submittedCST = new Date().toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const vars: Record<string, string> = {
      first_name: body.firstName,
      last_name: body.lastName,
      full_name: `${body.firstName} ${body.lastName}`.trim(),
      email: hasRealEmail ? body.email : '(not provided)',
      phone: body.phone,
      service_type: body.serviceType,
      message: body.message,
      source: body.source || 'Website Contact Page',
      submitted_at: submittedCST,
    };

    // Fetch both templates in one query
    const { data: templates, error: tplErr } = await supabase
      .from('crm_email_templates')
      .select('trigger_event, subject, body_html, cc_emails, is_active')
      .in('trigger_event', ['contact_form_internal_alert', 'contact_form_customer_ack'])
      .eq('is_active', true);

    if (tplErr) {
      console.error('Template lookup error:', tplErr);
      throw new Error('Failed to load email templates');
    }

    const internalTpl = templates?.find((t) => t.trigger_event === 'contact_form_internal_alert');
    const customerTpl = templates?.find((t) => t.trigger_event === 'contact_form_customer_ack');

    const sends: Promise<unknown>[] = [];
    const labels: string[] = [];

    // ---------- INTERNAL ALERT ----------
    if (internalTpl) {
      const subject = renderMergeTags(internalTpl.subject || '', vars);
      const html = renderMergeTags(internalTpl.body_html || '', vars);
      const ccList = (internalTpl.cc_emails || '')
        .split(',')
        .map((e: string) => e.trim())
        .filter(Boolean);

      // First CC becomes the primary "to" if no explicit list — else use all as recipients
      const recipients = ccList.length > 0 ? ccList : ['info@truficient.com'];

      sends.push(
        sendEmail({
          from: FROM,
          to: recipients,
          reply_to: hasRealEmail ? body.email : REPLY_TO,
          subject,
          html,
          text: htmlToText(html),
        }),
      );
      labels.push('internal');
    } else {
      console.warn('No active template found for contact_form_internal_alert');
    }

    // ---------- CUSTOMER ACK ----------
    if (customerTpl && hasRealEmail) {
      const subject = renderMergeTags(customerTpl.subject || '', vars);
      const html = renderMergeTags(customerTpl.body_html || '', vars);
      const ccList = (customerTpl.cc_emails || '')
        .split(',')
        .map((e: string) => e.trim())
        .filter(Boolean);

      sends.push(
        sendEmail({
          from: FROM,
          to: [body.email],
          cc: ccList.length > 0 ? ccList : undefined,
          reply_to: REPLY_TO,
          subject,
          html,
          text: htmlToText(html),
        }),
      );
      labels.push('customer');
    } else {
      console.warn('No active template found for contact_form_customer_ack');
    }

    const results = await Promise.allSettled(sends);
    const result: Record<string, unknown> = {};
    results.forEach((r, i) => {
      result[labels[i]] =
        r.status === 'fulfilled'
          ? { ok: true, id: (r.value as { id?: string }).id }
          : { ok: false, error: String(r.reason) };
    });

    console.log('Contact notification result:', JSON.stringify(result));

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-contact-notification error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
