-- Add missing unique constraint to etsy_stores table
DO $$
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'unique_user_shop'
    ) THEN
        -- Add the unique constraint
        ALTER TABLE etsy_stores 
        ADD CONSTRAINT unique_user_shop UNIQUE (user_id, shop_id);
        
        RAISE NOTICE 'Added unique constraint unique_user_shop on etsy_stores table';
    ELSE
        RAISE NOTICE 'Constraint unique_user_shop already exists';
    END IF;
END
$$; 