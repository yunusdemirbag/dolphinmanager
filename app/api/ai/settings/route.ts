import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';

// OpenAI ayarlarını getir
export async function GET() {
  try {
    // Kullanıcı kimlik doğrulaması
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Yetkilendirme hatası' }, { status: 401 });
    }
    
    // TODO: Firebase'den kullanıcının OpenAI ayarlarını getir
    // Şimdilik varsayılan ayarları döndür
    const data = {
      model: 'gpt-4.1-mini',
      temperature: 0.7,
      title_prompt: null,
      tags_prompt: null,
      category_prompt: null,
      focus_title_prompt: null
    };
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('OpenAI ayarları getirme hatası:', error);
    return NextResponse.json({ error: 'OpenAI ayarları getirilemedi' }, { status: 500 });
  }
}

// OpenAI ayarlarını kaydet
export async function POST(request: Request) {
  try {
    // Kullanıcı kimlik doğrulaması
    const user = await getUser();
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