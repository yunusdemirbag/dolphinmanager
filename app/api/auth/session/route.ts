import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/firebase-admin";

// Session cookie oluştur
export async function POST(request: NextRequest) {
  try {
    console.log("Session API called");
    const { idToken } = await request.json();

    // Firebase token'ı doğrula
    const decodedToken = await auth.verifyIdToken(idToken);
    console.log("✅ Firebase token verified for user:", decodedToken.uid);

    // Session cookie oluştur (14 gün)
    const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 gün (milisaniye)
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    console.log("✅ Session cookie created for user:", decodedToken.uid);

    // Cookie ayarla
    const response = NextResponse.json({ 
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      displayName: decodedToken.name || null,
    });

    response.cookies.set({
      name: "session",
      value: sessionCookie,
      maxAge: expiresIn / 1000, // saniye cinsinden
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("❌ Session API error:", error);
    return NextResponse.json(
      { success: false, error: "Unauthorized request" },
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
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
    // Session cookie'yi doğrula
    const decodedCookie = await auth.verifySessionCookie(sessionCookie, true);
    
    return NextResponse.json({ 
      authenticated: true,
      user: {
        uid: decodedCookie.uid,
        email: decodedCookie.email
      }
    });
  } catch (error) {
    console.error('❌ Error verifying session cookie:', error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
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