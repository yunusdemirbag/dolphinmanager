export interface Store {
  id: string;
  user_id: string;
  shop_id: number;
  shop_name: string;
  connected_at: Date;
  last_sync_at: Date;
  last_token_refresh?: Date | null;
  last_activated_at?: Date | null;
  is_active: boolean;
  shop_icon_url?: string | null;
  hasValidToken: boolean;
  total_products?: number;
}
