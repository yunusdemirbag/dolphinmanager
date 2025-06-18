-- etsy_uploads tablosu
-- Etsy ürün yükleme bilgilerini takip eden tablo

-- UUID uzantısını etkinleştir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS etsy_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID,
    etsy_listing_id BIGINT,
    title TEXT NOT NULL,
    tags TEXT[] NOT NULL,
    category TEXT,
    
    -- Token kullanım bilgileri
    title_prompt_tokens INTEGER,
    title_completion_tokens INTEGER,
    title_total_tokens INTEGER,
    
    tags_prompt_tokens INTEGER,
    tags_completion_tokens INTEGER,
    tags_total_tokens INTEGER,
    
    description_prompt_tokens INTEGER,
    description_completion_tokens INTEGER,
    description_total_tokens INTEGER,
    
    category_prompt_tokens INTEGER,
    category_completion_tokens INTEGER,
    category_total_tokens INTEGER,
    
    -- Toplam token kullanımı
    total_tokens_used INTEGER,
    
    -- Süre bilgileri (milisaniye cinsinden)
    title_generation_duration INTEGER,
    tags_generation_duration INTEGER,
    description_generation_duration INTEGER,
    category_selection_duration INTEGER,
    
    -- Toplam yükleme süresi (milisaniye cinsinden)
    total_upload_duration INTEGER,
    
    -- Ürün yükleme durumu
    upload_status TEXT CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    
    -- Zaman bilgileri
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- İlişkiler için foreign key'ler
    shop_id TEXT
);

-- Performans için indeksler
CREATE INDEX IF NOT EXISTS etsy_uploads_user_id_idx ON etsy_uploads(user_id);
CREATE INDEX IF NOT EXISTS etsy_uploads_product_id_idx ON etsy_uploads(product_id);
CREATE INDEX IF NOT EXISTS etsy_uploads_etsy_listing_id_idx ON etsy_uploads(etsy_listing_id);
CREATE INDEX IF NOT EXISTS etsy_uploads_created_at_idx ON etsy_uploads(created_at);

-- Güncelleme zamanını otomatik güncelleyen trigger
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'set_etsy_uploads_updated_at' AND tgrelid = 'etsy_uploads'::regclass
    ) THEN
        CREATE TRIGGER set_etsy_uploads_updated_at
        BEFORE UPDATE ON etsy_uploads
        FOR EACH ROW
        EXECUTE FUNCTION update_etsy_uploads_updated_at();
    END IF;
END
$$;

-- RLS (Row Level Security) politikaları
ALTER TABLE etsy_uploads ENABLE ROW LEVEL SECURITY;

-- Kullanıcıların kendi kayıtlarını görmesine izin veren politika
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'etsy_uploads' AND policyname = 'etsy_uploads_select_policy'
    ) THEN
        CREATE POLICY etsy_uploads_select_policy ON etsy_uploads
        FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'etsy_uploads' AND policyname = 'etsy_uploads_insert_policy'
    ) THEN
        CREATE POLICY etsy_uploads_insert_policy ON etsy_uploads
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'etsy_uploads' AND policyname = 'etsy_uploads_update_policy'
    ) THEN
        CREATE POLICY etsy_uploads_update_policy ON etsy_uploads
        FOR UPDATE
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'etsy_uploads' AND policyname = 'etsy_uploads_delete_policy'
    ) THEN
        CREATE POLICY etsy_uploads_delete_policy ON etsy_uploads
        FOR DELETE
        USING (auth.uid() = user_id);
    END IF;
END
$$;

COMMENT ON TABLE etsy_uploads IS 'Etsy''ye yüklenen ürünlerin başlık, etiket, token kullanımı ve yükleme süresi bilgilerini içerir.';

-- Güncelleme zamanını otomatik güncelleyen trigger fonksiyonu
CREATE OR REPLACE FUNCTION update_etsy_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix the etsy_stores table to rename image_url to image_url_760x100
DO $$
BEGIN
    -- Check if the column exists before trying to rename
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'etsy_stores'
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE etsy_stores RENAME COLUMN image_url TO image_url_760x100;
    END IF;
END
$$;

-- Create the etsy_uploads table for tracking upload metrics
CREATE TABLE IF NOT EXISTS etsy_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id BIGINT,
  shop_id BIGINT,
  title TEXT,
  state TEXT DEFAULT 'draft',
  upload_duration INTEGER, -- in milliseconds
  image_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  has_variations BOOLEAN DEFAULT false,
  variation_count INTEGER DEFAULT 0,
  title_tokens INTEGER,
  tags_tokens INTEGER,
  category_tokens INTEGER,
  total_tokens INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_listing_id UNIQUE (listing_id)
);

-- Enable RLS
ALTER TABLE etsy_uploads ENABLE ROW LEVEL SECURITY;

-- Create policy for etsy_uploads
CREATE POLICY "Users can manage their own uploads" ON etsy_uploads
  FOR ALL USING (auth.uid() = user_id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_etsy_uploads_user_id ON etsy_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_etsy_uploads_listing_id ON etsy_uploads(listing_id);
CREATE INDEX IF NOT EXISTS idx_etsy_uploads_created_at ON etsy_uploads(created_at);
