-- API isteklerini loglamak için tablo oluştur
CREATE TABLE IF NOT EXISTS api_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  endpoint TEXT,
  method TEXT,
  user_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMPTZ DEFAULT now(),
  success BOOLEAN DEFAULT true,
  duration_ms INTEGER,
  status_code INTEGER,
  details JSONB
);

-- Timestamp üzerinde indeks oluştur (performans için)
CREATE INDEX IF NOT EXISTS api_logs_timestamp_idx ON api_logs (timestamp);

-- Kullanıcı ID üzerinde indeks oluştur (performans için)
CREATE INDEX IF NOT EXISTS api_logs_user_id_idx ON api_logs (user_id);

-- Endpoint üzerinde indeks oluştur (performans için)
CREATE INDEX IF NOT EXISTS api_logs_endpoint_idx ON api_logs (endpoint);

-- Yetkilendirme politikaları
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;

-- Sadece yöneticiler ve kendi loglarını görebilen kullanıcılar için politika
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'api_logs' AND policyname = 'Users can view their own logs'
    ) THEN
        CREATE POLICY "Users can view their own logs" ON api_logs
        FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (
            SELECT id FROM auth.users WHERE raw_user_meta_data->>'isAdmin' = 'true'
        ));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'api_logs' AND policyname = 'Service role can do anything'
    ) THEN
        CREATE POLICY "Service role can do anything" ON api_logs
        USING (auth.role() = 'service_role');
    END IF;
END
$$;

-- Etsy API verileri için önbellek tablosu oluştur
CREATE TABLE IF NOT EXISTS etsy_cache (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  shop_id BIGINT,
  data_type TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Kullanıcı ID ve veri tipi üzerinde birleşik indeks (performans için)
CREATE INDEX IF NOT EXISTS etsy_cache_user_data_idx ON etsy_cache (user_id, data_type);

-- Kullanıcı ID, mağaza ID ve veri tipi üzerinde birleşik indeks (performans için)
CREATE INDEX IF NOT EXISTS etsy_cache_user_shop_data_idx ON etsy_cache (user_id, shop_id, data_type);

-- Yetkilendirme politikaları
ALTER TABLE etsy_cache ENABLE ROW LEVEL SECURITY;

-- Sadece kendi verilerini görebilen kullanıcılar için politika
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'etsy_cache' AND policyname = 'Users can view their own cache data'
    ) THEN
        CREATE POLICY "Users can view their own cache data" ON etsy_cache
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'etsy_cache' AND policyname = 'Users can insert their own cache data'
    ) THEN
        CREATE POLICY "Users can insert their own cache data" ON etsy_cache
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'etsy_cache' AND policyname = 'Users can update their own cache data'
    ) THEN
        CREATE POLICY "Users can update their own cache data" ON etsy_cache
        FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'etsy_cache' AND policyname = 'Users can delete their own cache data'
    ) THEN
        CREATE POLICY "Users can delete their own cache data" ON etsy_cache
        FOR DELETE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'etsy_cache' AND policyname = 'Service role can do anything with cache'
    ) THEN
        CREATE POLICY "Service role can do anything with cache" ON etsy_cache
        USING (auth.role() = 'service_role');
    END IF;
END
$$;

-- Eski logları temizlemek için fonksiyon
CREATE OR REPLACE FUNCTION clean_old_api_logs()
RETURNS void AS $$
BEGIN
  -- 30 günden eski logları sil
  DELETE FROM api_logs WHERE timestamp < NOW() - INTERVAL '30 days';
  -- 7 günden eski önbellek verilerini sil (bu süre CACHE_DURATION'dan uzun olmalı)
  DELETE FROM etsy_cache WHERE updated_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Temizleme işlemini otomatik çalıştırmak için bir cron job ekle (her gün gece yarısı)
-- Önce cron şeması yoksa oluştur
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
        CREATE SCHEMA IF NOT EXISTS cron;
        GRANT USAGE ON SCHEMA cron TO postgres;
    END IF;
END
$$;

-- Cron job'ı oluştur
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM cron.job WHERE jobname = 'cleanup_old_logs'
    ) THEN
        PERFORM cron.schedule('cleanup_old_logs', '0 0 * * *', 'SELECT cleanup_old_logs(30)');
    END IF;
END
$$;

COMMENT ON TABLE api_logs IS 'API isteklerinin logları';
COMMENT ON COLUMN api_logs.endpoint IS 'API endpoint yolu';
COMMENT ON COLUMN api_logs.method IS 'HTTP metodu (GET, POST, vb.)';
COMMENT ON COLUMN api_logs.user_id IS 'İsteği yapan kullanıcının ID''si';
COMMENT ON COLUMN api_logs.timestamp IS 'İstek zamanı';
COMMENT ON COLUMN api_logs.success IS 'İsteğin başarılı olup olmadığı';
COMMENT ON COLUMN api_logs.duration_ms IS 'İstek süresi (milisaniye)';
COMMENT ON COLUMN api_logs.status_code IS 'HTTP durum kodu';
COMMENT ON COLUMN api_logs.details IS 'İstek detayları (JSON)';
