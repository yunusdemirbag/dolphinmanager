-- Etsy token ve mağaza yönetimi için güncellemeler

-- Etsy tokens tablosunu güncelle
ALTER TABLE etsy_tokens
  ADD COLUMN IF NOT EXISTS shop_id BIGINT,
  ADD COLUMN IF NOT EXISTS is_valid BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS scopes TEXT[];

-- Etsy stores tablosuna yeni alanlar ekle
ALTER TABLE etsy_stores
  ADD COLUMN IF NOT EXISTS token_id UUID REFERENCES etsy_tokens(id),
  ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sync_frequency INTEGER DEFAULT 3600, -- saniye cinsinden
  ADD COLUMN IF NOT EXISTS last_sync_status TEXT,
  ADD COLUMN IF NOT EXISTS last_sync_error TEXT;

-- İndeksler ekle
CREATE INDEX IF NOT EXISTS idx_etsy_tokens_user_id ON etsy_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_etsy_tokens_shop_id ON etsy_tokens(shop_id);
CREATE INDEX IF NOT EXISTS idx_etsy_tokens_expires_at ON etsy_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_etsy_stores_token_id ON etsy_stores(token_id);

-- RLS politikalarını güncelle
DROP POLICY IF EXISTS "Users can manage own tokens" ON etsy_tokens;
CREATE POLICY "Users can manage own tokens" ON etsy_tokens
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own stores" ON etsy_stores;
CREATE POLICY "Users can manage own stores" ON etsy_stores
  FOR ALL USING (auth.uid() = user_id); 