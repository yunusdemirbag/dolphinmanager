import { v4 as uuidv4 } from 'uuid';
// import { createClient } from '@/lib/supabase/server';
// import { createClientFromBrowser } from '@/lib/supabase/client';

// Helper function to get the appropriate Supabase client based on context
async function getSupabaseClient() {
  try {
    // Check if we're in a request context (server-side)
    if (typeof window === 'undefined') {
      try {
        return await createClient();
      } catch (error) {
        console.error('Error creating server client, falling back to browser client:', error);
        return createClientFromBrowser();
      }
    } else {
      // We're in browser context
      return createClientFromBrowser();
    }
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    return createClientFromBrowser(); // Fallback to browser client
  }
}

export interface QueueJob {
  id: string;
  userId: string;
  type: 'CREATE_LISTING' | 'BATCH_UPLOAD_LISTINGS';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  data: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
}

class QueueManager {
  private jobs: Map<string, QueueJob> = new Map();
  private processing: Set<string> = new Set();
  private maxConcurrent = 3; // Aynı anda en fazla 3 iş
  private maxRetries = 3;
  private processingInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  public enablePersistence = true; // Veritabanı kalıcılığı varsayılan olarak aktif
  private batchSize = 5; // Bir batch'te kaç ürün işleneceği
  private batchDelay = 2000; // Her batch arası bekleme süresi (ms)

  constructor() {
    // Background işleme başlat
    this.startBackgroundProcessing();
  }

  // Background işlemeyi başlat
  private startBackgroundProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    // Her 5 saniyede bir queue'yu kontrol et
    this.processingInterval = setInterval(() => {
      this.processQueue().catch(err => {
        console.error('Queue processing error:', err);
      });
    }, 5000);
  }

  // Job ekleme
  public async addJob(jobData: Partial<QueueJob>): Promise<string> {
    const id = jobData.id || uuidv4();
    
    const job: QueueJob = {
      id,
      userId: jobData.userId || '',
      type: jobData.type || 'CREATE_LISTING',
      status: 'pending',
      progress: 0,
      data: jobData.data || {},
      createdAt: new Date(),
      retryCount: 0
    };
    
    this.jobs.set(id, job);

    if (this.enablePersistence) {
      try {
        const supabase = await getSupabaseClient();
        await supabase.from('queue_jobs').insert({
          id: job.id,
          user_id: job.userId,
          type: job.type,
          status: job.status,
          progress: job.progress,
          data: job.data,
          retry_count: job.retryCount,
          created_at: job.createdAt.toISOString(),
        });
      } catch (error) {
        console.error('Failed to save job to database:', error);
      }
    }
    
    // Job'u hemen işlemeye başla
    setTimeout(() => {
      this.processQueue().catch(err => {
        console.error('Queue processing error:', err);
      });
    }, 100);
    
    return id;
  }
  
  // Job'u ID'ye göre al
  public getJobById(id: string): QueueJob | undefined {
    return this.jobs.get(id);
  }

  // Var olan job'un durumunu getir
  public async getJobStatus(id: string): Promise<QueueJob | null> {
    // Önce memory'den kontrol et
    const job = this.jobs.get(id);
    if (job) return job;
    
    // Memory'de yoksa ve persistence açıksa, DB'den kontrol et
    if (this.enablePersistence) {
      try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
          .from('queue_jobs')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        
        if (data) {
          // DB'den gelen veriyi QueueJob formatına dönüştür
          const job: QueueJob = {
            id: data.id,
            userId: data.user_id,
            type: data.type as 'CREATE_LISTING' | 'BATCH_UPLOAD_LISTINGS',
            status: data.status as 'pending' | 'processing' | 'completed' | 'failed',
            progress: data.progress,
            data: data.data,
            error: data.error,
            createdAt: new Date(data.created_at),
            startedAt: data.started_at ? new Date(data.started_at) : undefined,
            completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
            retryCount: data.retry_count
          };
          
          // Memory'ye ekle
          this.jobs.set(id, job);
          return job;
        }
      } catch (error) {
        console.error('Failed to get job from database:', error);
      }
    }
    
    return null;
  }
  
  // Tüm kuyruğu işle
  public async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return; // Zaten işleniyor
    }
    
    this.isProcessing = true;
    
    try {
      // Pending durumundaki jobları al
      const pendingJobs = Array.from(this.jobs.values()).filter(
        job => job.status === 'pending' && !this.processing.has(job.id)
      );
      
      // İşlenecek job sayısını sınırla
      const availableSlots = this.maxConcurrent - this.processing.size;
      const jobsToProcess = pendingJobs.slice(0, availableSlots);
      
      // Jobları async olarak işle
      await Promise.all(
        jobsToProcess.map(job => this.processJob(job))
      );
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }
  
  // Tek bir job'u işle
  private async processJob(job: QueueJob): Promise<void> {
    // İşlemeye başlıyor olarak işaretle
    this.processing.add(job.id);
    job.status = 'processing';
    job.startedAt = new Date();
    this.jobs.set(job.id, { ...job });
    
    // DB'yi güncelle
    if (this.enablePersistence) {
      try {
        const supabase = await getSupabaseClient();
        await supabase
          .from('queue_jobs')
          .update({
            status: job.status,
            progress: job.progress,
            started_at: job.startedAt?.toISOString(),
          })
          .eq('id', job.id);
      } catch (error) {
        console.error('Failed to update job in database:', error);
      }
    }
    
    try {
      // Job tipine göre işle
      if (job.type === 'CREATE_LISTING') {
        await this.processCreateListing(job);
      } else if (job.type === 'BATCH_UPLOAD_LISTINGS') {
        await this.processBatchUploadListings(job);
      }
      
      // Başarıyla tamamlandı
      job.status = 'completed';
      job.completedAt = new Date();
    } catch (error: any) {
      console.error(`Job ${job.id} failed:`, error);
      
      // Hata durumu
      job.status = 'failed';
      job.error = error.message || 'Unknown error';
      
      // Retry'ı dene
      if (job.retryCount < this.maxRetries) {
        job.retryCount++;
        job.status = 'pending';
        job.progress = 0;
        job.error = `Retry ${job.retryCount}/${this.maxRetries}: ${job.error}`;
      }
    } finally {
      // İşleme tamamlandı
      this.processing.delete(job.id);
      this.jobs.set(job.id, { ...job });
      
      // DB'yi güncelle
      if (this.enablePersistence) {
        try {
          const supabase = await getSupabaseClient();
          await supabase
            .from('queue_jobs')
            .update({
              status: job.status,
              progress: job.progress,
              completed_at: job.completedAt?.toISOString(),
              error: job.error,
              retry_count: job.retryCount,
              data: job.data
            })
            .eq('id', job.id);
        } catch (error) {
          console.error('Failed to update job in database:', error);
        }
      }
    }
  }

  // Ürün oluşturma işlemi
  private async processCreateListing(job: QueueJob): Promise<void> {
    const { listingData, files } = job.data;
    
    // İlerleme durumunu ayarla
    const updateProgress = (progress: number, message?: string) => {
      job.progress = progress;
      if (message) {
        console.log(`Job ${job.id}: ${message} (${progress}%)`);
      }
      this.jobs.set(job.id, { ...job });
    };
    
    try {
      updateProgress(10, 'Etsy bağlantısı kontrol ediliyor');
      
      // FormData oluştur
      const formData = new FormData();
      formData.append('listingData', JSON.stringify(listingData));
      
      // Dosyaları ekle
      if (files && files.imageFiles) {
        console.log(`Adding ${files.imageFiles.length} image files to FormData`);
        for (const imageFile of files.imageFiles) {
          formData.append('imageFiles', imageFile);
        }
      }
      
      if (files && files.videoFile) {
        console.log('Adding video file to FormData');
        formData.append('videoFile', files.videoFile);
      }
      
      updateProgress(30, 'Etsy API\'ye istek hazırlanıyor');
      
      // Gerçek API'ye istek at - Doğrudan API URL'ini kullan
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dolphinmanager.vercel.app';
      console.log(`Using base URL: ${baseUrl} for API request`);
      
      // İsteği direk olarak /api/etsy/listings/create'e gönder (create-async'e değil)
      console.log('Sending request to Etsy API...');
      const response = await fetch(`${baseUrl}/api/etsy/listings/create`, {
        method: 'POST',
        body: formData,
      });
      
      updateProgress(70, 'Etsy yanıtı alındı, işleniyor');
      
      // Yanıtı kontrol et
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || `Etsy API hatası: ${response.status}`;
        console.error(`API error: ${errorMessage}, Status: ${response.status}`);
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log(`Listing created successfully, ID: ${result.listingId || 'unknown'}`);
      
      updateProgress(100, 'İşlem başarıyla tamamlandı');
      
      // Başarılı yanıtı job datasına ekle
      job.data.result = result;
    } catch (error) {
      console.error('Create listing error:', error);
      throw error;
    }
  }

  // Yeni: Toplu ürün yükleme işlemi
  private async processBatchUploadListings(job: QueueJob): Promise<void> {
    const { products } = job.data;
    
    if (!Array.isArray(products) || products.length === 0) {
      throw new Error('Ürün listesi boş veya geçersiz');
    }
    
    const totalProducts = products.length;
    console.log(`[BATCH_UPLOAD] ${totalProducts} ürün işlenecek`);
    
    // İlerleme durumunu ayarla
    const updateProgress = (progress: number, message?: string) => {
      job.progress = progress;
      if (message) {
        console.log(`Job ${job.id}: ${message} (${progress}%)`);
      }
      job.data.currentStatus = message || '';
      this.jobs.set(job.id, { ...job });
    };
    
    updateProgress(5, 'Ürünler işleniyor...');
    
    // Sonuçları sakla
    const results = {
      success: [] as any[],
      failed: [] as any[],
      total: totalProducts,
      completed: 0
    };
    job.data.results = results;
    
    // Ürünleri batch'lere böl
    const batches = [];
    for (let i = 0; i < totalProducts; i += this.batchSize) {
      batches.push(products.slice(i, i + this.batchSize));
    }
    
    const totalBatches = batches.length;
    console.log(`[BATCH_UPLOAD] ${totalBatches} batch oluşturuldu`);
    
    // Her batch'i işle
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batch = batches[batchIndex];
      updateProgress(
        Math.floor((batchIndex / totalBatches) * 80) + 5,
        `Batch ${batchIndex + 1}/${totalBatches} işleniyor...`
      );
      
      console.log(`[BATCH_UPLOAD] Batch ${batchIndex + 1}/${totalBatches} başlatılıyor (${batch.length} ürün)`);
      
      // Batch içindeki ürünleri paralel olarak işle
      const batchResults = await Promise.allSettled(
        batch.map(async (product: any) => {
          try {
            const formData = new FormData();
            
            // Ürün verisini ekle
            formData.append('listingData', JSON.stringify(product.listingData));
            
            // Dosyaları ekle
            if (product.files && product.files.imageFiles) {
              for (const imageFile of product.files.imageFiles) {
                formData.append('imageFiles', imageFile);
              }
            }
            
            if (product.files && product.files.videoFile) {
              formData.append('videoFile', product.files.videoFile);
            }
            
            // Etsy API'ye istek at
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dolphinmanager.vercel.app';
            const response = await fetch(`${baseUrl}/api/etsy/listings/create`, {
              method: 'POST',
              body: formData,
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || `API hatası: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Başarılı sonucu kaydet
            results.success.push({
              title: product.listingData.title,
              listingId: result.listingId,
              result
            });
            
            return {
              success: true,
              title: product.listingData.title,
              listingId: result.listingId
            };
          } catch (error: any) {
            console.error(`Ürün yükleme hatası (${product.listingData?.title || 'Bilinmeyen'})`, error);
            
            // Hata sonucunu kaydet
            results.failed.push({
              title: product.listingData?.title || 'Bilinmeyen',
              error: error.message || 'Bilinmeyen hata'
            });
            
            return {
              success: false,
              title: product.listingData?.title || 'Bilinmeyen',
              error: error.message || 'Bilinmeyen hata'
            };
          } finally {
            // Tamamlanan ürün sayısını artır
            results.completed++;
            
            // İlerleme durumunu güncelle
            const progress = Math.floor((results.completed / totalProducts) * 80) + 5;
            job.progress = progress;
            job.data.results = results;
            this.jobs.set(job.id, { ...job });
          }
        })
      );
      
      console.log(`[BATCH_UPLOAD] Batch ${batchIndex + 1}/${totalBatches} tamamlandı:`, 
        batchResults.filter(r => r.status === 'fulfilled').length, 'başarılı,',
        batchResults.filter(r => r.status === 'rejected').length, 'başarısız');
      
      // Rate limit'e takılmamak için batch'ler arası bekle (son batch hariç)
      if (batchIndex < totalBatches - 1) {
        updateProgress(
          Math.floor((batchIndex / totalBatches) * 80) + 5,
          `Rate limit için bekleniyor (${this.batchDelay/1000} saniye)...`
        );
        
        await new Promise(resolve => setTimeout(resolve, this.batchDelay));
      }
    }
    
    // Özet bilgileri güncelle
    const successCount = results.success.length;
    const failedCount = results.failed.length;
    
    updateProgress(100, `İşlem tamamlandı: ${successCount} başarılı, ${failedCount} başarısız`);
    
    // Özet bilgileri job datasına ekle
    job.data.summary = {
      successCount,
      failedCount,
      totalCount: totalProducts,
      completedAt: new Date().toISOString()
    };
    
    console.log(`[BATCH_UPLOAD] Toplu yükleme tamamlandı: ${successCount} başarılı, ${failedCount} başarısız`);
  }

  // Kullanıcının tüm işlerini getir
  public async getUserJobs(userId: string): Promise<QueueJob[]> {
    try {
      // Veritabanındaki işleri kontrol et
      if (this.enablePersistence) {
        try {
          const supabase = await getSupabaseClient();
          const { data, error } = await supabase
            .from('queue_jobs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Failed to get jobs from database:', error);
          } else if (data && data.length > 0) {
            // Veritabanından gelen veriyi QueueJob formatına dönüştür
            const dbJobs = data.map(item => ({
              id: item.id,
              userId: item.user_id,
              type: item.type as 'CREATE_LISTING' | 'BATCH_UPLOAD_LISTINGS',
              status: item.status as 'pending' | 'processing' | 'completed' | 'failed',
              progress: item.progress,
              data: item.data,
              error: item.error,
              createdAt: new Date(item.created_at),
              startedAt: item.started_at ? new Date(item.started_at) : undefined,
              completedAt: item.completed_at ? new Date(item.completed_at) : undefined,
              retryCount: item.retry_count
            }));
            
            // Memory cache'i güncelle
            dbJobs.forEach(job => {
              this.jobs.set(job.id, job);
            });
            
            return dbJobs;
          }
        } catch (dbError) {
          console.error('Error fetching jobs from database:', dbError);
        }
      }
      
      // Bellekteki işleri kullan
      return Array.from(this.jobs.values())
        .filter(job => job.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error getting user jobs:', error);
      return [];
    }
  }
}

// Singleton instance
export const queueManager = new QueueManager(); 