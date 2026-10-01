-- supabase/migrations/20261001120000_storage_and_security_hardening.sql
--
-- EventRally Storage & Security Hardening
-- 1. Restrict storage object update and deletion so users cannot delete or overwrite other users' files.
-- 2. Add database-level unique constraint on registrations(payment_reference) for anti-replay prevention.

BEGIN;

-- 1. Storage Objects Authorization (Fix BOLA)
-- Ensure users can only update or delete their own uploaded files in event-images and dp-templates
DROP POLICY IF EXISTS "Authenticated users can update event images" ON storage.objects;
CREATE POLICY "Authenticated users can update event images" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'event-images' 
  AND (auth.uid() = owner OR public.has_role(auth.uid(), 'admin'))
);

DROP POLICY IF EXISTS "Authenticated users can update dp templates" ON storage.objects;
CREATE POLICY "Authenticated users can update dp templates" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'dp-templates' 
  AND (auth.uid() = owner OR public.has_role(auth.uid(), 'admin'))
);

DROP POLICY IF EXISTS "Authenticated users can delete event images" ON storage.objects;
CREATE POLICY "Authenticated users can delete event images" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'event-images' 
  AND (auth.uid() = owner OR public.has_role(auth.uid(), 'admin'))
);

DROP POLICY IF EXISTS "Authenticated users can delete dp templates" ON storage.objects;
CREATE POLICY "Authenticated users can delete dp templates" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'dp-templates' 
  AND (auth.uid() = owner OR public.has_role(auth.uid(), 'admin'))
);

-- 2. Defense-in-depth: database-level uniqueness for payment references
CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_payment_reference_unique
  ON public.registrations (payment_reference)
  WHERE payment_reference IS NOT NULL;

COMMIT;
