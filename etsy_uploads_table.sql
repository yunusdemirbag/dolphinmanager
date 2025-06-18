-- etsy_uploads_table.sql
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
CREATE OR REPLACE FUNCTION update_etsy_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_etsy_uploads_updated_at
BEFORE UPDATE ON etsy_uploads
FOR EACH ROW
EXECUTE FUNCTION update_etsy_uploads_updated_at();

-- RLS (Row Level Security) politikaları
ALTER TABLE etsy_uploads ENABLE ROW LEVEL SECURITY;

-- Kullanıcıların kendi kayıtlarını görmesine izin veren politika
CREATE POLICY etsy_uploads_select_policy ON etsy_uploads
    FOR SELECT
    USING (auth.uid() = user_id);

-- Kullanıcıların kendi kayıtlarını eklemesine izin veren politika
CREATE POLICY etsy_uploads_insert_policy ON etsy_uploads
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Kullanıcıların kendi kayıtlarını güncellemesine izin veren politika
CREATE POLICY etsy_uploads_update_policy ON etsy_uploads
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Kullanıcıların kendi kayıtlarını silmesine izin veren politika
CREATE POLICY etsy_uploads_delete_policy ON etsy_uploads
    FOR DELETE
    USING (auth.uid() = user_id);

COMMENT ON TABLE etsy_uploads IS 'Etsy''ye yüklenen ürünlerin başlık, etiket, token kullanımı ve yükleme süresi bilgilerini içerir.'; 