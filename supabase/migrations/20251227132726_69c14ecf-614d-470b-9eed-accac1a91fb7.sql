-- Create table for storing video processing jobs
CREATE TABLE public.clip_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  video_url TEXT NOT NULL,
  video_title TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'downloading', 'transcribing', 'analyzing', 'generating', 'complete', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing generated clips
CREATE TABLE public.clips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.clip_jobs(id) ON DELETE CASCADE NOT NULL,
  clip_number INTEGER NOT NULL,
  start_time FLOAT NOT NULL,
  end_time FLOAT NOT NULL,
  duration FLOAT NOT NULL,
  reason TEXT NOT NULL,
  hook_score INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  video_url TEXT,
  transcript TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clip_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;

-- For personal use, allow public access (no auth required)
CREATE POLICY "Allow public read for clip_jobs" ON public.clip_jobs FOR SELECT USING (true);
CREATE POLICY "Allow public insert for clip_jobs" ON public.clip_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for clip_jobs" ON public.clip_jobs FOR UPDATE USING (true);

CREATE POLICY "Allow public read for clips" ON public.clips FOR SELECT USING (true);
CREATE POLICY "Allow public insert for clips" ON public.clips FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for clips" ON public.clips FOR UPDATE USING (true);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_clip_jobs_updated_at
BEFORE UPDATE ON public.clip_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_clips_job_id ON public.clips(job_id);
CREATE INDEX idx_clip_jobs_status ON public.clip_jobs(status);