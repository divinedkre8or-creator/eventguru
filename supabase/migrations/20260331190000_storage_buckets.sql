-- ====================================================================
-- STORAGE BUCKETS & POLICIES SETUP FOR EVENTGURU
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/edpnvsakkudorleqqhxv/sql/new
-- ====================================================================

-- 1. Create public storage buckets for event flyers and DP templates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('event-images', 'event-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('dp-templates', 'dp-templates', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 10485760;

-- 2. Storage Objects RLS Policies
-- Allow anyone (public and authenticated users) to read/download images
DROP POLICY IF EXISTS "Public can view event images" ON storage.objects;
CREATE POLICY "Public can view event images" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Public can view dp templates" ON storage.objects;
CREATE POLICY "Public can view dp templates" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'dp-templates');

-- Allow authenticated users to upload to event-images
DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
CREATE POLICY "Authenticated users can upload event images" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'event-images');

-- Allow authenticated users to upload to dp-templates
DROP POLICY IF EXISTS "Authenticated users can upload dp templates" ON storage.objects;
CREATE POLICY "Authenticated users can upload dp templates" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'dp-templates');

-- Allow users to update their own uploads or bucket objects
DROP POLICY IF EXISTS "Authenticated users can update event images" ON storage.objects;
CREATE POLICY "Authenticated users can update event images" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Authenticated users can update dp templates" ON storage.objects;
CREATE POLICY "Authenticated users can update dp templates" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'dp-templates');

-- Allow users to delete their images
DROP POLICY IF EXISTS "Authenticated users can delete event images" ON storage.objects;
CREATE POLICY "Authenticated users can delete event images" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Authenticated users can delete dp templates" ON storage.objects;
CREATE POLICY "Authenticated users can delete dp templates" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'dp-templates');
