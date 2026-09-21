-- Migration: Fix Comment Photo Visibility
-- ----------------------------------------
-- 1. Add image_url column to report_comments if it's missing
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='report_comments' AND column_name='image_url') THEN
    ALTER TABLE report_comments ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- 2. Create the 'comment-images' storage bucket if it doesn't exist
-- Note: You may need to run this part manually if your Supabase setup doesn't allow bucket creation via SQL editor easily
INSERT INTO storage.buckets (id, name, public)
SELECT 'comment-images', 'comment-images', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'comment-images'
);

-- 3. Set up Storage Policies for the 'comment-images' bucket
-- Allow anyone to view images (Public Bucket)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'comment-images' );

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'comment-images' 
    AND auth.role() = 'authenticated'
);

-- Allow owners to delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'comment-images' 
    AND auth.uid() = owner
);
