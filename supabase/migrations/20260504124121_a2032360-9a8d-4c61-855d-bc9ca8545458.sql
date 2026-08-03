-- Seed editable contact form email templates (idempotent)
INSERT INTO public.crm_email_templates (name, subject, body_html, trigger_event, is_active, delay_hours)
SELECT
  'Contact Form — Customer Acknowledgement',
  'We got your message, {{first_name}} — Truficient HVAC',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', sans-serif; max-width: 600px; margin: 0 auto; color: #002244;">
  <div style="background: #002244; padding: 28px 24px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0; color: #FFB547; font-size: 24px;">Thanks, {{first_name}}!</h1>
    <p style="margin: 8px 0 0; color: #fff; font-size: 14px;">We received your message.</p>
  </div>
  <div style="background: #fff; padding: 28px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6;">A member of our team will be in touch within <strong>24 business hours</strong> regarding your <strong>{{service_type}}</strong> request.</p>
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6;">Need immediate help? Give us a call:</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="tel:214-238-4349" style="display: inline-block; background: #FFB547; color: #002244; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 16px;">Call (214) 238-4349</a>
    </div>
    <div style="margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 4px;">
      <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Your Message</p>
      <p style="margin: 0; white-space: pre-wrap; font-size: 14px;">{{message}}</p>
    </div>
    <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
      <p style="margin: 0;"><strong>Truficient HVAC Solutions</strong></p>
      <p style="margin: 4px 0 0;">TACLB77247C · Serving the DFW Metroplex</p>
      <p style="margin: 8px 0 0;"><a href="https://truficient.com" style="color: #002244;">truficient.com</a></p>
    </div>
  </div>
</div>',
  'contact_form_customer_ack',
  true,
  0
WHERE NOT EXISTS (
  SELECT 1 FROM public.crm_email_templates WHERE trigger_event = 'contact_form_customer_ack'
);

INSERT INTO public.crm_email_templates (name, subject, body_html, cc_emails, trigger_event, is_active, delay_hours)
SELECT
  'Contact Form — Internal Alert',
  '🔔 New Contact: {{first_name}} {{last_name}} — {{service_type}}',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', sans-serif; max-width: 600px; margin: 0 auto; color: #002244;">
  <div style="background: #002244; color: #FFB547; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 22px;">New Contact Form Submission</h1>
    <p style="margin: 8px 0 0; color: #fff; font-size: 13px;">{{submitted_at}} CST</p>
  </div>
  <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px 0; color: #6b7280; width: 130px;">Name</td><td style="padding: 8px 0; font-weight: 600;">{{first_name}} {{last_name}}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Email</td><td style="padding: 8px 0;"><a href="mailto:{{email}}" style="color: #002244;">{{email}}</a></td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Phone</td><td style="padding: 8px 0;"><a href="tel:{{phone}}" style="color: #002244;">{{phone}}</a></td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Service</td><td style="padding: 8px 0;">{{service_type}}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Source</td><td style="padding: 8px 0;">{{source}}</td></tr>
    </table>
    <div style="margin-top: 20px; padding: 16px; background: #f9fafb; border-left: 3px solid #FFB547; border-radius: 4px;">
      <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Message</p>
      <p style="margin: 0; white-space: pre-wrap;">{{message}}</p>
    </div>
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
      View in admin: <a href="https://truficient.com/admin/submissions" style="color: #002244;">truficient.com/admin/submissions</a>
    </div>
  </div>
</div>',
  'info@truficient.com, annabeth.d@truficient.com',
  'contact_form_internal_alert',
  true,
  0
WHERE NOT EXISTS (
  SELECT 1 FROM public.crm_email_templates WHERE trigger_event = 'contact_form_internal_alert'
);