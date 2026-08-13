-- Role assignments for the real staff accounts migrated in the previous
-- migration, matching exactly what each person has on the live site.
INSERT INTO public.user_roles (user_id, role, tenant_id) VALUES
  ('de6979d0-be61-4946-9d36-e51c05b5048b', 'admin', 'cb75a3f3-f310-4587-a4cc-098f50aef59c'),
  ('4a05ab76-47d3-4523-8042-8bdcf787488f', 'super_admin', 'cb75a3f3-f310-4587-a4cc-098f50aef59c'),
  ('e1be55ff-259d-4a40-b40e-a88feb930043', 'lead_tech', 'cb75a3f3-f310-4587-a4cc-098f50aef59c'),
  ('2aa70f24-f1f7-4bfb-adae-d84f6932b2e4', 'super_admin', 'cb75a3f3-f310-4587-a4cc-098f50aef59c'),
  ('4e3b0541-5dbb-4ec4-882d-91199e71c986', 'admin', 'cb75a3f3-f310-4587-a4cc-098f50aef59c'),
  ('d3c99854-589d-4e06-82a4-7fc55a0435fa', 'admin', 'cb75a3f3-f310-4587-a4cc-098f50aef59c')
ON CONFLICT (user_id, role) DO NOTHING;
