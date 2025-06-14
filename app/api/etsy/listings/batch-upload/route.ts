import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { queueManager } from "@/src/lib/queue-manager"
import { getUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Starting batch upload process');
    
    // 1. Kullanıcıyı doğrula
    const user = await getUser();
    
    if (!user) {
      console.error("[API] Auth error: No user found");
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      )
    }

    // 2. Form verilerini al
    const formData = await request.formData();
    console.log('[API] FormData keys:', Array.from(formData.keys()));
    
    // 3. Ürün verilerini al
    const productsJSON = formData.get('products') as string;
    if (!productsJSON) {
      console.error('[API] Missing products data in FormData');
      return NextResponse.json(
        { error: "Ürün verisi eksik" },
        { status: 400 }
      )
    }
    
    const products = JSON.parse(productsJSON);
    if (!Array.isArray(products) || products.length === 0) {
      console.error('[API] Invalid products data:', typeof products);
      return NextResponse.json(
        { error: "Geçerli ürün verisi bulunamadı" },
        { status: 400 }
      )
    }
    
    console.log(`[API] Processing ${products.length} products`);
    
    // 4. Dosyaları işle ve ürünlere ekle
    const processedProducts = [];
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const productId = product.id || `product_${i}`;
      
      // Her ürün için dosyaları topla
      const imageFiles = [];
      const imageKeys = Array.from(formData.keys()).filter(key => 
        key.startsWith(`imageFiles_${productId}_`)
      );
      
      for (const key of imageKeys) {
        const file = formData.get(key) as File;
        if (file && file instanceof File) {
          imageFiles.push(file);
        }
      }
      
      // Video dosyasını al (varsa)
      const videoKey = `videoFile_${productId}`;
      const videoFile = formData.get(videoKey) as File;
      
      // İşlenmiş ürünü ekle
      processedProducts.push({
        listingData: product,
        files: {
          imageFiles,
          videoFile: videoFile || null
        }
      });
    }
    
    console.log(`[API] Processed ${processedProducts.length} products with files`);
    
    // 5. Kuyruk işi oluştur
    const jobId = await queueManager.addJob({
      userId: user.id,
      type: 'BATCH_UPLOAD_LISTINGS',
      data: {
        products: processedProducts,
        createdAt: new Date().toISOString(),
        totalCount: processedProducts.length
      }
    });
    
    console.log(`[API] Batch upload job created with ID: ${jobId}`);
    
    // 6. Yanıt döndür
    return NextResponse.json({
      success: true,
      jobId,
      message: `${processedProducts.length} ürün arka planda işleniyor`,
      totalProducts: processedProducts.length
    });
    
  } catch (error: any) {
    console.error('[API] Error in batch upload:', error);
    return NextResponse.json({ 
      error: error.message || 'Toplu ürün yükleme işlemi başlatılamadı' 
    }, { status: 500 });
  }
} 