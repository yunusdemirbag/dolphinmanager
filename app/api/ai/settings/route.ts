import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// OpenAI ayarlarını getir
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Kullanıcı kimlik doğrulaması
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Yetkilendirme hatası' }, { status: 401 });
    }
    
    // Kullanıcının OpenAI ayarlarını getir
    const { data, error } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGSQL_NO_ROWS_RETURNED') {
      console.error('OpenAI ayarları getirme hatası:', error);
      return NextResponse.json({ error: 'OpenAI ayarları getirilemedi' }, { status: 500 });
    }
    
    // Eğer ayarlar yoksa varsayılan ayarları döndür
    if (!data) {
      const defaultSettings = {
        model: "gpt-4.1-mini",
        temperature: 0.7,
        title_prompt: null,
        tags_prompt: null,
        category_prompt: null,
        focus_title_prompt: null,
        
        // Her prompt için ayrı model ve temperature ayarları
        title_model: null,
        title_temperature: null,
        tags_model: null,
        tags_temperature: null,
        category_model: null,
        category_temperature: null,
        focus_title_model: null,
        focus_title_temperature: null,
        
        user_id: user.id
      };
      
      return NextResponse.json(defaultSettings);
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('OpenAI ayarları getirme hatası:', error);
    return NextResponse.json({ error: 'OpenAI ayarları getirilemedi' }, { status: 500 });
  }
}

// OpenAI ayarlarını kaydet
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Kullanıcı kimlik doğrulaması
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Yetkilendirme hatası' }, { status: 401 });
    }
    
    // İstek gövdesini al
    const body = await request.json();
    
    // Geçerli alanları kontrol et
    const validFields = [
      'model', 'temperature', 
      'title_prompt', 'tags_prompt', 'category_prompt', 'focus_title_prompt',
      'title_model', 'title_temperature', 
      'tags_model', 'tags_temperature', 
      'category_model', 'category_temperature', 
      'focus_title_model', 'focus_title_temperature'
    ];
    
    const settings: Record<string, any> = Object.entries(body)
      .filter(([key]) => validFields.includes(key))
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
    
    // Kullanıcı ID'sini ekle
    settings.user_id = user.id;
    
    // Ayarları kaydet veya güncelle (upsert)
    const { data, error } = await supabase
      .from('ai_settings')
      .upsert(settings, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (error) {
      console.error('OpenAI ayarları kaydetme hatası:', error);
      return NextResponse.json({ error: 'OpenAI ayarları kaydedilemedi' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('OpenAI ayarları kaydetme hatası:', error);
    return NextResponse.json({ error: 'OpenAI ayarları kaydedilemedi' }, { status: 500 });
  }
} 