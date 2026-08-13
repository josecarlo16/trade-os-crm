import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to extract items from various API response structures
function extractItems(response: any): any[] {
  if (!response || typeof response !== 'object') return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.photos)) return response.photos;
  if (Array.isArray(response.media)) return response.media;
  if (Array.isArray(response.notes)) return response.notes;
  if (Array.isArray(response.videos)) return response.videos;
  if (Array.isArray(response.files)) return response.files;
  if (Array.isArray(response.data)) return response.data;
  if (response.data && Array.isArray(response.data.items)) return response.data.items;
  if (response.data && Array.isArray(response.data.photos)) return response.data.photos;
  if (response.data && Array.isArray(response.data.media)) return response.data.media;
  return [];
}

interface WorkEdgeSyncRequest {
  action: 'create-project' | 'sync-customer' | 'get-project-media' | 'get-equipment' | 'create-service-record' | 'list-projects' | 'link-project' | 'unlink-project' | 'create-property' | 'daily-sync';
  jobId?: string;
  customerId?: string;
  locationId?: string;
  workedgeProjectId?: string;
  searchQuery?: string;
}

// Truficient's WorkEdge connection currently lives in env secrets from
// before multi-tenancy existed. Only THAT specific tenant may fall back to
// them — any other tenant without its own config.config.api_key must
// configure their own WorkEdge account, never silently inherit
// Truficient's (that would push their customer data into Truficient's
// actual WorkEdge business).
const TRUFICIENT_TENANT_ID = 'cb75a3f3-f310-4587-a4cc-098f50aef59c';

// WorkEdge → CRM stage name mapping
const WE_STATUS_TO_STAGE: Record<string, string> = {
  scheduled: 'Estimate Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  invoiced: 'Invoiced',
  cancelled: 'Cancelled',
};

// Resolves the calling user's tenant from their JWT (forwarded automatically
// by supabase.functions.invoke). This function has verify_jwt = false so it
// can log its own error responses, but every tenant-scoped action below
// still requires a valid, resolvable tenant — there is no anonymous path.
async function resolveTenantId(req: Request, supabaseAdmin: any): Promise<string> {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Missing Authorization token');

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) throw new Error('Invalid or expired token');

  const { data: roleRow, error: roleError } = await supabaseAdmin
    .from('user_roles')
    .select('tenant_id')
    .eq('user_id', userData.user.id)
    .not('tenant_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (roleError || !roleRow?.tenant_id) throw new Error('User has no tenant assigned');
  return roleRow.tenant_id;
}

// === Daily Sync Logic (runs once per tenant that has WorkEdge configured) ===
async function executeDailySync(supabase: any, tenantId: string, apiUrl: string, apiKey: string): Promise<any> {
  const startTime = Date.now();
  const errors: any[] = [];
  let jobsCreated = 0;
  let jobsUpdated = 0;
  let attachmentsSynced = 0;

  // Yesterday boundaries (UTC for API query)
  const yesterday = new Date(Date.now() - 86400000);
  const yesterdayStart = yesterday.toISOString().split('T')[0] + 'T00:00:00Z';

  try {
    // --- 1) Fetch projects from WorkEdge updated since yesterday ---
    let weProjects: any[] = [];
    try {
      const res = await fetch(`${apiUrl}/api-projects?updated_after=${encodeURIComponent(yesterdayStart)}`, {
        headers: { 'x-api-key': apiKey },
      });
      if (res.ok) {
        const data = await res.json();
        weProjects = extractItems(data);
        console.log(`WorkEdge daily sync: ${weProjects.length} projects updated since ${yesterdayStart}`);
      } else {
        const errText = await res.text();
        errors.push({ step: 'fetch_projects', status: res.status, message: errText });
        console.error(`WorkEdge fetch projects failed: ${res.status}`);
      }
    } catch (e: any) {
      errors.push({ step: 'fetch_projects', message: e.message });
    }

    // --- 2) Get default job type for imported jobs ---
    const { data: defaultJobType } = await supabase
      .from('crm_job_types')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(1)
      .single();

    const defaultJobTypeId = defaultJobType?.id;

    // --- 3) Process each project ---
    for (const proj of weProjects) {
      const weId = String(proj.id || proj.project_id || '');
      if (!weId) continue;

      try {
        // Check if this project already exists in CRM
        const { data: existingJob } = await supabase
          .from('crm_jobs')
          .select('id, current_stage_id, crm_job_stages!crm_jobs_current_stage_id_fkey(name)')
          .eq('tenant_id', tenantId)
          .eq('workedge_project_id', weId)
          .is('deleted_at', null)
          .maybeSingle();

        const weStatus = (proj.status || '').toLowerCase();
        const targetStageName = WE_STATUS_TO_STAGE[weStatus];

        if (existingJob) {
          // --- Job exists: check for status update ---
          if (targetStageName) {
            const currentStageName = existingJob.crm_job_stages?.name;
            if (currentStageName !== targetStageName) {
              // Look up the target stage ID
              const { data: targetStage } = await supabase
                .from('crm_job_stages')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('name', targetStageName)
                .eq('is_active', true)
                .limit(1)
                .maybeSingle();

              if (targetStage) {
                await supabase
                  .from('crm_jobs')
                  .update({
                    current_stage_id: targetStage.id,
                    workedge_last_sync: new Date().toISOString(),
                  })
                  .eq('id', existingJob.id)
                  .eq('tenant_id', tenantId);

                // Log stage history
                await supabase
                  .from('crm_job_stage_history')
                  .insert({
                    tenant_id: tenantId,
                    job_id: existingJob.id,
                    from_stage_id: existingJob.current_stage_id,
                    to_stage_id: targetStage.id,
                    notes: `Auto-synced from WorkEdge (status: ${weStatus})`,
                  });

                jobsUpdated++;
              }
            }
          }
        } else {
          // --- New project: create CRM job ---
          // Try to find linked customer by matching name or WorkEdge customer ref
          let customerId: string | null = null;
          const clientName = proj.client_name || proj.customer_name || '';
          if (clientName) {
            const nameParts = clientName.trim().split(/\s+/);
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            const { data: matchedCustomer } = await supabase
              .from('crm_customers')
              .select('id')
              .eq('tenant_id', tenantId)
              .or(`first_name.ilike.${firstName},last_name.ilike.${lastName}`)
              .is('deleted_at', null)
              .limit(1)
              .maybeSingle();

            customerId = matchedCustomer?.id || null;
          }

          if (!customerId || !defaultJobTypeId) {
            // Can't create a job without a customer and job type — log and skip
            errors.push({
              step: 'create_job',
              workedge_id: weId,
              message: !customerId ? 'No matching customer found' : 'No default job type',
              project_name: proj.name,
            });
            continue;
          }

          // Look up initial stage
          let initialStageId: string | null = null;
          if (targetStageName) {
            const { data: stage } = await supabase
              .from('crm_job_stages')
              .select('id')
              .eq('tenant_id', tenantId)
              .eq('name', targetStageName)
              .eq('is_active', true)
              .limit(1)
              .maybeSingle();
            initialStageId = stage?.id || null;
          }

          const { data: newJob, error: jobErr } = await supabase
            .from('crm_jobs')
            .insert({
              tenant_id: tenantId,
              title: proj.name || `WorkEdge Import - ${weId}`,
              customer_id: customerId,
              job_type_id: defaultJobTypeId,
              current_stage_id: initialStageId,
              workedge_project_id: weId,
              workedge_last_sync: new Date().toISOString(),
              internal_notes: `Imported from WorkEdge daily sync. Original status: ${weStatus || 'unknown'}`,
            })
            .select('id, job_number')
            .single();

          if (jobErr) {
            errors.push({ step: 'create_job', workedge_id: weId, message: jobErr.message });
          } else {
            jobsCreated++;

            // Log system interaction on the customer
            await supabase
              .from('crm_interactions')
              .insert({
                tenant_id: tenantId,
                customer_id: customerId,
                interaction_type: 'system_workedge_import',
                direction: null,
                subject: `WorkEdge project imported as ${newJob.job_number}`,
                content: `Project "${proj.name}" (WorkEdge ID: ${weId}) automatically imported during daily sync.`,
              });

            // Log initial stage history
            if (initialStageId) {
              await supabase.from('crm_job_stage_history').insert({
                tenant_id: tenantId,
                job_id: newJob.id,
                to_stage_id: initialStageId,
                notes: 'Initial stage from WorkEdge import',
              });
            }
          }
        }

        // --- 4) Sync attachments for this project ---
        try {
          const jobId = existingJob?.id;
          if (jobId) {
            const attRes = await fetch(`${apiUrl}/api-projects/${weId}/media`, {
              headers: { 'x-api-key': apiKey },
            });
            if (attRes.ok) {
              const attData = await attRes.json();
              const attachments = extractItems(attData);

              for (const att of attachments) {
                const attUrl = att.url || att.media_url || att.file_url || att.src || '';
                const attTitle = att.title || att.name || att.filename || '';
                const attDesc = att.description || att.caption || att.content || att.notes || '';

                if (!attUrl && !attDesc) continue;

                // Check for duplicate by URL in interaction content
                const { data: job } = await supabase
                  .from('crm_jobs')
                  .select('customer_id, job_number')
                  .eq('id', jobId)
                  .eq('tenant_id', tenantId)
                  .single();

                if (attUrl && job?.customer_id) {
                  const { data: existing } = await supabase
                    .from('crm_interactions')
                    .select('id')
                    .eq('customer_id', job.customer_id)
                    .ilike('content', `%${attUrl}%`)
                    .limit(1)
                    .maybeSingle();

                  if (existing) continue;
                }

                if (job?.customer_id) {
                  await supabase.from('crm_interactions').insert({
                    tenant_id: tenantId,
                    customer_id: job.customer_id,
                    interaction_type: 'note',
                    direction: null,
                    subject: `WorkEdge attachment: ${attTitle || 'Media'}`,
                    content: [attDesc, attUrl ? `URL: ${attUrl}` : ''].filter(Boolean).join('\n'),
                  });
                  attachmentsSynced++;
                }
              }
            }
          }
        } catch (attErr: any) {
          errors.push({ step: 'sync_attachments', workedge_id: weId, message: attErr.message });
        }
      } catch (projErr: any) {
        errors.push({ step: 'process_project', workedge_id: weId, message: projErr.message });
      }
    }
  } catch (topErr: any) {
    errors.push({ step: 'top_level', message: topErr.message });
  }

  const durationMs = Date.now() - startTime;
  const status = errors.length === 0 ? 'success' : (jobsCreated + jobsUpdated + attachmentsSynced > 0 ? 'partial' : 'failed');

  // Write to daily sync log
  await supabase.from('workedge_daily_sync_log').insert({
    tenant_id: tenantId,
    jobs_created: jobsCreated,
    jobs_updated: jobsUpdated,
    attachments_synced: attachmentsSynced,
    errors: errors.length > 0 ? errors : null,
    duration_ms: durationMs,
    status,
  });

  // Also update integration config last sync
  await supabase
    .from('integration_configs')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('integration_name', 'workedge');

  return { success: true, status, jobs_created: jobsCreated, jobs_updated: jobsUpdated, attachments_synced: attachmentsSynced, errors: errors.length, duration_ms: durationMs };
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

    const body: WorkEdgeSyncRequest = await req.json();
    const { action, jobId, customerId, locationId, workedgeProjectId } = body;

    // daily-sync is meant to run on a schedule with no calling user — it
    // fans out across every tenant that has an active WorkEdge connection,
    // instead of assuming a single global config. Every other action is
    // triggered by a signed-in user and is scoped to that user's own tenant.
    if (action === 'daily-sync') {
      const { data: activeConfigs, error: configsError } = await supabase
        .from('integration_configs')
        .select('tenant_id, config')
        .eq('integration_name', 'workedge')
        .eq('is_active', true);

      if (configsError) throw configsError;

      const globalFallbackKey = Deno.env.get('WORKEDGE_API_KEY');
      const results = [];
      for (const cfg of activeConfigs || []) {
        const apiKey = cfg.config?.api_key ||
          (cfg.tenant_id === TRUFICIENT_TENANT_ID ? globalFallbackKey : undefined);
        if (!apiKey) {
          results.push({ tenant_id: cfg.tenant_id, error: 'No WorkEdge API key configured for this tenant' });
          continue;
        }
        const apiUrl = cfg.config?.api_url || 'https://api.workedge.pro';
        try {
          const tenantResult = await executeDailySync(supabase, cfg.tenant_id, apiUrl, apiKey);
          results.push({ tenant_id: cfg.tenant_id, ...tenantResult });
        } catch (e: any) {
          results.push({ tenant_id: cfg.tenant_id, error: e.message });
        }
      }

      return new Response(
        JSON.stringify({ success: true, tenants_synced: results.length, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenantId = await resolveTenantId(req, supabase);

    // Get this tenant's WorkEdge API configuration
    const { data: config, error: configError } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('integration_name', 'workedge')
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: 'WorkEdge integration not configured for this account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!config.is_active) {
      return new Response(
        JSON.stringify({ error: 'WorkEdge integration is disabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const WORKEDGE_API_KEY = config.config?.api_key ||
      (tenantId === TRUFICIENT_TENANT_ID ? Deno.env.get('WORKEDGE_API_KEY') : undefined);
    if (!WORKEDGE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'No WorkEdge API key configured for this account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiUrl = config.config?.api_url || 'https://api.workedge.pro';
    let result: any = null;

    // Log the sync attempt
    const logEntry = {
      tenant_id: tenantId,
      entity_type: action.includes('project') ? 'project' : action.includes('customer') ? 'customer' : 'equipment',
      local_id: jobId || customerId || locationId,
      sync_direction: action.startsWith('get') ? 'pull' : 'push',
      sync_status: 'pending',
      request_payload: body
    };

    const { data: logData } = await supabase
      .from('workedge_sync_log')
      .insert(logEntry)
      .select()
      .single();

    try {
      switch (action) {
        case 'create-project': {
          if (!jobId) throw new Error('jobId is required');

          // Fetch job details
          const { data: job, error: jobError } = await supabase
            .from('crm_jobs')
            .select(`
              *,
              customer:crm_customers(*),
              location:crm_locations(*),
              job_type:crm_job_types(*)
            `)
            .eq('id', jobId)
            .eq('tenant_id', tenantId)
            .single();

          if (jobError || !job) throw new Error('Job not found');

          // Create project in WorkEdge
          const projectPayload = {
            name: `${job.job_number} - ${job.title}`,
            client_name: job.customer?.company_name || 
                         `${job.customer?.first_name} ${job.customer?.last_name}`.trim(),
            property_address: [
              job.location?.address_line1,
              job.location?.city,
              job.location?.state,
              job.location?.zip_code
            ].filter(Boolean).join(', '),
            project_type: job.job_type?.name?.toLowerCase() || 'service'
          };

          const response = await fetch(`${apiUrl}/api-projects`, {
            method: 'POST',
            headers: {
              'x-api-key': WORKEDGE_API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(projectPayload)
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`WorkEdge API error: ${response.status} ${errorText}`);
          }

          const projectData = await response.json();

          // Update job with WorkEdge project ID
          await supabase
            .from('crm_jobs')
            .update({
              workedge_project_id: projectData.id,
              workedge_last_sync: new Date().toISOString()
            })
            .eq('id', jobId)
            .eq('tenant_id', tenantId);

          result = { success: true, workedge_project_id: projectData.id };
          break;
        }

        case 'sync-customer': {
          if (!customerId) throw new Error('customerId is required');

          const { data: customer, error: customerError } = await supabase
            .from('crm_customers')
            .select('*')
            .eq('id', customerId)
            .eq('tenant_id', tenantId)
            .single();

          if (customerError || !customer) throw new Error('Customer not found');

          const addressParts = [
            customer.billing_address,
            customer.billing_city,
            customer.billing_state,
            customer.billing_zip
          ].filter(Boolean);

          const customerPayload = {
            name: customer.company_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
            email: customer.email,
            phone: customer.phone,
            company: customer.company_name || null,
            address: addressParts.length > 0 ? addressParts.join(', ') : null,
            contact_type: customer.customer_type === 'commercial' ? 'business' : 'homeowner'
          };

          const response = await fetch(`${apiUrl}/api-customers`, {
            method: 'POST',
            headers: {
              'x-api-key': WORKEDGE_API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(customerPayload)
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`WorkEdge API error: ${response.status} ${errorText}`);
          }

          const customerData = await response.json();
          const weCustomerId = customerData?.customer?.id || customerData?.id;

          await supabase
            .from('crm_customers')
            .update({ workedge_customer_id: weCustomerId })
            .eq('id', customerId)
            .eq('tenant_id', tenantId);

          result = { success: true, workedge_customer_id: weCustomerId };
          break;
        }

        case 'create-property': {
          if (!locationId) throw new Error('locationId is required');

          const { data: location, error: locationError } = await supabase
            .from('crm_locations')
            .select('*, customer:crm_customers(*)')
            .eq('id', locationId)
            .eq('tenant_id', tenantId)
            .single();

          if (locationError || !location) throw new Error('Location not found');

          const customerName = location.customer?.company_name || 
            `${location.customer?.first_name || ''} ${location.customer?.last_name || ''}`.trim();

          const propertyName = location.location_name || `${customerName} - ${location.address_line1}`;
          const propertyAddress = `${location.address_line1}, ${location.city}, ${location.state} ${location.zip_code}`;
          
          const descParts: string[] = [];
          if (location.square_footage) descParts.push(`Sq ft: ${location.square_footage}`);
          if (location.year_built) descParts.push(`Year built: ${location.year_built}`);
          if (location.stories) descParts.push(`Stories: ${location.stories}`);
          if (location.gate_code) descParts.push(`Gate: ${location.gate_code}`);
          if (location.access_notes) descParts.push(`Access: ${location.access_notes}`);

          const propertyPayload = {
            name: propertyName,
            address: propertyAddress,
            property_type: location.location_type || 'residential',
            description: descParts.length > 0 ? descParts.join(' | ') : null
          };

          const response = await fetch(`${apiUrl}/api-properties`, {
            method: 'POST',
            headers: {
              'x-api-key': WORKEDGE_API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(propertyPayload)
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`WorkEdge API error: ${response.status} ${errorText}`);
          }

          const propertyData = await response.json();
          const wePropertyId = propertyData?.property?.id || propertyData?.id;

          await supabase
            .from('crm_locations')
            .update({ workedge_property_id: wePropertyId })
            .eq('id', locationId)
            .eq('tenant_id', tenantId);

          result = { success: true, workedge_property_id: wePropertyId };
          break;
        }

        case 'get-project-media': {
          if (!workedgeProjectId || !jobId) throw new Error('workedgeProjectId and jobId are required');

          const { data: mediaJob, error: mediaJobError } = await supabase
            .from('crm_jobs')
            .select('id')
            .eq('id', jobId)
            .eq('tenant_id', tenantId)
            .single();
          if (mediaJobError || !mediaJob) throw new Error('Job not found');

          const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

          const endpoints = [
            { path: 'media', defaultType: 'photo' },
            { path: 'videos', defaultType: 'video' },
            { path: 'notes', defaultType: 'note' },
            { path: 'files', defaultType: 'document' },
          ];

          const fetchEndpoint = async (ep: { path: string; defaultType: string }) => {
            try {
              const res = await fetch(`${apiUrl}/api-projects/${workedgeProjectId}/${ep.path}`, {
                method: 'GET',
                headers: { 'x-api-key': WORKEDGE_API_KEY }
              });
              if (!res.ok) {
                console.log(`WorkEdge /${ep.path} returned ${res.status}, skipping`);
                return [];
              }
              const data = await res.json();
              const items = extractItems(data);
              console.log(`WorkEdge /${ep.path}: ${items.length} items`);
              return items.map((item: any) => ({ ...item, _defaultType: ep.defaultType }));
            } catch (e: any) {
              console.log(`WorkEdge /${ep.path} fetch error: ${e.message}`);
              return [];
            }
          };

          const allItems = (await Promise.all(endpoints.map(fetchEndpoint))).flat();
          console.log(`Total items from all endpoints: ${allItems.length}`);

          // Helper: download from signed URL and re-upload to local storage
          const reUploadMedia = async (signedUrl: string, mediaType: string, itemIndex: number): Promise<string> => {
            try {
              const response = await fetch(signedUrl);
              if (!response.ok) {
                console.log(`Failed to download media ${itemIndex}: ${response.status}`);
                return signedUrl; // fallback to original
              }
              const blob = await response.blob();
              const contentType = response.headers.get('content-type') || 'image/jpeg';
              const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : contentType.includes('mp4') ? 'mp4' : 'jpg';
              const filePath = `${workedgeProjectId}/${mediaType}_${itemIndex}_${Date.now()}.${ext}`;

              const { error: uploadError } = await supabase.storage
                .from('workedge-media')
                .upload(filePath, blob, { contentType, upsert: true });

              if (uploadError) {
                console.log(`Upload failed for ${itemIndex}: ${uploadError.message}`);
                return signedUrl; // fallback
              }

              const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/workedge-media/${filePath}`;
              return publicUrl;
            } catch (e: any) {
              console.log(`Re-upload error for ${itemIndex}: ${e.message}`);
              return signedUrl; // fallback
            }
          };

          const mediaRecords = allItems.map((item: any) => ({
            tenant_id: tenantId,
            job_id: jobId,
            workedge_project_id: workedgeProjectId,
            media_type: item.type || item.media_type || item.file_type || item._defaultType,
            media_url: item.url || item.media_url || item.file_url || item.src || (item._defaultType === 'note' ? 'note://' + (item.id || 'no-id') : null),
            thumbnail_url: item.thumbnail_url || item.thumb_url || item.thumbnail || item.preview_url,
            title: item.title || item.name || item.filename || item.file_name,
            description: item.description || item.caption || item.content || item.notes || item.body || item.text,
            transcription: item.transcription || item.transcript,
            captured_by: item.captured_by || item.author || item.created_by || item.user_name,
            captured_at: item.captured_at || item.created_at || item.taken_at || item.date,
            synced_at: new Date().toISOString()
          })).filter((record: any) => record.media_url);

          console.log(`Created ${mediaRecords.length} valid media records`);

          // Re-upload photos and videos to local storage for permanent URLs
          const reUploadableTypes = ['photo', 'video'];
          for (let i = 0; i < mediaRecords.length; i++) {
            const record = mediaRecords[i];
            if (reUploadableTypes.includes(record.media_type) && record.media_url && !record.media_url.startsWith('note://')) {
              record.media_url = await reUploadMedia(record.media_url, record.media_type, i);
              // Also re-upload thumbnail if present
              if (record.thumbnail_url) {
                record.thumbnail_url = await reUploadMedia(record.thumbnail_url, 'thumb', i);
              }
            }
          }

          await supabase
            .from('workedge_project_media')
            .delete()
            .eq('job_id', jobId)
            .eq('tenant_id', tenantId);

          if (mediaRecords.length > 0) {
            await supabase
              .from('workedge_project_media')
              .insert(mediaRecords);
          }

          await supabase
            .from('crm_jobs')
            .update({ workedge_last_sync: new Date().toISOString() })
            .eq('id', jobId)
            .eq('tenant_id', tenantId);

          result = { success: true, media_count: mediaRecords.length };
          break;
        }

        case 'get-equipment': {
          if (!workedgeProjectId) throw new Error('workedgeProjectId is required');

          const response = await fetch(`${apiUrl}/api-projects/${workedgeProjectId}/equipment`, {
            method: 'GET',
            headers: {
              'x-api-key': WORKEDGE_API_KEY
            }
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`WorkEdge API error: ${response.status} ${errorText}`);
          }

          const equipmentData = await response.json();
          result = { success: true, equipment: equipmentData.items || [] };
          break;
        }

        case 'create-service-record': {
          if (!jobId || !workedgeProjectId) throw new Error('jobId and workedgeProjectId are required');

          const { data: job } = await supabase
            .from('crm_jobs')
            .select('*, current_stage:crm_job_stages(*)')
            .eq('id', jobId)
            .eq('tenant_id', tenantId)
            .single();

          const servicePayload = {
            project_id: workedgeProjectId,
            date: new Date().toISOString(),
            status: job?.current_stage?.name || 'In Progress',
            notes: job?.internal_notes
          };

          const response = await fetch(`${apiUrl}/api-service-records`, {
            method: 'POST',
            headers: {
              'x-api-key': WORKEDGE_API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(servicePayload)
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`WorkEdge API error: ${response.status} ${errorText}`);
          }

          result = { success: true };
          break;
        }

        case 'list-projects': {
          const response = await fetch(`${apiUrl}/api-projects`, {
            method: 'GET',
            headers: { 'x-api-key': WORKEDGE_API_KEY }
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`WorkEdge API error: ${response.status} ${errorText}`);
          }

          const projectsData = await response.json();
          result = { 
            success: true, 
            projects: projectsData.items || projectsData || [] 
          };
          break;
        }

        case 'link-project': {
          if (!jobId || !workedgeProjectId) {
            throw new Error('jobId and workedgeProjectId are required');
          }

          await supabase
            .from('crm_jobs')
            .update({
              workedge_project_id: workedgeProjectId,
              workedge_last_sync: new Date().toISOString()
            })
            .eq('id', jobId)
            .eq('tenant_id', tenantId);

          result = { success: true, workedge_project_id: workedgeProjectId };
          break;
        }

        case 'unlink-project': {
          if (!jobId) {
            throw new Error('jobId is required');
          }

          // Clear the WorkEdge project ID from the job
          await supabase
            .from('crm_jobs')
            .update({
              workedge_project_id: null,
              workedge_last_sync: null
            })
            .eq('id', jobId)
            .eq('tenant_id', tenantId);

          // Delete synced media from local table
          await supabase
            .from('workedge_project_media')
            .delete()
            .eq('job_id', jobId)
            .eq('tenant_id', tenantId);

          result = { success: true };
          break;
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Update sync log as success
      if (logData) {
        await supabase
          .from('workedge_sync_log')
          .update({ 
            sync_status: 'success',
            response_payload: result,
            workedge_id: result?.workedge_project_id || result?.workedge_customer_id
          })
          .eq('id', logData.id);
      }

      // Update last sync on integration config
      await supabase
        .from('integration_configs')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('integration_name', 'workedge');

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (syncError: any) {
      // Update sync log as failed
      if (logData) {
        await supabase
          .from('workedge_sync_log')
          .update({ 
            sync_status: 'failed',
            error_message: syncError.message
          })
          .eq('id', logData.id);
      }

      throw syncError;
    }

  } catch (error: any) {
    console.error('WorkEdge sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
