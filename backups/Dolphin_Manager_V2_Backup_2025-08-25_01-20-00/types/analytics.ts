export interface ShopAnalytics {
  shop_id: string;
  total_products: number;
  active_listings: number;
  total_reviews: number;
  average_rating: number;
  total_views: number;
  total_favorites: number;
  monthly_sales_estimate: number;
  top_selling_product?: {
    listing_id: number;
    title: string;
    views: number;
    favorites: number;
    price: number;
  } | null;
  calculated_at?: Date;
  last_api_call?: Date;
  last_updated?: Date | null;
}

export interface MetricCard {
  label: string;
  value: string | number;
  icon: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  format?: 'number' | 'currency' | 'rating' | 'percentage';
}

export interface StorePerformance {
  views_trend: number;
  favorites_trend: number;
  sales_trend: number;
  rating_trend: number;
  period: 'daily' | 'weekly' | 'monthly';
}