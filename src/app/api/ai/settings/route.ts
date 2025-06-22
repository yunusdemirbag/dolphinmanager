import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { db as adminDb } from '@/lib/firebase/admin';

// OpenAI ayarlarını getir
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const settingsDocRef = adminDb.collection('ai_settings').doc(user.uid);
    const settingsDoc = await settingsDocRef.get();

    if (!settingsDoc.exists) {
      return NextResponse.json({ settings: {} });
    }
    return NextResponse.json({ settings: settingsDoc.data() });
  } catch (error) {
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

// OpenAI ayarlarını kaydet
export async function POST(request: Request) {
  try {
    // Kullanıcı kimlik doğrulaması
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Yetkilendirme hatası' }, { status: 401 });
    }
    
    // İstek gövdesini al
    const body = await request.json();
    
    // TODO: Firebase'e ayarları kaydet
    console.log('Saving AI settings for user:', user, 'Settings:', body);
    
    return NextResponse.json({ success: true, message: 'Ayarlar kaydedildi' });
  } catch (error) {
    console.error('OpenAI ayarları kaydetme hatası:', error);
    return NextResponse.json({ error: 'OpenAI ayarları kaydedilemedi' }, { status: 500 });
  }
} 