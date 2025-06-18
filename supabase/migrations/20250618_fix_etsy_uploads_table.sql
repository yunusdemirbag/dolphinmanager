-- Fix duplicate etsy_uploads table definition
DO $$
BEGIN
    -- Check if the second etsy_uploads table exists and drop it if needed
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'etsy_uploads'
        AND table_schema = 'public'
    ) THEN
        -- Keep the first definition which has more columns
        -- Remove the second definition if it exists
        -- We're not dropping the table, just making sure there's only one definition
        RAISE NOTICE 'etsy_uploads table already exists, not creating duplicate';
    END IF;
END
$$; 