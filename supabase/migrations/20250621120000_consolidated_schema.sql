-- Bu betik, üretim veritabanından alınan birleştirilmiş şemayı temsil eder.
-- Tablo oluşturma sırası, bağımlılıkları çözmek için düzeltilmiştir.

-- Bağımlılıklar: auth.users (yerleşik)
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  etsy_shop_name text,
  etsy_shop_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_synced_at timestamp with time zone,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- Bağımlılıklar: auth.users
CREATE TABLE public.api_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  endpoint text,
  method text,
  user_id uuid,
  timestamp timestamp with time zone DEFAULT now(),
  success boolean DEFAULT true,
  duration_ms integer,
  status_code integer,
  details jsonb,
  CONSTRAINT api_logs_pkey PRIMARY KEY (id),
  CONSTRAINT api_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Bağımlılıklar: Yok
CREATE TABLE public.cron_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_name text NOT NULL,
  result text NOT NULL,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cron_logs_pkey PRIMARY KEY (id)
);

-- Bağımlılıklar: auth.users
CREATE TABLE public.etsy_cache (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  shop_id bigint,
  data_type text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT etsy_cache_pkey PRIMARY KEY (id),
  CONSTRAINT etsy_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Bağımlılıklar: Yok (Sequence, SERIAL tarafından oluşturulur)
CREATE TABLE public.etsy_images (
  id SERIAL NOT NULL,
  listing_id bigint NOT NULL,
  image_url text NOT NULL,
  local_path text NOT NULL,
  original_url text NOT NULL,
  cached_at timestamp with time zone DEFAULT now(),
  last_updated timestamp with time zone DEFAULT now(),
  status text DEFAULT 'active'::text,
  CONSTRAINT etsy_images_pkey PRIMARY KEY (id)
);

-- Bağımlılıklar: auth.users
CREATE TABLE public.queue_jobs (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  type text NOT NULL,
  status text NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  data jsonb,
  error text,
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  CONSTRAINT queue_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT queue_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Bağımlılıklar: public.profiles
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  price numeric NOT NULL,
  currency text DEFAULT 'TRY'::text,
  stock_quantity integer DEFAULT 0,
  etsy_listing_id bigint UNIQUE,
  images ARRAY,
  tags ARRAY,
  category text,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'draft'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- Bağımlılıklar: public.profiles
CREATE TABLE public.etsy_auth_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_verifier text,
  state text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT etsy_auth_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT etsy_auth_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- Bağımlılıklar: public.profiles
CREATE TABLE public.etsy_stores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shop_id bigint NOT NULL,
  shop_name text NOT NULL,
  title text,
  currency_code text DEFAULT 'USD'::text,
  listing_active_count integer DEFAULT 0,
  num_favorers integer DEFAULT 0,
  review_count integer DEFAULT 0,
  review_average numeric DEFAULT 0,
  url text,
  image_url_760x100 text,
  is_active boolean DEFAULT true,
  last_synced_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  announcement text,
  is_vacation boolean DEFAULT false,
  avatar_url text,
  CONSTRAINT etsy_stores_pkey PRIMARY KEY (id),
  CONSTRAINT etsy_stores_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- Bağımlılıklar: public.profiles
CREATE TABLE public.etsy_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_type text DEFAULT 'Bearer'::text,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT etsy_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT etsy_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- Bağımlılıklar: public.profiles, public.products
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  total_amount numeric NOT NULL,
  currency text DEFAULT 'TRY'::text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text])),
  etsy_order_id text,
  shipping_address jsonb,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- Bağımlılıklar: public.profiles, public.products
CREATE TABLE public.analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid,
  metric_type text NOT NULL CHECK (metric_type = ANY (ARRAY['view'::text, 'favorite'::text, 'sale'::text, 'revenue'::text])),
  value numeric NOT NULL,
  date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT analytics_pkey PRIMARY KEY (id),
  CONSTRAINT analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT analytics_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
); 