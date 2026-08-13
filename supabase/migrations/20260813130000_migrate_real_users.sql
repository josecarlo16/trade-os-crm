-- Migrates real staff auth accounts from the live Truficient database,
-- preserving their actual bcrypt password hashes so existing passwords keep
-- working — no password reset needed. Both auth.users and auth.identities
-- rows are required for Supabase's email/password (and Google OAuth, for
-- Eric) login flow to recognize the account.
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token
) VALUES
  ('00000000-0000-0000-0000-000000000000', 'de6979d0-be61-4946-9d36-e51c05b5048b', 'authenticated', 'authenticated',
   'annabeth.d@truficient.com', '$2a$10$Gb9U2pYz3Yen1VgYD3bgA.PPlVZihmPCGKc6bRCKZZhjh.2dino4a',
   '2026-01-15 15:24:02.232107+00', '2026-01-15 15:24:02.211537+00', '2026-01-15 15:24:02.211537+00',
   '{"provider":"email","providers":["email"]}'::jsonb, '{"email_verified":true}'::jsonb, '', ''),
  ('00000000-0000-0000-0000-000000000000', 'f051b0b3-c58b-4125-b24c-f9a10feb1463', 'authenticated', 'authenticated',
   'dave.vl@ecosourceiq.com', '$2a$10$295g/d210FCPJuwryIPofuhCHCBZe4gj/aur6oO6hC03yUL6aSZIy',
   '2026-01-15 15:18:37.802352+00', '2026-01-15 15:18:37.787589+00', '2026-01-15 15:18:37.787589+00',
   '{"provider":"email","providers":["email"]}'::jsonb, '{"email_verified":true}'::jsonb, '', ''),
  ('00000000-0000-0000-0000-000000000000', '4a05ab76-47d3-4523-8042-8bdcf787488f', 'authenticated', 'authenticated',
   'eric@truficient.com', '$2a$10$XIpxC8.THawEs8ldOA4l6u0CKsuXwd613wfuwmYNGKWv2kYNvn6oG',
   '2026-01-15 03:03:32.059108+00', '2026-01-15 03:03:32.022088+00', '2026-01-15 03:03:32.022088+00',
   '{"provider":"email","providers":["email","google"]}'::jsonb,
   '{"avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocIUxFpArWni9lpdfBF3yf47-KRbHVfc3Z7oFkVp5rZbJmK8MzhO=s96-c","custom_claims":{"hd":"truficient.com"},"email":"eric@truficient.com","email_verified":true,"full_name":"Eric L","iss":"https://accounts.google.com","name":"Eric L","phone_verified":false,"picture":"https://lh3.googleusercontent.com/a/ACg8ocIUxFpArWni9lpdfBF3yf47-KRbHVfc3Z7oFkVp5rZbJmK8MzhO=s96-c","provider_id":"112385673612451478572","sub":"112385673612451478572"}'::jsonb,
   '', ''),
  ('00000000-0000-0000-0000-000000000000', 'e1be55ff-259d-4a40-b40e-a88feb930043', 'authenticated', 'authenticated',
   'garyfairris700@gmail.com', '$2a$10$rqIIwOtElvrDHhPNvGXWLuaeiY30bUNXNvkikm26KQRMJIsNrXotu',
   '2026-04-15 14:11:34.097808+00', '2026-04-15 14:11:34.064281+00', '2026-04-15 14:11:34.064281+00',
   '{"provider":"email","providers":["email"]}'::jsonb, '{"email_verified":true}'::jsonb, '', ''),
  ('00000000-0000-0000-0000-000000000000', '2aa70f24-f1f7-4bfb-adae-d84f6932b2e4', 'authenticated', 'authenticated',
   'jose.carlo@ecosourceiq.com', '$2a$10$zfD22ug8bEJsLfWphiobl.6YsUr59dPLz7GVU1t70qf1dTkKr1jnW',
   '2026-07-28 10:41:31.894849+00', '2026-07-28 10:41:31.858543+00', '2026-07-28 10:41:31.858543+00',
   '{"provider":"email","providers":["email"]}'::jsonb, '{"email_verified":true}'::jsonb, '', ''),
  ('00000000-0000-0000-0000-000000000000', '4e3b0541-5dbb-4ec4-882d-91199e71c986', 'authenticated', 'authenticated',
   'marysosas60@gmail.com', '$2a$10$Jx9Lzb4/BfkrPvtwA3PuRui5DciPBSxsjs1BUuNrp6LFiIHP2fdSq',
   '2026-07-14 11:24:34.63823+00', '2026-07-14 11:24:34.591175+00', '2026-07-14 11:24:34.591175+00',
   '{"provider":"email","providers":["email"]}'::jsonb, '{"email_verified":true}'::jsonb, '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd3c99854-589d-4e06-82a4-7fc55a0435fa', 'authenticated', 'authenticated',
   'paulqlove@gmail.com', '$2a$10$B2kdcIGhunjyRcYXQFEX6OkXR/Ec6STXV1M2qlKArP4Axp1Nha8H6',
   '2026-01-19 23:53:01.116441+00', '2026-01-19 23:53:01.093527+00', '2026-01-19 23:53:01.093527+00',
   '{"provider":"email","providers":["email"]}'::jsonb, '{"email_verified":true}'::jsonb, '', ''),
  ('00000000-0000-0000-0000-000000000000', 'f7d8967b-6470-450f-98fd-66fce88d5cd0', 'authenticated', 'authenticated',
   'zye@ecosourceiq.com', '$2a$10$4PQ1gm9k7jHgg4VLgIhbJ.D1C7ksVnFHQBOLXovTqoJJcO8HB6GGq',
   '2026-03-10 17:36:12.964392+00', '2026-03-10 17:36:12.930544+00', '2026-03-10 17:36:12.930544+00',
   '{"provider":"email","providers":["email"]}'::jsonb, '{"email_verified":true}'::jsonb, '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at
) VALUES
  ('2aa70f24-f1f7-4bfb-adae-d84f6932b2e4', '2aa70f24-f1f7-4bfb-adae-d84f6932b2e4',
   '{"email":"jose.carlo@ecosourceiq.com","email_verified":false,"phone_verified":false,"sub":"2aa70f24-f1f7-4bfb-adae-d84f6932b2e4"}'::jsonb,
   'email', '2aa70f24-f1f7-4bfb-adae-d84f6932b2e4', '2026-07-28 10:41:31.875759+00', '2026-07-28 10:41:31.875759+00', '2026-07-28 10:41:31.875759+00'),
  ('c53f2fb9-744d-4dd8-a2a0-848139567eda', '4a05ab76-47d3-4523-8042-8bdcf787488f',
   '{"email":"eric@truficient.com","email_verified":false,"full_name":"Eric Love","phone_verified":false,"sub":"4a05ab76-47d3-4523-8042-8bdcf787488f"}'::jsonb,
   'email', '4a05ab76-47d3-4523-8042-8bdcf787488f', '2026-01-15 03:03:32.048189+00', '2026-01-15 03:03:32.048189+00', '2026-01-15 03:03:32.048189+00'),
  ('4628adeb-9eca-4c3a-901d-0499f5d3b20b', '4a05ab76-47d3-4523-8042-8bdcf787488f',
   '{"avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocIUxFpArWni9lpdfBF3yf47-KRbHVfc3Z7oFkVp5rZbJmK8MzhO=s96-c","custom_claims":{"hd":"truficient.com"},"email":"eric@truficient.com","email_verified":true,"full_name":"Eric L","iss":"https://accounts.google.com","name":"Eric L","phone_verified":false,"picture":"https://lh3.googleusercontent.com/a/ACg8ocIUxFpArWni9lpdfBF3yf47-KRbHVfc3Z7oFkVp5rZbJmK8MzhO=s96-c","provider_id":"112385673612451478572","sub":"112385673612451478572"}'::jsonb,
   'google', '112385673612451478572', '2026-02-04 15:19:16.764203+00', '2026-02-05 01:23:04.585231+00', '2026-02-05 01:23:04.585231+00'),
  ('4542705a-9079-4fe4-a406-5e61e1f55124', '4e3b0541-5dbb-4ec4-882d-91199e71c986',
   '{"email":"marysosas60@gmail.com","email_verified":false,"phone_verified":false,"sub":"4e3b0541-5dbb-4ec4-882d-91199e71c986"}'::jsonb,
   'email', '4e3b0541-5dbb-4ec4-882d-91199e71c986', '2026-07-14 11:24:34.61888+00', '2026-07-14 11:24:34.61888+00', '2026-07-14 11:24:34.61888+00'),
  ('b70a373f-cae0-43ac-81e0-6f694255ede5', 'd3c99854-589d-4e06-82a4-7fc55a0435fa',
   '{"email":"paulqlove@gmail.com","email_verified":false,"phone_verified":false,"sub":"d3c99854-589d-4e06-82a4-7fc55a0435fa"}'::jsonb,
   'email', 'd3c99854-589d-4e06-82a4-7fc55a0435fa', '2026-01-19 23:53:01.110405+00', '2026-01-19 23:53:01.110405+00', '2026-01-19 23:53:01.110405+00'),
  ('298a4da2-6a79-43bb-8c07-491d3904bb7b', 'de6979d0-be61-4946-9d36-e51c05b5048b',
   '{"email":"annabeth.d@truficient.com","email_verified":false,"phone_verified":false,"sub":"de6979d0-be61-4946-9d36-e51c05b5048b"}'::jsonb,
   'email', 'de6979d0-be61-4946-9d36-e51c05b5048b', '2026-01-15 15:24:02.222606+00', '2026-01-15 15:24:02.222606+00', '2026-01-15 15:24:02.222606+00'),
  ('671121ec-3244-4f13-8438-7ec5030b0b99', 'e1be55ff-259d-4a40-b40e-a88feb930043',
   '{"email":"garyfairris700@gmail.com","email_verified":false,"phone_verified":false,"sub":"e1be55ff-259d-4a40-b40e-a88feb930043"}'::jsonb,
   'email', 'e1be55ff-259d-4a40-b40e-a88feb930043', '2026-04-15 14:11:34.090151+00', '2026-04-15 14:11:34.090151+00', '2026-04-15 14:11:34.090151+00'),
  ('9712f105-1ea4-41cd-ad84-5c11a1372a6b', 'f051b0b3-c58b-4125-b24c-f9a10feb1463',
   '{"email":"dave.vl@ecosourceiq.com","email_verified":false,"phone_verified":false,"sub":"f051b0b3-c58b-4125-b24c-f9a10feb1463"}'::jsonb,
   'email', 'f051b0b3-c58b-4125-b24c-f9a10feb1463', '2026-01-15 15:18:37.797444+00', '2026-01-15 15:18:37.797444+00', '2026-01-15 15:18:37.797444+00'),
  ('4dead72a-9b6c-4dae-a4e8-6ffb00874576', 'f7d8967b-6470-450f-98fd-66fce88d5cd0',
   '{"email":"zye@ecosourceiq.com","email_verified":false,"phone_verified":false,"sub":"f7d8967b-6470-450f-98fd-66fce88d5cd0"}'::jsonb,
   'email', 'f7d8967b-6470-450f-98fd-66fce88d5cd0', '2026-03-10 17:36:12.951256+00', '2026-03-10 17:36:12.951256+00', '2026-03-10 17:36:12.951256+00')
ON CONFLICT (id) DO NOTHING;
