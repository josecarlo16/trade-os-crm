DELETE FROM public.admin_tasks WHERE submission_id = '0ad5cdaf-857a-4b6f-8dc1-0866e579cc61';
DELETE FROM public.admin_notifications WHERE related_entity_id = '0ad5cdaf-857a-4b6f-8dc1-0866e579cc61';
DELETE FROM public.contact_submissions WHERE email = 'zztest.leadcheck@example.com';
DELETE FROM public.landing_page_submissions WHERE email = 'zztest.lp@example.com';
DELETE FROM public.ductless_estimate_submissions WHERE customer_email = 'zztest.leadcheck@example.com';