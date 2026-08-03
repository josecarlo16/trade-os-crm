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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify webhook signature (if configured)
    const signature = req.headers.get('x-workedge-signature');
    const { data: config } = await supabase
      .from('integration_configs')
      .select('config')
      .eq('integration_name', 'workedge')
      .single();

    const webhookSecret = config?.config?.webhook_secret;
    if (webhookSecret && signature) {
      // TODO: Implement signature verification using HMAC
      // For now, we'll trust the webhook if the secret is set
    }

  const payload: WorkEdgeWebhookPayload = await req.json();
    const { event, timestamp, data } = payload;
    const project_id = data.project_id;

    console.log(`Received WorkEdge webhook: ${event} for project ${project_id}`);

    // Find the job linked to this WorkEdge project
    const { data: job, error: jobError } = await supabase
      .from('crm_jobs')
      .select('id, title, job_number')
      .eq('workedge_project_id', project_id)
      .single();

    if (jobError || !job) {
      console.log(`No job found for WorkEdge project ${project_id}`);
      return new Response(
        JSON.stringify({ received: true, job_found: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the incoming webhook
    await supabase.from('workedge_sync_log').insert({
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
          .eq('id', job.id);

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
          .eq('id', job.id);
        break;
      }

      case 'report.generated': {
        // Store report as a document media type
        await supabase.from('workedge_project_media').insert({
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
