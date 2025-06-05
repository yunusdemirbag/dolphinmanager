-- Etsy entegrasyonu için gerekli tablolar
-- 20240520000000_create_etsy_tables.sql

-- UUID uzantısını etkinleştir (eğer zaten etkin değilse)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Etsy token tablosu
CREATE TABLE IF NOT EXISTS "public"."etsy_tokens" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT NOT NULL,
  "expires_at" BIGINT NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("user_id")
);

-- Etsy mağaza verileri
CREATE TABLE IF NOT EXISTS "public"."etsy_store_data" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "shop_id" BIGINT NOT NULL,
  "data" JSONB NOT NULL,
  "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("user_id", "shop_id")
);

-- Etsy ürün verileri
CREATE TABLE IF NOT EXISTS "public"."etsy_listings_data" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "shop_id" BIGINT NOT NULL,
  "data" JSONB NOT NULL,
  "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("user_id", "shop_id")
);

-- Etsy istatistik verileri
CREATE TABLE IF NOT EXISTS "public"."etsy_stats_data" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "shop_id" BIGINT NOT NULL,
  "data" JSONB NOT NULL,
  "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("user_id", "shop_id")
);

-- Etsy sipariş verileri
CREATE TABLE IF NOT EXISTS "public"."etsy_receipts_data" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "shop_id" BIGINT NOT NULL,
  "data" JSONB NOT NULL,
  "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("user_id", "shop_id")
);

-- Etsy ödeme verileri
CREATE TABLE IF NOT EXISTS "public"."etsy_payments_data" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "shop_id" BIGINT NOT NULL,
  "data" JSONB NOT NULL,
  "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("user_id", "shop_id")
);

-- Etsy tablolarını oluşturmak için bir RPC fonksiyonu
CREATE OR REPLACE FUNCTION create_etsy_tables()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Bu tablolar yukarıda zaten oluşturuldu, ancak RPC ile de çağrılabilmesi için burada da tanımlıyoruz
  -- Bu teknik, hem migration hem de API ile tabloları oluşturabilmeyi sağlar
  
  -- UUID uzantısını etkinleştir
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  -- Etsy token tablosu
  CREATE TABLE IF NOT EXISTS "public"."etsy_tokens" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" BIGINT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("user_id")
  );

  -- Etsy mağaza verileri
  CREATE TABLE IF NOT EXISTS "public"."etsy_store_data" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "shop_id" BIGINT NOT NULL,
    "data" JSONB NOT NULL,
    "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("user_id", "shop_id")
  );

  -- Etsy ürün verileri
  CREATE TABLE IF NOT EXISTS "public"."etsy_listings_data" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "shop_id" BIGINT NOT NULL,
    "data" JSONB NOT NULL,
    "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("user_id", "shop_id")
  );

  -- Etsy istatistik verileri
  CREATE TABLE IF NOT EXISTS "public"."etsy_stats_data" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "shop_id" BIGINT NOT NULL,
    "data" JSONB NOT NULL,
    "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("user_id", "shop_id")
  );

  -- Etsy sipariş verileri
  CREATE TABLE IF NOT EXISTS "public"."etsy_receipts_data" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "shop_id" BIGINT NOT NULL,
    "data" JSONB NOT NULL,
    "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("user_id", "shop_id")
  );

  -- Etsy ödeme verileri
  CREATE TABLE IF NOT EXISTS "public"."etsy_payments_data" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "shop_id" BIGINT NOT NULL,
    "data" JSONB NOT NULL,
    "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("user_id", "shop_id")
  );
  
END;
$$; 