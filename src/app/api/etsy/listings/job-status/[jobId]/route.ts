import { NextRequest, NextResponse } from "next/server"
import { queueManager } from "@/lib/queue-manager"
import { getUser } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    console.log(`[API] Getting job status for job ID: ${params.jobId}`);
    
    // Kullanıcıyı doğrula
    const user = await getUser();
    
    if (!user) {
      console.error("[API] Auth error: No user found");
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      )
    }
    
    // Job durumunu al
    const job = await queueManager.getJobStatus(params.jobId);
    
    if (!job) {
      console.error(`[API] Job not found: ${params.jobId}`);
      return NextResponse.json(
        { error: "İş bulunamadı" },
        { status: 404 }
      );
    }
    
    // Kullanıcının kendi işine eriştiğinden emin ol
    if (job.userId !== user.id) {
      console.error(`[API] Unauthorized access to job: ${params.jobId}`);
      return NextResponse.json(
        { error: "Bu işe erişim yetkiniz yok" },
        { status: 403 }
      );
    }
    
    // Job durumunu döndür
    const response = {
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      results: job.data.results || null,
      summary: job.data.summary || null,
      currentStatus: job.data.currentStatus || null
    };
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('[API] Error getting job status:', error);
    return NextResponse.json({ 
      error: error.message || 'İş durumu alınırken bir hata oluştu' 
    }, { status: 500 });
  }
} 