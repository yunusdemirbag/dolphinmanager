import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { queueManager } from "@/src/lib/queue-manager"

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // 1. Kullanıcıyı doğrula
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Job status API auth error:", userError)
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      )
    }

    // 2. Job ID'yi al
    if (!params || !params.jobId) {
      return NextResponse.json(
        { error: "Job ID gerekli" },
        { status: 400 }
      )
    }
    
    const jobId = params.jobId
    console.log(`Checking job status for job ID: ${jobId}`)
    
    // 3. Job durumunu getir
    const job = queueManager.getJobById(jobId)
    
    if (!job) {
      console.log(`Job not found: ${jobId}`)
      // Supabase'den kontrol et
      if (queueManager.enablePersistence) {
        try {
          const { data, error } = await supabase
            .from('queue_jobs')
            .select('*')
            .eq('id', jobId)
            .single()
            
          if (error) throw error
          
          if (data) {
            return NextResponse.json({
              id: data.id,
              status: data.status,
              progress: data.progress,
              createdAt: data.created_at,
              startedAt: data.started_at,
              completedAt: data.completed_at,
              error: data.error,
              result: data.data?.result || null,
              fromDatabase: true
            })
          }
        } catch (dbError) {
          console.error("Error fetching job from database:", dbError)
        }
      }
      
      return NextResponse.json(
        { error: "İşlem bulunamadı" },
        { status: 404 }
      )
    }
    
    // 4. Sadece kullanıcının kendi joblarını görebilmesini sağla
    if (job.userId !== user.id) {
      console.error(`Unauthorized job access attempt. Job belongs to ${job.userId}, requested by ${user.id}`)
      return NextResponse.json(
        { error: "Bu işleme erişim yetkiniz yok" },
        { status: 403 }
      )
    }
    
    // 5. Job durumunu döndür
    console.log(`Returning job status: ${job.status}, progress: ${job.progress}%`)
    return NextResponse.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      result: job.data?.result || null
    })
    
  } catch (error: any) {
    console.error("Error fetching job status:", error)
    return NextResponse.json(
      { error: error.message || "İşlem durumu alınırken bir hata oluştu" },
      { status: 500 }
    )
  }
} 