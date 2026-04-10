-- Create storage bucket for uploaded videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('videos', 'videos', true, 524288000, ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']);

-- Storage policies for videos bucket
CREATE POLICY "Anyone can view videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "Anyone can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Anyone can update their videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'videos');

CREATE POLICY "Anyone can delete videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'videos');

-- Add columns to clips table for captions and export settings
ALTER TABLE public.clips 
ADD COLUMN IF NOT EXISTS captions jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS export_preset text DEFAULT '9:16',
ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'url';

-- Add columns to clip_jobs for batch processing
ALTER TABLE public.clip_jobs
ADD COLUMN IF NOT EXISTS batch_id text,
ADD COLUMN IF NOT EXISTS uploaded_file_url text,
ADD COLUMN IF NOT EXISTS transcript_data jsonb;