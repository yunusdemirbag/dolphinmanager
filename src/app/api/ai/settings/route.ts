import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { db as adminDb } from '@/lib/firebase/admin';

// OpenAI ayarlarını getir
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }

  try {
    const settingsDocRef = adminDb.collection('ai_settings').doc(user.uid);
    const settingsDoc = await settingsDocRef.get();

    if (!settingsDoc.exists) {
      return NextResponse.json({});
    }
    return NextResponse.json(settingsDoc.data());
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500 },
    );
  }
}

// OpenAI ayarlarını kaydet
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }

  try {
    const body = await request.json();
    const settingsDocRef = adminDb.collection('ai_settings').doc(user.uid);
    await settingsDocRef.set(body, { merge: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating AI settings:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500 },
    );
  }
} 