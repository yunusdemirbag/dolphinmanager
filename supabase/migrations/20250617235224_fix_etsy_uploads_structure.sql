-- Fix etsy_uploads table structure
-- This migration fixes the etsy_uploads table by dropping it and recreating with the correct structure

-- Drop the existing table if it exists
DROP TABLE IF EXISTS etsy_uploads;

-- Create the etsy_uploads table with the correct structure
CREATE TABLE etsy_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id BIGINT,
  shop_id BIGINT,
  title TEXT,
  state TEXT DEFAULT 'draft',
  upload_duration INTEGER, -- in milliseconds
  image_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  has_variations BOOLEAN DEFAULT false,
  variation_count INTEGER DEFAULT 0,
  title_tokens INTEGER DEFAULT 0,
  tags_tokens INTEGER DEFAULT 0,
  tags TEXT[],
  total_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_listing_id UNIQUE (listing_id)
);

-- Enable RLS
ALTER TABLE etsy_uploads ENABLE ROW LEVEL SECURITY;

-- Create policy for etsy_uploads
CREATE POLICY "Users can manage their own uploads" ON etsy_uploads
  FOR ALL USING (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_etsy_uploads_user_id ON etsy_uploads(user_id);
CREATE INDEX idx_etsy_uploads_listing_id ON etsy_uploads(listing_id);
CREATE INDEX idx_etsy_uploads_created_at ON etsy_uploads(created_at);

-- Force PostgREST to reload its schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- Create a dummy table and immediately drop it to force schema refresh
CREATE TABLE IF NOT EXISTS _schema_cache_refresh_etsy_uploads (id SERIAL PRIMARY KEY);
DROP TABLE _schema_cache_refresh_etsy_uploads;
