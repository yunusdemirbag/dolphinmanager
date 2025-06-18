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

-- Sadece kendi loglarını görebilme politikası
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'api_logs' AND policyname = 'Users can view their own logs'
    ) THEN
        CREATE POLICY "Users can view their own logs"
        ON api_logs FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'api_logs' AND policyname = 'Service role can view all logs'
    ) THEN
        CREATE POLICY "Service role can view all logs"
        ON api_logs FOR SELECT
        USING (auth.role() = 'service_role');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'api_logs' AND policyname = 'Authenticated can insert logs'
    ) THEN
        CREATE POLICY "Authenticated can insert logs"
        ON api_logs FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');
    END IF;
END
$$;

-- Geçmiş logları temizlemek için fonksiyon (30 günden eski logları siler)
CREATE OR REPLACE FUNCTION clean_old_api_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM api_logs
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Temizleme işlemini otomatik çalıştırmak için bir cron job ekle (her gün gece yarısı)
SELECT cron.schedule(
  'clean-old-api-logs',
  '0 0 * * *',
  'SELECT clean_old_api_logs();'
);

COMMENT ON TABLE api_logs IS 'API isteklerinin logları';
COMMENT ON COLUMN api_logs.endpoint IS 'API endpoint yolu';
COMMENT ON COLUMN api_logs.method IS 'HTTP metodu (GET, POST, vb.)';
COMMENT ON COLUMN api_logs.user_id IS 'İsteği yapan kullanıcının ID''si';
COMMENT ON COLUMN api_logs.timestamp IS 'İstek zamanı';
COMMENT ON COLUMN api_logs.success IS 'İsteğin başarılı olup olmadığı';
COMMENT ON COLUMN api_logs.duration_ms IS 'İstek süresi (milisaniye)';
COMMENT ON COLUMN api_logs.status_code IS 'HTTP durum kodu';
COMMENT ON COLUMN api_logs.details IS 'İstek detayları (JSON)'; 