import { ShopAnalytics } from '@/types/analytics';
import { useStoreMetrics } from '@/hooks/useStoreAnalytics';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricsGridProps {
  analytics: ShopAnalytics | null;
  isLoading: boolean;
  onRefresh?: () => void;
  compact?: boolean;
}

export function MetricsGrid({ analytics, isLoading, onRefresh, compact = false }: MetricsGridProps) {
  const metrics = useStoreMetrics(analytics);

  if (isLoading) {
    return (
      <div className={`grid ${compact ? 'grid-cols-2 gap-2' : 'grid-cols-2 md:grid-cols-3 gap-4'}`}>
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-3 animate-pulse">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-500">Analytics verisi bulunamadı</p>
        {onRefresh && (
          <Button variant="outline" onClick={onRefresh} className="mt-3">
            <RefreshCw className="w-4 h-4 mr-2" />
            Verileri Yenile
          </Button>
        )}
      </Card>
    );
  }

  const metricsArray = [
    metrics.productsMetric,
    metrics.ratingsMetric,
    metrics.reviewsMetric,
    metrics.viewsMetric,
    metrics.favoritesMetric,
    metrics.salesMetric
  ];

  return (
    <div className="space-y-4">
      {/* Refresh Button */}
      {onRefresh && !compact && (
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Mağaza Metrikleri</h3>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className={`grid ${compact ? 'grid-cols-2 gap-2' : 'grid-cols-2 md:grid-cols-3 gap-4'}`}>
        {metricsArray.map((metric, index) => (
          <MetricCard
            key={index}
            metric={metric}
            compact={compact}
          />
        ))}
      </div>

      {/* Last Updated */}
      {analytics?.last_updated && !compact && (
        <p className="text-xs text-gray-500 text-center">
          Son güncelleme: {new Date(analytics.last_updated).toLocaleString('tr-TR')}
        </p>
      )}
    </div>
  );
}

interface MetricCardProps {
  metric: {
    label: string;
    value: string | number;
    icon: string;
    format?: 'number' | 'currency' | 'rating' | 'percentage';
  };
  compact?: boolean;
}

function MetricCard({ metric, compact = false }: MetricCardProps) {
  const getValueColor = (format?: string) => {
    switch (format) {
      case 'currency':
        return 'text-green-600';
      case 'rating':
        return 'text-yellow-600';
      default:
        return 'text-gray-900';
    }
  };

  return (
    <Card className={`${compact ? 'p-3' : 'p-4'} hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={compact ? 'text-lg' : 'text-xl'}>{metric.icon}</span>
            <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-600 font-medium`}>
              {metric.label}
            </p>
          </div>
          <p className={`${compact ? 'text-lg' : 'text-2xl'} font-bold ${getValueColor(metric.format)} mt-1`}>
            {metric.value}
          </p>
        </div>
      </div>
    </Card>
  );
}

// Compact version for store cards
export function CompactMetrics({ analytics, isLoading }: { analytics: ShopAnalytics | null; isLoading: boolean }) {
  return (
    <MetricsGrid 
      analytics={analytics} 
      isLoading={isLoading} 
      compact={true}
    />
  );
}