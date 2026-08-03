
CREATE TABLE public.crm_social_strategy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_social_strategy TO authenticated;
GRANT ALL ON public.crm_social_strategy TO service_role;
ALTER TABLE public.crm_social_strategy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read strategy" ON public.crm_social_strategy FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage strategy" ON public.crm_social_strategy FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_crm_social_strategy_updated BEFORE UPDATE ON public.crm_social_strategy FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.crm_social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  body text NOT NULL,
  pillar text,
  status text NOT NULL DEFAULT 'draft',
  media_urls text[] DEFAULT '{}',
  ai_model text,
  ai_provider text,
  source_idea_id uuid,
  scheduled_for timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_social_posts TO authenticated;
GRANT ALL ON public.crm_social_posts TO service_role;
ALTER TABLE public.crm_social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read posts" ON public.crm_social_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage posts" ON public.crm_social_posts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_crm_social_posts_updated BEFORE UPDATE ON public.crm_social_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_crm_social_posts_status ON public.crm_social_posts(status);
CREATE INDEX idx_crm_social_posts_scheduled ON public.crm_social_posts(scheduled_for);

CREATE TABLE public.crm_social_post_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.crm_social_posts(id) ON DELETE CASCADE,
  platform text NOT NULL,
  platform_copy text,
  status text NOT NULL DEFAULT 'pending',
  external_id text,
  error_message text,
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_social_post_targets TO authenticated;
GRANT ALL ON public.crm_social_post_targets TO service_role;
ALTER TABLE public.crm_social_post_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read targets" ON public.crm_social_post_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage targets" ON public.crm_social_post_targets FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE UNIQUE INDEX uniq_post_platform ON public.crm_social_post_targets(post_id, platform);

CREATE TABLE public.crm_social_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hook text NOT NULL,
  angle text,
  pillar text,
  suggested_platforms text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'suggested',
  source_context text,
  ai_model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_social_ideas TO authenticated;
GRANT ALL ON public.crm_social_ideas TO service_role;
ALTER TABLE public.crm_social_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read ideas" ON public.crm_social_ideas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage ideas" ON public.crm_social_ideas FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_crm_social_ideas_updated BEFORE UPDATE ON public.crm_social_ideas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.role_permissions (role, permission_key, enabled)
VALUES ('admin', 'nav.social-studio', true)
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.crm_social_strategy (title, content, is_active, version) VALUES (
'Truficient Social Media Post Strategy',
$STRAT$# Truficient Social Media Post Strategy

## Operating Philosophy: 80/20 — Educate First, Sell Second
- 80% of posts educate, entertain, or build trust.
- 20% of posts are direct offers, calls-to-action, or promotions.
- Every post should make a homeowner smarter about HVAC, comfort, or their home — even when we are pitching.

## The Five Content Pillars
1. **Comfort** — How real homes actually feel. Hot rooms, cold rooms, humidity, quiet operation, sleep quality.
2. **Energy Costs** — Bills, efficiency, rate hikes, ROI on equipment, behavioral tips that move the needle.
3. **Equipment Education** — How HVAC works, single-stage vs multi-speed vs variable-speed, why inverter mini-splits dominate, brand explainers.
4. **How We Think** — Truficient POV on the trade, why we install what we install, common contractor traps, decision frameworks for homeowners.
5. **Proof** — Real installs, before/afters, customer wins, BTU calcs, photos from the field, reviews. Strip PII; never show addresses or last names.

## Platform Playbooks

### Google Business Profile
- Length: 150 to 300 characters plus a clear CTA.
- Tone: helpful, local, factual. No hashtags.
- Cadence: 2 to 4 posts per week.
- Always include a CTA link (estimate page, blog post, scanner).
- Use city names when relevant for local relevance.

### Facebook
- Lean educational. Short posts (2 to 4 short paragraphs) or Reels.
- Cadence: 3 to 5 posts per week, mix Reels and static.
- Hook in line 1, payoff in line 2, CTA last.
- Reels: 15 to 45 sec, captions burned in, end with "DM us" or "free estimate at truficient.com".

### Instagram
- Visual-first. Carousels and Reels outperform single images.
- IMPORTANT: Images must be available at a publicly hosted URL (CDN). Local files will not post — upload to storage and reference the URL.
- Cadence: 3 to 4 posts per week.
- Carousels: 5 to 8 slides, one idea per slide, big readable type.
- First 125 characters of caption are what people see — front-load value.

### TikTok
- Hook in the first 2 to 3 seconds or viewers swipe away.
- Vertical 9:16, 15 to 60 sec, captions on screen.
- Cadence: 3 to 5 posts per week when in cycle.
- Reality: TikTok is draft-only until our brand audit clears — generate copy and store as drafts, do not attempt to publish.
- Educational hooks crush ("the #1 reason your upstairs is hot", "this is what a $400 electric bill looks like").

## Voice and Tone
- Plain-spoken, confident, never condescending.
- Use real numbers when we have them (BTUs, SEER, dollar amounts, square footage).
- Avoid jargon unless we immediately define it.
- Never shame the homeowner for an old system or bad past install.

## Hard Rules
- No PII in proof posts (no addresses, no last names, no license plates).
- No before/after of a competitor logo without redaction.
- No "limited time" urgency we cannot honor.
- No medical or energy claims we cannot back with a source.
- Always disclose financing terms accurately.
$STRAT$,
true, 1);
