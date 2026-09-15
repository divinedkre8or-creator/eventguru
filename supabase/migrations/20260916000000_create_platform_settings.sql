-- supabase/migrations/20260916000000_create_platform_settings.sql
-- Create persistent platform_settings table to store admin configuration across reloads/devices

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'global_settings',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings (for public gateway keys & platform banner)
DROP POLICY IF EXISTS "Public read platform_settings" ON public.platform_settings;
CREATE POLICY "Public read platform_settings"
  ON public.platform_settings
  FOR SELECT
  USING (true);

-- Allow authenticated admins to insert/update settings
DROP POLICY IF EXISTS "Admin write platform_settings" ON public.platform_settings;
CREATE POLICY "Admin write platform_settings"
  ON public.platform_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default row if not exists
INSERT INTO public.platform_settings (id, settings, updated_at)
VALUES (
  'global_settings',
  jsonb_build_object(
    'platform_name', 'EventRally',
    'support_email', 'support@geteventrally.com',
    'currency', 'NGN',
    'gateway_provider', 'paystack',
    'gateway_environment', 'live',
    'platform_fee_percent', 2.5,
    'email_sender_address', 'tickets@send.geteventrally.com',
    'email_sender_name', 'EventRally Tickets',
    'email_reply_to', 'support@geteventrally.com',
    'termii_sender_id', 'Termii',
    'maintenance_mode', false,
    'announcement_banner', ''
  ),
  now()
)
ON CONFLICT (id) DO NOTHING;
