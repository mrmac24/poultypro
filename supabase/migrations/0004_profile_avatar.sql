-- Add avatar_url column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create storage bucket for avatars if it doesn't exist
-- Note: This needs to be run in Supabase Dashboard -> Storage -> New Bucket
-- Bucket name: avatars
-- Public: true

-- Storage policies for avatars bucket (run these in Supabase SQL Editor)
-- First, create the bucket manually in the dashboard, then run these policies:

-- Policy: Allow authenticated users to upload their own avatar
-- CREATE POLICY "Allow authenticated uploads" ON storage.objects
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);

-- Policy: Allow users to update their own avatar
-- CREATE POLICY "Allow own updates" ON storage.objects
--   FOR UPDATE
--   TO authenticated
--   USING (bucket_id = 'avatars' AND auth.uid() = owner);

-- Policy: Allow public read access to avatars
-- CREATE POLICY "Allow public read" ON storage.objects
--   FOR SELECT
--   TO anon, authenticated
--   USING (bucket_id = 'avatars');

-- Policy: Allow users to delete their own avatar
-- CREATE POLICY "Allow own delete" ON storage.objects
--   FOR DELETE
--   TO authenticated
--   USING (bucket_id = 'avatars' AND auth.uid() = owner);
