"use client"

import { useState, useEffect } from 'react'
import { QueueJob } from '@/src/lib/queue-manager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'

export function JobNotificationCenter() {
  const [activeJobs, setActiveJobs] = useState<QueueJob[]>([])
  const [completedJobs, setCompletedJobs] = useState<QueueJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  
  // Görünürlüğü kontrol etmek için
  useEffect(() => {
    // Sayfa görünür olduğunda işleri çek, gizli olduğunda durdur
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden)
    }
    
    // İlk yüklemede görünürlüğü ayarla
    setIsVisible(!document.hidden)
    
    // Event listener ekle
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Temizlik
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
  
  useEffect(() => {
    // Sayfa yüklendiğinde çalışacak
    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;
    
    const fetchJobs = async () => {
      // Son çağrıdan bu yana en az 15 saniye geçmediyse çağrı yapma
      const now = Date.now()
      if (now - lastFetchTime < 15000) {
        return
      }
      
      try {
        console.log('Fetching jobs...');
        setLastFetchTime(now)
        
        const response = await fetch('/api/etsy/listings/my-jobs', {
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            // Kullanıcı giriş yapmamış, bildirimleri gösterme
            if (isMounted) {
              setLoading(false);
              setError(null);
            }
            return;
          }
          
          const errorData = await response.json();
          throw new Error(errorData.error || `API error: ${response.status}`);
        }
        
        const jobs = await response.json();
        console.log('Fetched jobs:', jobs);
        
        // Component hala mount edilmişse state'i güncelle
        if (isMounted) {
          // Aktif ve tamamlanmış işleri ayır
          const active = Array.isArray(jobs) 
            ? jobs.filter(j => j.status === 'pending' || j.status === 'processing')
            : [];
            
          const completed = Array.isArray(jobs) 
            ? jobs.filter(j => j.status === 'completed' || j.status === 'failed')
                .slice(0, 5) // Son 5 tamamlanan iş
            : [];
          
          setActiveJobs(active);
          setCompletedJobs(completed);
          setLoading(false);
          setError(null);
          
          // Aktif iş yoksa ve tamamlanmış işler varsa, daha az sıklıkta kontrol et
          if (active.length === 0 && intervalId) {
            clearInterval(intervalId);
            intervalId = setInterval(fetchJobs, 30000); // 30 saniyede bir kontrol et
          }
        }
      } catch (error: any) {
        console.error('Jobs fetch error:', error);
        if (isMounted) {
          setLoading(false);
          setError(error.message || 'İşler yüklenirken bir hata oluştu');
        }
      }
    }
    
    // İlk yükleme
    fetchJobs();
    
    // Belirli aralıklarla kontrol et, ama sadece sayfa görünür olduğunda
    if (isVisible) {
      intervalId = setInterval(fetchJobs, 15000); // 15 saniyede bir kontrol et
    }
    
    // Temizlik
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      isMounted = false;
    }
  }, [isVisible, lastFetchTime]);
  
  // Yükleme durumu veya iş yoksa gösterme
  if (loading) {
    return null;
  }
  
  // Hata varsa küçük bir bildirim göster
  if (error) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Card className="shadow-lg border-red-200 bg-red-50">
          <CardContent className="p-3">
            <p className="text-sm text-red-600">
              <XCircle className="w-4 h-4 inline mr-1" />
              İşler yüklenemedi
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Aktif veya tamamlanmış iş yoksa gösterme
  if (activeJobs.length === 0 && completedJobs.length === 0) {
    return null;
  }
  
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-2 max-w-sm">
      {/* Aktif İşler */}
      {activeJobs.map(job => (
        <Card key={job.id} className="shadow-lg border-primary/20">
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <div className="flex items-center">
                {job.status === 'processing' ? (
                  <Loader2 className="w-4 h-4 mr-2 text-blue-500 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4 mr-2 text-yellow-500" />
                )}
                Ürün Oluşturuluyor
              </div>
              <span className="text-xs text-gray-500">
                {new Date(job.createdAt).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3 pt-0">
            <p className="text-sm text-gray-600 mb-2 truncate">
              {job.data?.listingData?.title || 'Ürün'}
            </p>
            <Progress 
              value={job.progress}
              className="h-2 mb-1"
            />
            <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
              <span>{job.progress}% tamamlandı</span>
              <span>
                {job.status === 'processing' ? 'İşleniyor' : 'Sırada'}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* Tamamlanan İşler (Küçük bildirimler) */}
      {completedJobs.map(job => (
        <Card 
          key={job.id} 
          className={`shadow-lg ${
            job.status === 'completed' 
              ? 'border-green-200 bg-green-50' 
              : 'border-red-200 bg-red-50'
          }`}
        >
          <CardContent className="p-3 flex items-start space-x-3">
            {job.status === 'completed' ? (
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {job.data?.listingData?.title || 'Ürün'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {job.status === 'completed' 
                  ? 'Başarıyla oluşturuldu' 
                  : job.error || 'Oluşturma başarısız'}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 