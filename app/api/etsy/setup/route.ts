import { NextResponse } from 'next/server';
import { createEtsyDataTables, checkEtsyTablesExist } from '@/lib/etsy-api';
import { getUser } from '@/lib/auth';

export async function GET() {
  try {
    // Sadece giriş yapmış kullanıcılar için
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Kullanıcının admin olup olmadığını kontrol et (bu kısmı kendi mantığınıza göre değiştirebilirsiniz)
    // Örneğin:
    // const isAdmin = user.email === 'admin@example.com' || user.email.endsWith('@yourdomain.com');
    const isAdmin = true; // Şimdilik herkese izin verelim
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Önce tabloların var olup olmadığını kontrol et
    const { exists, error: checkError } = await checkEtsyTablesExist();
    
    if (checkError) {
      return NextResponse.json({ 
        error: 'Error checking if tables exist', 
        details: checkError 
      }, { status: 500 });
    }
    
    if (exists) {
      return NextResponse.json({ 
        message: 'Etsy tables already exist',
        exists: true
      });
    }
    
    // Tabloları oluştur
    await createEtsyDataTables();
    
    return NextResponse.json({ 
      message: 'Etsy tables created successfully',
      exists: false,
      created: true
    });
  } catch (error) {
    console.error('Error setting up Etsy integration:', error);
    return NextResponse.json({ 
      error: 'Failed to setup Etsy integration', 
      details: String(error) 
    }, { status: 500 });
  }
} 