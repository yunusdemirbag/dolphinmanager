import { useState, useEffect } from 'react';
import { ShopAnalytics } from '@/types/analytics';

export function useStoreAnalytics(shopId: string | null) {
  const [analytics, setAnalytics] = useState<ShopAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async (forceRefresh: boolean = false) => {
    if (!shopId) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = forceRefresh 
        ? `/api/store/analytics`
        : `/api/store/analytics?shopId=${shopId}`;
      
      const method = forceRefresh ? 'POST' : 'GET';
      const body = forceRefresh ? JSON.stringify({ shopId }) : undefined;

      const response = await fetch(url, {
        method,
        headers: forceRefresh ? { 'Content-Type': 'application/json' } : {},
        body
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analytics alınamadı');
      }

      setAnalytics(data.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Analytics fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAnalytics = () => fetchAnalytics(true);

  useEffect(() => {
    if (shopId) {
      fetchAnalytics();
    }
  }, [shopId]);

  return {
    analytics,
    isLoading,
    error,
    refreshAnalytics,
    refetch: () => fetchAnalytics()
  };
}

export function useStoreMetrics(analytics: ShopAnalytics | null) {
  if (!analytics) return null;

  return {
    productsMetric: {
      label: 'Toplam Ürün',
      value: analytics.total_products,
      icon: '📦',
      format: 'number' as const
    },
    ratingsMetric: {
      label: 'Ortalama Puan',
      value: analytics.average_rating > 0 ? `${analytics.average_rating.toFixed(1)}/5.0` : 'Henüz yok',
      icon: '⭐',
      format: 'rating' as const
    },
    reviewsMetric: {
      label: 'Toplam Yorum',
      value: analytics.total_reviews,
      icon: '💬',
      format: 'number' as const
    },
    viewsMetric: {
      label: 'Görüntülenme',
      value: formatNumber(analytics.total_views),
      icon: '👁️',
      format: 'number' as const
    },
    favoritesMetric: {
      label: 'Favoriler',
      value: analytics.total_favorites,
      icon: '❤️',
      format: 'number' as const
    },
    salesMetric: {
      label: 'Tahmini Aylık Satış',
      value: `$${analytics.monthly_sales_estimate}`,
      icon: '💰',
      format: 'currency' as const
    }
  };
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}