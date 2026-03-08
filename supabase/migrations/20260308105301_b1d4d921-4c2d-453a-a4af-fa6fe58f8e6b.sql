
-- Create app-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('app-images', 'app-images', true);

-- Allow authenticated users to upload images to their app folder
CREATE POLICY "Users can upload app images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'app-images');

-- Allow anyone to view app images (public bucket)
CREATE POLICY "Anyone can view app images"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-images');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Users can delete own app images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'app-images' AND (storage.foldername(name))[1] = auth.uid()::text);
