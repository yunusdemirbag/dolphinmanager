"use client"

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, Clock, X, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface QueueJob {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  title: string;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

interface QueueSummary {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export function QueueStatusIndicator() {
  const { toast } = useToast();
  const [queueSummary, setQueueSummary] = useState<QueueSummary | null>(null);
  const [processingJobs, setProcessingJobs] = useState<QueueJob[]>([]);
  const [pendingJobs, setPendingJobs] = useState<QueueJob[]>([]);
  const [showIndicator, setShowIndicator] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kuyruk durumunu kontrol et
  const checkQueueStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/etsy/listings/queue/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Session cookies'lerini dahil et
      });

      if (!response.ok) {
        throw new Error(`API hatası: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setQueueSummary(data.queue_summary);
        setProcessingJobs(data.jobs.processing || []);
        setPendingJobs(data.jobs.pending || []);

        // Gösterge görünürlüğünü belirle (işlenen veya bekleyen iş varsa göster)
        setShowIndicator(
          (data.queue_summary.processing > 0 || data.queue_summary.pending > 0)
        );

        // Yeni tamamlanan işler için bildirim göster
        if (data.jobs.completed && data.jobs.completed.length > 0) {
          const recentlyCompleted = data.jobs.completed.filter((job: QueueJob) => {
            const completedTime = new Date(job.completed_at || '').getTime();
            const now = new Date().getTime();
            // Son 30 saniye içinde tamamlananları göster
            return now - completedTime < 30000;
          });

          recentlyCompleted.forEach((job: QueueJob) => {
            toast({
              title: '✅ Ürün Eklendi',
              description: `"${job.title}" başarıyla Etsy'ye eklendi.`,
              duration: 5000
            });
          });
        }

        // Hata alan işler için bildirim göster
        if (data.jobs.failed && data.jobs.failed.length > 0) {
          const recentlyFailed = data.jobs.failed.filter((job: QueueJob) => {
            const failedTime = new Date(job.completed_at || '').getTime();
            const now = new Date().getTime();
            // Son 30 saniye içinde hata alanları göster
            return now - failedTime < 30000;
          });

          recentlyFailed.forEach((job: QueueJob) => {
            toast({
              variant: 'destructive',
              title: '❌ Ürün Eklenemedi',
              description: `"${job.title}" eklenirken hata oluştu: ${job.error || 'Bilinmeyen hata'}`,
              duration: 8000
            });
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Kuyruk durumu alınamadı');
      console.error('Kuyruk durumu alınamadı:', err);
    } finally {
      setLoading(false);
    }
  };

  // Periyodik olarak kuyruk durumunu kontrol et
  useEffect(() => {
    // İlk kontrol
    checkQueueStatus();

    // Her 10 saniyede bir kontrol et
    const interval = setInterval(() => {
      checkQueueStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Gösterge görünmüyorsa hiçbir şey gösterme
  if (!showIndicator) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-md w-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-lg flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Etsy Ürün Kuyruğu
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setShowIndicator(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {loading && !queueSummary && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Kuyruk durumu yükleniyor...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md text-red-600 dark:text-red-400 text-sm mb-3">
          <AlertCircle className="h-4 w-4 inline mr-1" />
          {error}
        </div>
      )}

      {queueSummary && (
        <div className="space-y-4">
          {/* Özet bilgiler */}
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="outline" className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Bekleyen: {queueSummary.pending}
            </Badge>
            <Badge variant="secondary" className="flex items-center">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              İşleniyor: {queueSummary.processing}
            </Badge>
            <Badge variant="outline" className="flex items-center bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle className="h-3 w-3 mr-1" />
              Tamamlanan: {queueSummary.completed}
            </Badge>
            {queueSummary.failed > 0 && (
              <Badge variant="destructive" className="flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                Başarısız: {queueSummary.failed}
              </Badge>
            )}
          </div>

          {/* İşlenen işler */}
          {processingJobs.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">İşleniyor</h4>
              {processingJobs.map(job => (
                <div key={job.id} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-sm truncate">{job.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {job.progress}%
                    </Badge>
                  </div>
                  <Progress value={job.progress} className="h-1" />
                </div>
              ))}
            </div>
          )}

          {/* Bekleyen işler */}
          {pendingJobs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Sıradaki Ürünler</h4>
              {pendingJobs.slice(0, 3).map((job, index) => (
                <div key={job.id} className="bg-gray-50 dark:bg-gray-800 p-2 rounded-md flex justify-between items-center">
                  <span className="text-sm truncate">{job.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {index === 0 ? 'Sonraki' : `${index + 1}. sırada`}
                  </Badge>
                </div>
              ))}
              {pendingJobs.length > 3 && (
                <div className="text-xs text-gray-500 text-center">
                  +{pendingJobs.length - 3} daha bekliyor
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end mt-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={checkQueueStatus} 
              disabled={loading}
              className="text-xs"
            >
              {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Yenile
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 