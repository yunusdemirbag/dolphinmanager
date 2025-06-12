import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';

export interface QueueJob {
  id: string;
  userId: string;
  type: 'CREATE_LISTING';
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
  private maxConcurrent = 2; // Aynı anda en fazla 2 iş
  private maxRetries = 3;
  private processingInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  public enablePersistence = true; // Veritabanı kalıcılığı varsayılan olarak aktif

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
        const supabase = await createClient();
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
        const supabase = await createClient();
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
            type: data.type as 'CREATE_LISTING',
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
        const supabase = await createClient();
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
          const supabase = await createClient();
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
      
      // Gerçek API'ye istek at
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
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

  // Kullanıcının tüm işlerini getir
  public async getUserJobs(userId: string): Promise<QueueJob[]> {
    try {
      // Veritabanındaki işleri kontrol et
      if (this.enablePersistence) {
        try {
          const supabase = await createClient();
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
              type: item.type as 'CREATE_LISTING',
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