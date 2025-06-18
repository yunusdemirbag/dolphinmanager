-- Etsy ürün yükleme kuyruğu tablosu
-- Önce mevcut tabloyu siliyoruz (eğer varsa)
DROP TABLE IF EXISTS public.etsy_uploads;

CREATE TABLE public.etsy_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id BIGINT NOT NULL,
  product_data JSONB NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  listing_id BIGINT,
  error_message TEXT,
  image_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  has_variations BOOLEAN DEFAULT false,
  variation_count INTEGER DEFAULT 0,
  title_tokens INTEGER DEFAULT 0,
  tags_tokens INTEGER DEFAULT 0,
  category_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  tags TEXT[]
);

-- İndeksler
CREATE INDEX etsy_uploads_user_id_idx ON public.etsy_uploads(user_id);
CREATE INDEX etsy_uploads_state_idx ON public.etsy_uploads(state);
CREATE INDEX etsy_uploads_scheduled_at_idx ON public.etsy_uploads(scheduled_at);
CREATE INDEX etsy_uploads_created_at_idx ON public.etsy_uploads(created_at);

-- Güvenlik politikaları
ALTER TABLE public.etsy_uploads ENABLE ROW LEVEL SECURITY;

-- Kullanıcıların kendi kayıtlarını görmesine izin ver
CREATE POLICY etsy_uploads_select_policy ON public.etsy_uploads
  FOR SELECT USING (auth.uid() = user_id);

-- Kullanıcıların kendi kayıtlarını eklemesine izin ver
CREATE POLICY etsy_uploads_insert_policy ON public.etsy_uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Kullanıcıların kendi kayıtlarını güncellemesine izin ver
CREATE POLICY etsy_uploads_update_policy ON public.etsy_uploads
  FOR UPDATE USING (auth.uid() = user_id);

-- Kullanıcıların kendi kayıtlarını silmesine izin ver
CREATE POLICY etsy_uploads_delete_policy ON public.etsy_uploads
  FOR DELETE USING (auth.uid() = user_id);

-- Şema önbelleğini yenilemek için fonksiyon
CREATE OR REPLACE FUNCTION refresh_schema_cache() RETURNS void AS $$
BEGIN
  -- Notify PostgREST to reload schema
  PERFORM pg_notify('pgrst', 'reload schema');
  
  -- Geçici tablo oluştur
  CREATE TEMP TABLE _temp_schema_refresh (id SERIAL PRIMARY KEY);
  
  -- Geçici tabloyu sil
  DROP TABLE _temp_schema_refresh;
END;
$$ LANGUAGE plpgsql;

-- Fonksiyonu herkese açık yap
COMMENT ON FUNCTION refresh_schema_cache IS 'Şema önbelleğini yenilemek için kullanılır';
GRANT EXECUTE ON FUNCTION refresh_schema_cache TO anon, authenticated;

-- Etsy upload ekleme fonksiyonu (shop_id'nin string veya bigint olarak gelmesi durumunda çalışır)
CREATE OR REPLACE FUNCTION insert_etsy_upload(
  p_user_id UUID,
  p_shop_id TEXT,
  p_product_data JSONB,
  p_state TEXT DEFAULT 'pending',
  p_scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '2 minutes')
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_shop_id BIGINT;
BEGIN
  -- Shop ID'yi BIGINT'e dönüştür
  BEGIN
    v_shop_id := p_shop_id::BIGINT;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Geçersiz shop_id formatı: %', p_shop_id;
  END;
  
  -- Kaydı ekle
  INSERT INTO public.etsy_uploads (
    id, user_id, shop_id, product_data, state, scheduled_at
  ) VALUES (
    gen_random_uuid(), p_user_id, v_shop_id, p_product_data, p_state, p_scheduled_at
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC fonksiyonunu API'ye aç
GRANT EXECUTE ON FUNCTION insert_etsy_upload TO authenticated;
COMMENT ON FUNCTION insert_etsy_upload IS 'Etsy upload kaydı ekler ve shop_id''yi doğru formata dönüştürür';

-- Şema önbelleğini yenileme (birden fazla yöntem kullanarak)
SELECT pg_notify('pgrst', 'reload schema');

-- Şema önbelleğini zorla yenilemek için geçici tablo oluştur ve sil
CREATE TABLE _schema_cache_refresh_etsy_uploads (id SERIAL PRIMARY KEY);
DROP TABLE _schema_cache_refresh_etsy_uploads;

-- Şema önbelleğini yenilemek için ek yöntem
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END $$; 