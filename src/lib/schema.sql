-- Etsy resimlerini önbelleklemek için tablo
CREATE TABLE IF NOT EXISTS public.etsy_images (
  id SERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL,
  image_url TEXT NOT NULL,
  local_path TEXT NOT NULL,
  original_url TEXT NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active',
  
  CONSTRAINT unique_listing_image UNIQUE (listing_id, image_url)
);

-- Indeks ekleyelim
CREATE INDEX IF NOT EXISTS idx_etsy_images_listing_id ON public.etsy_images(listing_id);
CREATE INDEX IF NOT EXISTS idx_etsy_images_status ON public.etsy_images(status);

-- RLS politikası
ALTER TABLE public.etsy_images ENABLE ROW LEVEL SECURITY;

-- Herkesin okuma yetkisi olsun
CREATE POLICY "Etsy images are viewable by everyone" 
ON public.etsy_images FOR SELECT USING (true);

-- Sadece kimliği doğrulanmış kullanıcılar yazabilsin
CREATE POLICY "Authenticated users can insert images" 
ON public.etsy_images FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their images" 
ON public.etsy_images FOR UPDATE USING (auth.role() = 'authenticated');

-- Queue jobs tablosu
CREATE TABLE IF NOT EXISTS queue_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  data JSONB NOT NULL,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_queue_jobs_user_status ON queue_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_status_created ON queue_jobs(status, created_at); 