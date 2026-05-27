-- Create public bucket for calendar event images
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read event images (bucket is public, but explicit policy for clarity)
CREATE POLICY "Public read event images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-images');

-- Only admins can upload event images
CREATE POLICY "Admin upload event images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'event-images'
    AND public.is_admin(auth.uid())
  );

-- Only admins can delete event images
CREATE POLICY "Admin delete event images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'event-images'
    AND public.is_admin(auth.uid())
  );
