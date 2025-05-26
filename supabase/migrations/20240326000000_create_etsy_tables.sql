-- Etsy veri tablolarını oluşturan fonksiyonlar

-- Mağaza verileri tablosu
CREATE OR REPLACE FUNCTION create_etsy_store_data_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.etsy_store_data (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id BIGINT NOT NULL,
    data JSONB NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, shop_id)
  );

  -- RLS politikaları
  ALTER TABLE public.etsy_store_data ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can view their own store data"
    ON public.etsy_store_data
    FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert their own store data"
    ON public.etsy_store_data
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update their own store data"
    ON public.etsy_store_data
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can delete their own store data"
    ON public.etsy_store_data
    FOR DELETE
    USING (auth.uid() = user_id);
END;
$$;

-- Ürün listeleri tablosu
CREATE OR REPLACE FUNCTION create_etsy_listings_data_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.etsy_listings_data (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id BIGINT NOT NULL,
    data JSONB NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, shop_id)
  );

  -- RLS politikaları
  ALTER TABLE public.etsy_listings_data ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can view their own listings data"
    ON public.etsy_listings_data
    FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert their own listings data"
    ON public.etsy_listings_data
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update their own listings data"
    ON public.etsy_listings_data
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can delete their own listings data"
    ON public.etsy_listings_data
    FOR DELETE
    USING (auth.uid() = user_id);
END;
$$;

-- Mağaza istatistikleri tablosu
CREATE OR REPLACE FUNCTION create_etsy_stats_data_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.etsy_stats_data (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id BIGINT NOT NULL,
    data JSONB NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, shop_id)
  );

  -- RLS politikaları
  ALTER TABLE public.etsy_stats_data ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can view their own stats data"
    ON public.etsy_stats_data
    FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert their own stats data"
    ON public.etsy_stats_data
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update their own stats data"
    ON public.etsy_stats_data
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can delete their own stats data"
    ON public.etsy_stats_data
    FOR DELETE
    USING (auth.uid() = user_id);
END;
$$;

-- Siparişler tablosu
CREATE OR REPLACE FUNCTION create_etsy_receipts_data_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.etsy_receipts_data (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id BIGINT NOT NULL,
    data JSONB NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, shop_id)
  );

  -- RLS politikaları
  ALTER TABLE public.etsy_receipts_data ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can view their own receipts data"
    ON public.etsy_receipts_data
    FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert their own receipts data"
    ON public.etsy_receipts_data
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update their own receipts data"
    ON public.etsy_receipts_data
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can delete their own receipts data"
    ON public.etsy_receipts_data
    FOR DELETE
    USING (auth.uid() = user_id);
END;
$$;

-- Ödemeler tablosu
CREATE OR REPLACE FUNCTION create_etsy_payments_data_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.etsy_payments_data (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id BIGINT NOT NULL,
    data JSONB NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, shop_id)
  );

  -- RLS politikaları
  ALTER TABLE public.etsy_payments_data ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can view their own payments data"
    ON public.etsy_payments_data
    FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert their own payments data"
    ON public.etsy_payments_data
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update their own payments data"
    ON public.etsy_payments_data
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can delete their own payments data"
    ON public.etsy_payments_data
    FOR DELETE
    USING (auth.uid() = user_id);
END;
$$; 