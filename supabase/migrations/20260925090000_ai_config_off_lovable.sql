-- Move remaining ai_config rows off Lovable's AI Gateway (unreachable outside
-- Lovable hosting) and off the deprecated grok-3-mini model, onto the
-- currently-supported grok-4.3 via xAI, whose key is already configured.

UPDATE public.ai_config
SET provider = 'xai', model = 'grok-4.3'
WHERE config_key = 'ai_assistant';

UPDATE public.ai_config
SET provider = 'xai', model = 'grok-4.3'
WHERE config_key = 'knowledge_base';
