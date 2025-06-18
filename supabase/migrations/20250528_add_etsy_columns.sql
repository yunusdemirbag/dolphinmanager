-- Fix the etsy_stores table to rename image_url to image_url_760x100
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
    END IF;
END
$$; 