-- Fix etsy_uploads table columns
DO $$
BEGIN
    -- Check if the table exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'etsy_uploads'
        AND table_schema = 'public'
    ) THEN
        -- Check if the table has the correct columns and add them if they don't exist
        
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
        
        -- Check if category_tokens column exists
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'etsy_uploads'
            AND column_name = 'category_tokens'
        ) THEN
            ALTER TABLE etsy_uploads ADD COLUMN category_tokens INTEGER;
            RAISE NOTICE 'Added category_tokens column to etsy_uploads table';
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
        
        -- Check if shop_id column is the correct type (should be BIGINT)
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'etsy_uploads'
            AND column_name = 'shop_id'
            AND data_type = 'text'
        ) THEN
            -- Alter the column type from TEXT to BIGINT
            ALTER TABLE etsy_uploads ALTER COLUMN shop_id TYPE BIGINT USING shop_id::BIGINT;
            RAISE NOTICE 'Changed shop_id column type from TEXT to BIGINT';
        END IF;
        
        -- Make sure user_id references the correct table
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'etsy_uploads'
            AND column_name = 'user_id'
        ) THEN
            -- Drop any existing foreign key constraint
            DO $inner$
            BEGIN
                EXECUTE (
                    SELECT 'ALTER TABLE etsy_uploads DROP CONSTRAINT ' || conname
                    FROM pg_constraint
                    WHERE conrelid = 'etsy_uploads'::regclass
                    AND conname LIKE '%user_id%'
                    LIMIT 1
                );
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE 'No foreign key constraint to drop on user_id';
            END $inner$;
            
            -- Add the correct foreign key constraint
            ALTER TABLE etsy_uploads ADD CONSTRAINT etsy_uploads_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added correct foreign key constraint for user_id';
        END IF;
    END IF;
END
$$; 