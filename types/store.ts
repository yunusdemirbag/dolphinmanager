export interface Store {
  id: string;
  user_id: string;
  shop_id: number;
  shop_name: string;
  etsy_user_id?: number;
  connected_at: Date;
  last_sync_at: Date;
  last_token_refresh?: Date | null;
  last_activated_at?: Date | null;
  is_active: boolean;
  is_connected: boolean;
  shop_icon_url?: string | null;
  hasValidToken: boolean;
  total_products?: number;
  disconnected_at?: Date | null;
  disconnect_reason?: string | null;
}
