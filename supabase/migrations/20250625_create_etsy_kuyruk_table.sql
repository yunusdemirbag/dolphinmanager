-- Etsy Kuyruk Tablosu - Tüm kuyruk işlemlerini takip eder
-- Bu tablo ürünlerin Etsy'ye yükleme durumunu takip eder

CREATE TABLE IF NOT EXISTS public.etsy_kuyruk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id BIGINT NOT NULL,
  
  -- Ürün bilgileri
  product_data JSONB NOT NULL,
  title TEXT NOT NULL,
  tags TEXT[],
  category TEXT,
  
  -- Durum takibi
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Zaman bilgileri
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Sonuç bilgileri
  listing_id BIGINT, -- Etsy'de oluşturulan listing ID
  error_message TEXT,
  
  -- İstatistik bilgileri
  image_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  has_variations BOOLEAN DEFAULT false,
  variation_count INTEGER DEFAULT 0,
  
  -- Token kullanım bilgileri
  title_tokens INTEGER DEFAULT 0,
  tags_tokens INTEGER DEFAULT 0,
  category_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  
  -- İşlem süresi (milisaniye)
  processing_duration INTEGER,
  
  -- Yeniden deneme bilgileri
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Son güncelleme
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS etsy_kuyruk_user_id_idx ON public.etsy_kuyruk(user_id);
CREATE INDEX IF NOT EXISTS etsy_kuyruk_state_idx ON public.etsy_kuyruk(state);
CREATE INDEX IF NOT EXISTS etsy_kuyruk_scheduled_at_idx ON public.etsy_kuyruk(scheduled_at);
CREATE INDEX IF NOT EXISTS etsy_kuyruk_created_at_idx ON public.etsy_kuyruk(created_at);
CREATE INDEX IF NOT EXISTS etsy_kuyruk_shop_id_idx ON public.etsy_kuyruk(shop_id);
CREATE INDEX IF NOT EXISTS etsy_kuyruk_listing_id_idx ON public.etsy_kuyruk(listing_id);

-- Güvenlik politikaları
ALTER TABLE public.etsy_kuyruk ENABLE ROW LEVEL SECURITY;

-- Kullanıcıların kendi kayıtlarını görmesine izin ver
CREATE POLICY etsy_kuyruk_select_policy ON public.etsy_kuyruk
  FOR SELECT USING (auth.uid() = user_id);

-- Kullanıcıların kendi kayıtlarını eklemesine izin ver
CREATE POLICY etsy_kuyruk_insert_policy ON public.etsy_kuyruk
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Kullanıcıların kendi kayıtlarını güncellemesine izin ver
CREATE POLICY etsy_kuyruk_update_policy ON public.etsy_kuyruk
  FOR UPDATE USING (auth.uid() = user_id);

-- Kullanıcıların kendi kayıtlarını silmesine izin ver
CREATE POLICY etsy_kuyruk_delete_policy ON public.etsy_kuyruk
  FOR DELETE USING (auth.uid() = user_id);

-- Updated_at otomatik güncelleme trigger'ı
CREATE OR REPLACE FUNCTION update_etsy_kuyruk_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER etsy_kuyruk_updated_at_trigger
    BEFORE UPDATE ON public.etsy_kuyruk
    FOR EACH ROW
    EXECUTE FUNCTION update_etsy_kuyruk_updated_at();

-- Eski kayıtları temizleme fonksiyonu (24 saat sonra completed/failed olanları siler)
CREATE OR REPLACE FUNCTION cleanup_old_etsy_kuyruk_records()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.etsy_kuyruk 
    WHERE state IN ('completed', 'failed') 
    AND completed_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log temizleme işlemi
    INSERT INTO public.api_logs (
        endpoint,
        method,
        status_code,
        response_body,
        created_at
    ) VALUES (
        'cleanup_etsy_kuyruk',
        'SYSTEM',
        200,
        jsonb_build_object('deleted_records', deleted_count),
        NOW()
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonksiyonu herkese açık yap
GRANT EXECUTE ON FUNCTION cleanup_old_etsy_kuyruk_records TO authenticated, anon;

-- Şema önbelleğini yenile
SELECT pg_notify('pgrst', 'reload schema');

-- Geçici tablo oluştur ve sil (şema yenileme için)
CREATE TEMP TABLE _temp_schema_refresh_etsy_kuyruk (id SERIAL PRIMARY KEY);
DROP TABLE _temp_schema_refresh_etsy_kuyruk;

COMMENT ON TABLE public.etsy_kuyruk IS 'Etsy ürün yükleme kuyruğunu takip eder - her 24 saatte bir eski kayıtlar temizlenir';
COMMENT ON FUNCTION cleanup_old_etsy_kuyruk_records IS 'Tamamlanmış veya başarısız olan 24 saatten eski kayıtları temizler'; 