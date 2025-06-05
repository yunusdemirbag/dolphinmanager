import { Database } from '@/types/database.types';
import { SupabaseClient } from '@supabase/supabase-js';

// Tip tanımlamaları
export type SupabaseClientType = SupabaseClient<Database>;

// Environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_ETSY_CLIENT_ID?: string;
      [key: string]: string | undefined;
    }
  }
}

// Etsy mağaza tipini tanımla
export interface EtsyStore {
  id: string;
  user_id: string;
  shop_id: number;
  shop_name: string;
  title?: string;
  currency_code?: string;
  listing_active_count?: number;
  num_favorers?: number;
  review_count?: number;
  review_average?: number;
  url?: string;
  image_url?: string;
  is_active?: boolean;
  last_synced_at?: string;
}

// Etsy token tipini tanımla
export interface EtsyToken {
  id?: number;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  shop_id?: number;
  is_valid: boolean;
  updated_at?: string;
}

// Etsy API yanıt tiplerini tanımla
export interface EtsyApiResponse<T> {
  count: number;
  results: T[];
} 