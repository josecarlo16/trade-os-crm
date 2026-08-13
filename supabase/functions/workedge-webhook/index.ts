import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-workedge-signature',
};

interface WorkEdgeWebhookPayload {
  event: 'project.updated' | 'photo.uploaded' | 'video.uploaded' | 'note.added' | 'report.generated';
  timestamp: string;
  data: {
    id: string;
    project_id: string;
    file_path?: string;
    caption?: string;
    url?: string;
    thumbnail_url?: string;
    title?: string;
    filename?: string;
    description?: string;
    content?: string;
    transcription?: string;
    captured_by?: string;
    author?: string;
    captured_at?: string;
    status?: string;
  };
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// There is no logged-in user on an inbound webhook from WorkEdge, so the
// tenant can't be resolved from a JWT the way workedge-sync does it. Instead
// each tenant's WorkEdge connection has its own webhook_secret (stored in
// integration_configs.config), and we identify which tenant sent this
// request by finding the one whose secret's HMAC matches the signature —
// the same pattern used by Stripe Connect for multi-account webhooks.
async function resolveTenantFromSignature(
  supabase: any,
  rawBody: string,
  signatureHeader: string | null,
): Promise<string> {
  if (!signatureHeader) throw new Error('Missing x-workedge-signature header');
  const signature = signatureHeader.replace(/^sha256=/i, '').trim();

  const { data: configs, error } = await supabase
    .from('integration_configs')
    .select('tenant_id, config')
    .eq('integration_name', 'workedge')
    .eq('is_active', true);

  if (error) throw error;

  for (const cfg of configs || []) {
    const secret = cfg.config?.webhook_secret;
    if (!secret) continue;
    const expected = await hmacSha256Hex(secret, rawBody);
    if (constantTimeEqual(expected, signature)) {
      return cfg.tenant_id;
    }
  }

  throw new Error('Signature did not match any configured tenant');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const rawBody = await req.text();
    const signature = req.headers.get('x-workedge-signature');

    let tenantId: string;
    try {
      tenantId = await resolveTenantFromSignature(supabase, rawBody, signature);
    } catch (authErr: any) {
      console.error('WorkEdge webhook rejected:', authErr.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: WorkEdgeWebhookPayload = JSON.parse(rawBody);
    const { event, timestamp, data } = payload;
    const project_id = data.project_id;

    console.log(`Received WorkEdge webhook: ${event} for project ${project_id} (tenant ${tenantId})`);

    // Find the job linked to this WorkEdge project, scoped to the tenant the
    // signature identified — never search across tenants.
    const { data: job, error: jobError } = await supabase
      .from('crm_jobs')
      .select('id, title, job_number')
      .eq('workedge_project_id', project_id)
      .eq('tenant_id', tenantId)
      .single();

    if (jobError || !job) {
      console.log(`No job found for WorkEdge project ${project_id} under tenant ${tenantId}`);
      return new Response(
        JSON.stringify({ received: true, job_found: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the incoming webhook
    await supabase.from('workedge_sync_log').insert({
      tenant_id: tenantId,
      entity_type: event.includes('photo') || event.includes('video') || event.includes('note') ? 'media' : 'project',
      local_id: job.id,
      workedge_id: project_id,
      sync_direction: 'pull',
      sync_status: 'success',
      request_payload: payload
    });

    switch (event) {
      case 'photo.uploaded':
      case 'video.uploaded':
      case 'note.added': {
        // Insert new media record
        const mediaType = event === 'photo.uploaded' ? 'photo' :
                         event === 'video.uploaded' ? 'video' : 'note';

        await supabase.from('workedge_project_media').insert({
          tenant_id: tenantId,
          job_id: job.id,
          workedge_project_id: project_id,
          media_type: mediaType,
          media_url: data.url,
          thumbnail_url: data.thumbnail_url,
          title: data.title || data.filename,
          description: data.description || data.content,
          transcription: data.transcription,
          captured_by: data.captured_by || data.author,
          captured_at: data.captured_at || timestamp
        });

        // Update job last sync
        await supabase
          .from('crm_jobs')
          .update({ workedge_last_sync: new Date().toISOString() })
          .eq('id', job.id)
          .eq('tenant_id', tenantId);

        console.log(`Added ${mediaType} to job ${job.job_number}`);
        break;
      }

      case 'project.updated': {
        // Update job with any relevant changes
        if (data.status) {
          // Could map WorkEdge status to job stage if needed
          console.log(`WorkEdge project status updated to: ${data.status}`);
        }

        await supabase
          .from('crm_jobs')
          .update({ workedge_last_sync: new Date().toISOString() })
          .eq('id', job.id)
          .eq('tenant_id', tenantId);
        break;
      }

      case 'report.generated': {
        // Store report as a document media type
        await supabase.from('workedge_project_media').insert({
          tenant_id: tenantId,
          job_id: job.id,
          workedge_project_id: project_id,
          media_type: 'document',
          media_url: data.url,
          title: data.title || 'Field Report',
          description: `Generated on ${timestamp}`,
          captured_at: timestamp
        });

        console.log(`Report added to job ${job.job_number}`);
        break;
      }
    }

    return new Response(
      JSON.stringify({
        received: true,
        job_found: true,
        job_number: job.job_number
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WorkEdge webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
