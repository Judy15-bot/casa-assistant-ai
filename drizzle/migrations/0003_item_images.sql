ALTER TABLE public.items ADD COLUMN IF NOT EXISTS image_url text;
CREATE POLICY "item images read" ON storage.objects FOR SELECT USING (bucket_id = 'item-images');
CREATE POLICY "item images insert own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'item-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "item images delete own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'item-images' AND (storage.foldername(name))[1] = auth.uid()::text);