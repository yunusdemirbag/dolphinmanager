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

-- Cron logs tablosu
CREATE TABLE IF NOT EXISTS public.cron_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_name TEXT NOT NULL,
  result TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS politikası
ALTER TABLE public.cron_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read cron logs
CREATE POLICY "Authenticated users can view cron logs" 
ON public.cron_logs FOR SELECT USING (auth.role() = 'authenticated');

-- Authenticated users can insert cron logs
CREATE POLICY "Authenticated users can insert cron logs" 
ON public.cron_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated'); 