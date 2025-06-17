-- Refresh the schema cache to recognize new columns
-- This is needed because sometimes PostgREST doesn't recognize new columns immediately

-- First, add any missing columns to etsy_uploads table
DO $$
BEGIN
  -- Check if the table exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'etsy_uploads'
    AND table_schema = 'public'
  ) THEN
    -- Check if image_count column exists
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'etsy_uploads'
      AND column_name = 'image_count'
    ) THEN
      ALTER TABLE etsy_uploads ADD COLUMN image_count INTEGER DEFAULT 0;
      RAISE NOTICE 'Added image_count column to etsy_uploads table';
    END IF;
    
    -- Check if video_count column exists
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'etsy_uploads'
      AND column_name = 'video_count'
    ) THEN
      ALTER TABLE etsy_uploads ADD COLUMN video_count INTEGER DEFAULT 0;
      RAISE NOTICE 'Added video_count column to etsy_uploads table';
    END IF;
    
    -- Check if has_variations column exists
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'etsy_uploads'
      AND column_name = 'has_variations'
    ) THEN
      ALTER TABLE etsy_uploads ADD COLUMN has_variations BOOLEAN DEFAULT false;
      RAISE NOTICE 'Added has_variations column to etsy_uploads table';
    END IF;
    
    -- Check if variation_count column exists
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'etsy_uploads'
      AND column_name = 'variation_count'
    ) THEN
      ALTER TABLE etsy_uploads ADD COLUMN variation_count INTEGER DEFAULT 0;
      RAISE NOTICE 'Added variation_count column to etsy_uploads table';
    END IF;
    
    -- Check if tags column exists
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'etsy_uploads'
      AND column_name = 'tags'
    ) THEN
      ALTER TABLE etsy_uploads ADD COLUMN tags TEXT[];
      RAISE NOTICE 'Added tags column to etsy_uploads table';
    END IF;
  END IF;
END
$$;

-- Force PostgREST to reload its schema cache
-- This is done by calling a special function that triggers a schema reload
SELECT pg_notify('pgrst', 'reload schema');

-- Create a dummy table and immediately drop it to force schema refresh
CREATE TABLE IF NOT EXISTS _schema_cache_refresh (id SERIAL PRIMARY KEY);
DROP TABLE _schema_cache_refresh; 