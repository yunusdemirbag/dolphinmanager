-- Fix the etsy_stores table to rename image_url to image_url_760x100 if needed
DO $$
BEGIN
    -- Check if the column exists before trying to rename
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'etsy_stores'
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE etsy_stores RENAME COLUMN image_url TO image_url_760x100;
        RAISE NOTICE 'Column image_url renamed to image_url_760x100';
    ELSE
        RAISE NOTICE 'Column image_url does not exist, no rename needed';
    END IF;
END
$$; 