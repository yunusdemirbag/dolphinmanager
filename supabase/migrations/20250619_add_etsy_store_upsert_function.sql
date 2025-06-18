-- Create a stored procedure for upserting etsy_stores records
CREATE OR REPLACE FUNCTION upsert_etsy_store(
    p_user_id UUID,
    p_shop_id BIGINT,
    p_shop_name TEXT,
    p_title TEXT DEFAULT NULL,
    p_currency_code TEXT DEFAULT 'USD',
    p_listing_active_count INTEGER DEFAULT 0,
    p_num_favorers INTEGER DEFAULT 0,
    p_review_count INTEGER DEFAULT 0,
    p_review_average DECIMAL(3,2) DEFAULT 0,
    p_url TEXT DEFAULT NULL,
    p_image_url_760x100 TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT true
) RETURNS VOID AS $$
DECLARE
    v_existing_id UUID;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Check if the record already exists
    SELECT id INTO v_existing_id 
    FROM etsy_stores 
    WHERE user_id = p_user_id AND shop_id = p_shop_id;
    
    IF v_existing_id IS NOT NULL THEN
        -- Update existing record
        UPDATE etsy_stores
        SET 
            shop_name = p_shop_name,
            title = p_title,
            currency_code = p_currency_code,
            listing_active_count = p_listing_active_count,
            num_favorers = p_num_favorers,
            review_count = p_review_count,
            review_average = p_review_average,
            url = p_url,
            image_url_760x100 = p_image_url_760x100,
            is_active = p_is_active,
            last_synced_at = v_now,
            updated_at = v_now
        WHERE id = v_existing_id;
    ELSE
        -- Insert new record
        INSERT INTO etsy_stores (
            user_id,
            shop_id,
            shop_name,
            title,
            currency_code,
            listing_active_count,
            num_favorers,
            review_count,
            review_average,
            url,
            image_url_760x100,
            is_active,
            last_synced_at,
            created_at,
            updated_at
        ) VALUES (
            p_user_id,
            p_shop_id,
            p_shop_name,
            p_title,
            p_currency_code,
            p_listing_active_count,
            p_num_favorers,
            p_review_count,
            p_review_average,
            p_url,
            p_image_url_760x100,
            p_is_active,
            v_now,
            v_now,
            v_now
        );
    END IF;
END;
$$ LANGUAGE plpgsql; 