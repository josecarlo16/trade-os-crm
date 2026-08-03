import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1'
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2.95.0/cors'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { customerId, threadContext, instruction } = await req.json()

    if (!customerId) {
      return new Response(JSON.stringify({ error: 'customerId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get customer info
    const { data: customer } = await supabase
      .from('crm_customers')
      .select('first_name, last_name, email, phone, notes, customer_type, customer_status')
      .eq('id', customerId)
      .single()

    // Get recent emails
    const { data: emails } = await supabase
      .from('crm_email_log')
      .select('direction, subject, body_text, sent_at, received_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10)

    const customerName = customer
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
      : 'Customer'

    const emailHistory = (emails || []).map(e => 
      `[${e.direction === 'outbound' ? 'SENT' : 'RECEIVED'}] Subject: ${e.subject}\n${e.body_text?.substring(0, 300) || '(no text)'}`
    ).join('\n---\n')

    const systemPrompt = `You are Bach, the AI assistant for Truficient HVAC. You write professional, warm, and helpful emails to customers from bach@truficient.com.

Guidelines:
- Be professional but approachable — like a trusted advisor
- Keep emails concise and actionable
- Use the customer's first name when available
- Sign off as "Bach" from the Truficient team
- If you have thread context, write a reply that naturally continues the conversation
- Focus on being helpful and moving things forward

Customer Info:
Name: ${customerName}
Email: ${customer?.email || 'unknown'}
Type: ${customer?.customer_type || 'unknown'}
Status: ${customer?.customer_status || 'unknown'}
Notes: ${customer?.notes || 'none'}

Recent Email History:
${emailHistory || 'No previous emails'}`

    const userPrompt = instruction
      ? `Draft an email based on this instruction: ${instruction}\n\nThread context: ${threadContext || 'New conversation'}`
      : `Draft a follow-up email based on the conversation thread.\n\nThread context: ${threadContext || 'New conversation'}`

    // Call Lovable AI Gateway
    const aiRes = await fetch('https://ai-gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    const aiData = await aiRes.json()
    const draftContent = aiData.choices?.[0]?.message?.content || ''

    // Parse subject from draft if it contains one
    let subject = ''
    let body = draftContent

    const subjectMatch = draftContent.match(/^Subject:\s*(.+?)$/m)
    if (subjectMatch) {
      subject = subjectMatch[1].trim()
      body = draftContent.replace(/^Subject:\s*.+?\n/m, '').trim()
    }

    return new Response(JSON.stringify({ subject, body }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Draft generation error:', error)
    return new Response(JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
