-- Create a function to execute SQL queries
CREATE OR REPLACE FUNCTION public.execute_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Only allow authorized users to execute SQL
  IF NOT (SELECT rolsuper FROM pg_roles WHERE rolname = CURRENT_USER) THEN
    RAISE EXCEPTION 'Permission denied: only superusers can execute arbitrary SQL';
  END IF;

  -- Execute the SQL query and capture the result
  EXECUTE 'WITH result AS (' || sql_query || ') SELECT jsonb_agg(result) FROM result' INTO result;
  
  RETURN COALESCE(result, '[]'::JSONB);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'detail', SQLSTATE,
    'query', sql_query
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.execute_sql TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_sql TO service_role;

-- Add image_count and video_count columns to etsy_uploads table if they don't exist
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
  END IF;
END
$$; 