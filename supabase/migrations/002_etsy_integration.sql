-- Add Etsy integration tables

-- Table for storing Etsy OAuth sessions (temporary)
CREATE TABLE etsy_auth_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  code_verifier TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing Etsy access tokens
CREATE TABLE etsy_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing Etsy stores
CREATE TABLE etsy_stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  shop_id BIGINT NOT NULL,
  shop_name TEXT NOT NULL,
  title TEXT,
  currency_code TEXT DEFAULT 'USD',
  listing_active_count INTEGER DEFAULT 0,
  num_favorers INTEGER DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  review_average DECIMAL(3,2) DEFAULT 0,
  url TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, shop_id)
);

-- Enable RLS
ALTER TABLE etsy_auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE etsy_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE etsy_stores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own auth sessions" ON etsy_auth_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own tokens" ON etsy_tokens
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own stores" ON etsy_stores
  FOR ALL USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_etsy_tokens_updated_at BEFORE UPDATE ON etsy_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_etsy_stores_updated_at BEFORE UPDATE ON etsy_stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_etsy_tokens_user_id ON etsy_tokens(user_id);
CREATE INDEX idx_etsy_tokens_expires_at ON etsy_tokens(expires_at);
CREATE INDEX idx_etsy_stores_user_id ON etsy_stores(user_id);
CREATE INDEX idx_etsy_stores_shop_id ON etsy_stores(shop_id);

-- Add unique constraint to products for Etsy listing ID
ALTER TABLE products ADD CONSTRAINT unique_etsy_listing_id UNIQUE (etsy_listing_id);

-- Clean up old auth sessions (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_auth_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM etsy_auth_sessions 
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (you can set this up as a cron job)
-- SELECT cron.schedule('cleanup-auth-sessions', '0 * * * *', 'SELECT cleanup_old_auth_sessions();');
