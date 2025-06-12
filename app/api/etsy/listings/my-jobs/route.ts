import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { queueManager } from "@/src/lib/queue-manager"

export async function GET(request: NextRequest) {
  try {
    // 1. Kullanıcıyı doğrula
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("My jobs API auth error:", userError)
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      )
    }

    // 2. İsteğe bağlı filtre parametrelerini al
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as 'pending' | 'processing' | 'completed' | 'failed' | null
    const limit = parseInt(searchParams.get('limit') || '100')
    
    // 3. Kullanıcının işlerini al
    let jobs = await queueManager.getUserJobs(user.id)
    
    // Status filtresini uygula
    if (status) {
      jobs = jobs.filter(job => job.status === status)
    }
    
    // Limiti uygula
    if (jobs.length > limit) {
      jobs = jobs.slice(0, limit)
    }
    
    // 4. Sonuçları döndür
    return NextResponse.json(jobs)
    
  } catch (error: any) {
    console.error('[API] Error getting user jobs:', error)
    return NextResponse.json(
      { error: error.message || 'Kullanıcı işleri alınırken bir hata oluştu' },
      { status: 500 }
    )
  }
} 