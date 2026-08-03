-- Add GHL Chat Widget setting to tracking_settings
INSERT INTO public.tracking_settings (setting_key, setting_value, is_enabled)
VALUES ('ghl_chat_widget_id', '69652aaf668b0f267adc7f6c', true)
ON CONFLICT (setting_key) DO NOTHING;