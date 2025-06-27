export interface Store {
  id: string;
  user_id: string;
  etsy_user_id: string;
  shop_id: string;
  shop_name: string;
  shop_icon_url?: string;
  connected_at: Date;
  last_sync_at: Date;
  last_token_refresh: Date | null;
  is_active: boolean;
  hasValidToken: boolean;
  total_products?: number;
} 