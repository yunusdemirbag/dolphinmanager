import { createClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from 'uuid';
import { createDraftListing, uploadFilesToEtsy, addInventoryWithVariations } from "./etsy-api";

// Kuyruk iş türleri
export enum QueueJobType {
  CREATE_ETSY_LISTING = 'create_etsy_listing',
}

// Kuyruk iş durumları
export enum QueueJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Kuyruk işi arayüzü
export interface QueueJob {
  id: string;
  user_id: string;
  type: QueueJobType;
  status: QueueJobStatus;
  progress: number;
  data: any;
  error?: string;
  retry_count: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

// Etsy ürün oluşturma işi için veri arayüzü
export interface CreateEtsyListingJobData {
  listingData: any;
  imageFiles: File[];
  videoFiles: File[];
  shopId: number;
}

/**
 * Kuyruğa yeni bir iş ekler
 * @param userId Kullanıcı ID
 * @param type İş türü
 * @param data İş verisi
 * @returns Oluşturulan iş
 */
export async function addJobToQueue(userId: string, type: QueueJobType, data: any): Promise<QueueJob> {
  const supabase = await createClient();
  
  const jobId = uuidv4();
  const job: Partial<QueueJob> = {
    id: jobId,
    user_id: userId,
    type,
    status: QueueJobStatus.PENDING,
    progress: 0,
    data,
    retry_count: 0,
  };
  
  const { data: createdJob, error } = await supabase
    .from('queue_jobs')
    .insert(job)
    .select()
    .single();
    
  if (error) {
    console.error('Kuyruğa iş eklenirken hata oluştu:', error);
    throw new Error(`Kuyruğa iş eklenirken hata: ${error.message}`);
  }
  
  return createdJob as QueueJob;
}

/**
 * Kullanıcının bekleyen işlerini getirir
 * @param userId Kullanıcı ID
 * @returns Bekleyen işler listesi
 */
export async function getUserPendingJobs(userId: string): Promise<QueueJob[]> {
  const supabase = await createClient();
  
  const { data: jobs, error } = await supabase
    .from('queue_jobs')
    .select('*')
    .eq('user_id', userId)
    .eq('status', QueueJobStatus.PENDING)
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('Bekleyen işler alınırken hata oluştu:', error);
    throw new Error(`Bekleyen işler alınırken hata: ${error.message}`);
  }
  
  return jobs as QueueJob[];
}

/**
 * Kullanıcının tüm işlerini getirir
 * @param userId Kullanıcı ID
 * @returns İşler listesi
 */
export async function getUserJobs(userId: string): Promise<QueueJob[]> {
  const supabase = await createClient();
  
  const { data: jobs, error } = await supabase
    .from('queue_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('İşler alınırken hata oluştu:', error);
    throw new Error(`İşler alınırken hata: ${error.message}`);
  }
  
  return jobs as QueueJob[];
}

/**
 * İş durumunu günceller
 * @param jobId İş ID
 * @param status Yeni durum
 * @param progress İlerleme yüzdesi (0-100)
 * @param error Hata mesajı (varsa)
 */
export async function updateJobStatus(
  jobId: string, 
  status: QueueJobStatus, 
  progress: number = 0, 
  error?: string
): Promise<void> {
  const supabase = await createClient();
  
  const updateData: Partial<QueueJob> = {
    status,
    progress,
  };
  
  // Durum değişikliğine göre zaman alanlarını güncelle
  if (status === QueueJobStatus.PROCESSING) {
    updateData.started_at = new Date().toISOString();
  } else if (status === QueueJobStatus.COMPLETED || status === QueueJobStatus.FAILED) {
    updateData.completed_at = new Date().toISOString();
  }
  
  // Hata varsa ekle
  if (error) {
    updateData.error = error;
  }
  
  const { error: updateError } = await supabase
    .from('queue_jobs')
    .update(updateData)
    .eq('id', jobId);
    
  if (updateError) {
    console.error('İş durumu güncellenirken hata oluştu:', updateError);
    throw new Error(`İş durumu güncellenirken hata: ${updateError.message}`);
  }
}

/**
 * Bir sonraki bekleyen işi işler
 * @returns İşlenen iş
 */
export async function processNextJob(): Promise<QueueJob | null> {
  const supabase = await createClient();
  
  // Bir sonraki bekleyen işi al
  const { data: jobs, error } = await supabase
    .from('queue_jobs')
    .select('*')
    .eq('status', QueueJobStatus.PENDING)
    .order('created_at', { ascending: true })
    .limit(1);
    
  if (error) {
    console.error('Bekleyen işler alınırken hata oluştu:', error);
    throw new Error(`Bekleyen işler alınırken hata: ${error.message}`);
  }
  
  if (!jobs || jobs.length === 0) {
    return null; // İşlenecek iş yok
  }
  
  const job = jobs[0] as QueueJob;
  
  try {
    // İşi işleniyor olarak işaretle
    await updateJobStatus(job.id, QueueJobStatus.PROCESSING, 10);
    
    // İş türüne göre işleme
    if (job.type === QueueJobType.CREATE_ETSY_LISTING) {
      await processCreateEtsyListingJob(job);
    } else {
      throw new Error(`Bilinmeyen iş türü: ${job.type}`);
    }
    
    // İşi tamamlandı olarak işaretle
    await updateJobStatus(job.id, QueueJobStatus.COMPLETED, 100);
    
    return job;
  } catch (error: any) {
    console.error('İş işlenirken hata oluştu:', error);
    
    // Yeniden deneme sayısını artır
    const { data: updatedJob, error: retryError } = await supabase
      .from('queue_jobs')
      .update({
        retry_count: job.retry_count + 1,
        status: QueueJobStatus.FAILED,
        error: error.message || 'Bilinmeyen hata',
      })
      .eq('id', job.id)
      .select()
      .single();
      
    if (retryError) {
      console.error('Yeniden deneme sayısı güncellenirken hata oluştu:', retryError);
    }
    
    return null;
  }
}

/**
 * Etsy ürün oluşturma işini işler
 * @param job İş
 */
async function processCreateEtsyListingJob(job: QueueJob): Promise<void> {
  const data = job.data as CreateEtsyListingJobData;
  const { listingData, imageFiles, videoFiles, shopId } = data;
  
  // Kullanıcı için geçerli token al
  const supabase = await createClient();
  
  // Etsy token bilgilerini al
  const { data: etsyTokenData, error: tokenError } = await supabase
    .from('etsy_tokens')
    .select('*')
    .eq('user_id', job.user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
    
  if (tokenError || !etsyTokenData) {
    throw new Error('Etsy token bilgisi bulunamadı');
  }
  
  const accessToken = etsyTokenData.access_token;
  
  try {
    // İlerleme durumunu güncelle
    await updateJobStatus(job.id, QueueJobStatus.PROCESSING, 20);
    
    // Draft listing oluştur
    const { listing_id } = await createDraftListing(accessToken, shopId, listingData);
    
    // İlerleme durumunu güncelle
    await updateJobStatus(job.id, QueueJobStatus.PROCESSING, 40);
    
    // Resim ve video dosyalarını yükle
    if (imageFiles.length > 0 || videoFiles.length > 0) {
      await uploadFilesToEtsy(
        accessToken,
        shopId,
        listing_id,
        imageFiles,
        videoFiles.length > 0 ? videoFiles[0] : null
      );
    }
    
    // İlerleme durumunu güncelle
    await updateJobStatus(job.id, QueueJobStatus.PROCESSING, 70);
    
    // Varyasyonlar varsa ekle
    if (listingData.has_variations && listingData.variations && listingData.variations.length > 0) {
      await addInventoryWithVariations(accessToken, listing_id, listingData.variations);
    }
    
    // İlerleme durumunu güncelle
    await updateJobStatus(job.id, QueueJobStatus.PROCESSING, 90);
    
    // Etsy uploads tablosuna kaydet
    const uploadData = {
      user_id: job.user_id,
      shop_id: shopId,
      listing_id: listing_id,
      title: listingData.title,
      state: listingData.state || 'draft',
      upload_duration: 0, // Süre bilgisi sonradan eklenecek
      image_count: imageFiles.length,
      video_count: videoFiles.length,
      has_variations: listingData.has_variations || false,
      variation_count: listingData.variations?.length || 0,
      title_tokens: listingData.tokenUsage?.title_total_tokens || 0,
      tags_tokens: listingData.tokenUsage?.tags_total_tokens || 0,
      tags: listingData.tags || [],
      total_tokens: (listingData.tokenUsage?.title_total_tokens || 0) +
                   (listingData.tokenUsage?.tags_total_tokens || 0) +
                   (listingData.tokenUsage?.description_total_tokens || 0)
    };
    
    const { error: uploadError } = await supabase
      .from('etsy_uploads')
      .insert(uploadData);
      
    if (uploadError) {
      console.warn('Yükleme bilgileri veritabanına kaydedilemedi:', uploadError);
    }
    
    // İş verisini güncelle (listing_id ekle)
    const { error: updateError } = await supabase
      .from('queue_jobs')
      .update({
        data: {
          ...job.data,
          listing_id
        }
      })
      .eq('id', job.id);
      
    if (updateError) {
      console.warn('İş verisi güncellenirken hata oluştu:', updateError);
    }
  } catch (error: any) {
    throw new Error(`Etsy ürün oluşturma hatası: ${error.message}`);
  }
}

/**
 * Kuyruğu işleyen bir cron işi başlatır
 * @param intervalMs İşleme aralığı (ms)
 */
export function startQueueProcessor(intervalMs: number = 120000): NodeJS.Timeout {
  console.log(`Kuyruk işleyici başlatıldı (${intervalMs}ms aralıkla)`);
  
  return setInterval(async () => {
    try {
      const job = await processNextJob();
      
      if (job) {
        console.log(`İş işlendi: ${job.id}, Tür: ${job.type}`);
      }
    } catch (error) {
      console.error('Kuyruk işleme hatası:', error);
    }
  }, intervalMs);
}

/**
 * Kuyruğu işleyen cron işini durdurur
 * @param intervalId setInterval'dan dönen ID
 */
export function stopQueueProcessor(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
  console.log('Kuyruk işleyici durduruldu');
} 