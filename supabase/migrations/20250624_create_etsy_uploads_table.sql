-- Etsy ürün yükleme kuyruğu tablosu
CREATE TABLE IF NOT EXISTS public.etsy_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id BIGINT NOT NULL,
  product_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  listing_id BIGINT,
  error_message TEXT
);

-- İndeksler
CREATE INDEX IF NOT EXISTS etsy_uploads_user_id_idx ON public.etsy_uploads(user_id);
CREATE INDEX IF NOT EXISTS etsy_uploads_status_idx ON public.etsy_uploads(status);
CREATE INDEX IF NOT EXISTS etsy_uploads_scheduled_at_idx ON public.etsy_uploads(scheduled_at);

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

-- Şema önbelleğini yenileme
SELECT pg_notify('pgrst', 'reload schema');

-- Şema önbelleğini zorla yenilemek için geçici tablo oluştur ve sil
CREATE TABLE IF NOT EXISTS _schema_cache_refresh_etsy_uploads (id SERIAL PRIMARY KEY);
DROP TABLE _schema_cache_refresh_etsy_uploads; 