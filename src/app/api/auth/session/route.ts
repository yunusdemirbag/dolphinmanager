import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/firebase-admin";

// Session cookie oluştur
export async function POST(request: NextRequest) {
  try {
    console.log("📝 Session API çağrıldı (POST)");
    const { idToken } = await request.json();
    
    if (!idToken) {
      console.error("❌ Session API hatası: idToken eksik");
      return NextResponse.json(
        { success: false, error: "ID token is required" },
        { status: 400 }
      );
    }

    console.log("🔍 Firebase token doğrulanıyor... (token uzunluğu:", idToken.length, ")");
    
    try {
      // Firebase token'ı doğrula
      const decodedToken = await auth.verifyIdToken(idToken);
      console.log("✅ Firebase token doğrulandı - kullanıcı:", decodedToken.uid);
      console.log("🔍 Token proje:", decodedToken.aud);
      console.log("🔍 Token email:", decodedToken.email);
      console.log("🔍 Token sağlayıcı:", decodedToken.firebase?.sign_in_provider);
      
      // Session cookie oluştur (14 gün)
      const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 gün (milisaniye)
      console.log("🔍 Session cookie oluşturuluyor...");
      
      try {
        const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
        console.log("✅ Session cookie oluşturuldu - uzunluk:", sessionCookie.length);
        
        // Cookie ayarla
        const response = NextResponse.json({ 
          success: true,
          uid: decodedToken.uid,
          email: decodedToken.email || null,
          displayName: decodedToken.name || null,
        });

        // Cookie ayarlarını logla
        console.log("🔍 Cookie ayarları:");
        console.log("- maxAge:", expiresIn / 1000);
        console.log("- secure:", process.env.NODE_ENV === "production");
        console.log("- path:", "/");
        
        response.cookies.set({
          name: "session",
          value: sessionCookie,
          maxAge: expiresIn / 1000, // saniye cinsinden
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          sameSite: "lax",
        });
        
        console.log("✅ Session cookie response'a eklendi");
        return response;
      } catch (cookieError: any) {
        console.error("❌ Session cookie oluşturma hatası:", cookieError);
        console.error("Hata kodu:", cookieError.code);
        console.error("Hata mesajı:", cookieError.message);
        
        if (cookieError.errorInfo) {
          console.error("Hata detayları:", cookieError.errorInfo);
        }
        
        throw new Error(`Session cookie oluşturulamadı: ${cookieError.message}`);
      }
    } catch (verifyError: any) {
      console.error("❌ Token doğrulama hatası:", verifyError);
      console.error("Hata kodu:", verifyError.code);
      console.error("Hata mesajı:", verifyError.message);
      
      if (verifyError.errorInfo) {
        console.error("Hata detayları:", verifyError.errorInfo);
      }
      
      throw new Error(`Token doğrulanamadı: ${verifyError.message}`);
    }
  } catch (error: any) {
    console.error("❌ Session API genel hata:", error);
    
    // Geliştirme ortamında daha fazla hata detayı göster
    const errorDetails = process.env.NODE_ENV === "development" 
      ? { 
          message: error.message || "Unknown error", 
          code: error.code || "UNKNOWN_ERROR", 
          errorInfo: error.errorInfo || {},
          stack: error.stack
        }
      : { message: "Authentication failed" };
      
    return NextResponse.json(
      { success: false, error: "Unauthorized request", details: errorDetails },
      { status: 401 }
    );
  }
}

// Session cookie'yi kontrol et
export async function GET(request: Request) {
  try {
    // Next.js 15'te cookies() API'si yerine request.headers.get('cookie') kullanıyoruz
    const cookieHeader = request.headers.get('cookie');
    const sessionCookie = cookieHeader?.split(';')
      .find(c => c.trim().startsWith('session='))
      ?.split('=')[1];
    
    if (!sessionCookie) {
      console.log("❌ No session cookie found");
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
    console.log("🔍 Verifying session cookie...");
    // Session cookie'yi doğrula
    const decodedCookie = await auth.verifySessionCookie(sessionCookie, true);
    console.log("✅ Session cookie verified for user:", decodedCookie.uid);
    
    return NextResponse.json({ 
      authenticated: true,
      user: {
        uid: decodedCookie.uid,
        email: decodedCookie.email
      }
    });
  } catch (error: any) {
    console.error('❌ Error verifying session cookie:', error);
    // Geliştirme ortamında daha fazla hata detayı göster
    const errorDetails = process.env.NODE_ENV === "development" 
      ? { 
          message: error.message || "Unknown error", 
          code: error.code || "UNKNOWN_ERROR", 
          errorInfo: error.errorInfo || {} 
        }
      : { message: "Session verification failed" };
      
    return NextResponse.json({ 
      authenticated: false, 
      error: errorDetails 
    }, { status: 401 });
  }
}

// Session cookie'yi sil (logout)
export async function DELETE(request: Request) {
  try {
    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: 'session',
      value: '',
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax'
    });
    
    return response;
  } catch (error) {
    console.error('❌ Error deleting session cookie:', error);
    return NextResponse.json({ error: 'Logout başarısız' }, { status: 500 });
  }
} 