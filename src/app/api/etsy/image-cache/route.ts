import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

// Resimlerin kaydedileceği dizin
const IMAGE_DIR = path.join(process.cwd(), 'public', 'images', 'etsy-cache');

// Tip tanımlamaları
interface ImageResult {
  original_url: string;
  cached_url: string;
  status: string;
}

interface ProductResult {
  listing_id: number;
  title: string;
  images: ImageResult[];
}

interface CacheResults {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  products: ProductResult[];
}

// Etsy resimlerini önbelleğe alma işlemi
export async function POST(request: NextRequest) {
  try {
    console.log("Image caching started");
    
    // Kaç ürün önbelleğe almak istediğimizi kontrol et
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 0; // 0 = tüm ürünler
    
    // İşlem başlatma zamanı
    const startTime = Date.now();
    
    // Kullanıcı doğrulama
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log("No authenticated user, but continuing for testing");
    }
    
    // Dizin kontrolü ve oluşturma
    try {
      await ensureDirectoryExists(IMAGE_DIR);
      console.log(`Image directory ready: ${IMAGE_DIR}`);
    } catch (dirError) {
      console.error("Error creating image directory:", dirError);
      return NextResponse.json(
        { error: "Failed to create image directory" }, 
        { status: 500 }
      );
    }
    
    // Etsy ürünlerini çek
    const productsResponse = await fetch(`${request.nextUrl.origin}/api/etsy/products`);
    
    if (!productsResponse.ok) {
      console.error("Failed to fetch products:", productsResponse.status, productsResponse.statusText);
      return NextResponse.json(
        { error: "Failed to fetch products" }, 
        { status: 500 }
      );
    }
    
    const productsData = await productsResponse.json();
    
    if (!productsData.products || !Array.isArray(productsData.products)) {
      console.error("Invalid products data:", productsData);
      return NextResponse.json(
        { error: "Invalid products data" }, 
        { status: 500 }
      );
    }
    
    // Kaç ürün işlenecek
    const products = limit > 0 ? productsData.products.slice(0, limit) : productsData.products;
    console.log(`Processing ${products.length} products${limit > 0 ? ` (limited to ${limit})` : ' (all)'}`);
    
    // Her ürün ve resmi için işlem yap
    const results: CacheResults = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      products: []
    };
    
    for (const product of products) {
      if (!product.images || !Array.isArray(product.images) || product.images.length === 0) continue;
      const image = product.images[0];
      if (!image.url_570xN) continue;
      try {
        const response = await fetch(image.url_570xN, {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Referer': 'https://www.etsy.com/'
          }
        });
        if (!response.ok) continue;
        const buffer = await response.arrayBuffer();
        const fileName = `cached-image-${product.listing_id}.jpg`;
        const targetFilePath = path.join(IMAGE_DIR, fileName);
        await fs.promises.writeFile(targetFilePath, Buffer.from(buffer));
        // (isteğe bağlı: veritabanı kaydı vs.)
      } catch (err) {
        // Hata logla
      }
    }
    
    // İşlem bitiş zamanı ve toplam süre
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // saniye cinsinden
    
    console.log("Image caching completed");
    console.log(`Total: ${results.total}, Success: ${results.success}, Failed: ${results.failed}, Skipped: ${results.skipped}`);
    console.log(`Process completed in ${duration.toFixed(2)} seconds`);
    
    return NextResponse.json({
      success: true,
      results,
      duration: `${duration.toFixed(2)} seconds`,
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    console.error("Image caching error:", error);
    return NextResponse.json(
      { error: "Failed to cache images", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Dizinin var olduğundan emin ol, yoksa oluştur
async function ensureDirectoryExists(directory: string) {
  try {
    await mkdir(directory, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
} 