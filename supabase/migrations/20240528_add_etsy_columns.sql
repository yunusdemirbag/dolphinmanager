-- Add last_synced_at column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Add announcement column to etsy_stores table
ALTER TABLE etsy_stores ADD COLUMN IF NOT EXISTS announcement TEXT;

-- Add missing columns to etsy_stores table
ALTER TABLE etsy_stores 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS currency_code TEXT,
ADD COLUMN IF NOT EXISTS is_vacation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS listing_active_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS num_favorers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS url TEXT,
ADD COLUMN IF NOT EXISTS image_url_760x100 TEXT,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_average DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT; 