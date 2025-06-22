import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/firebase/admin';

// Node.js runtime kullan
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    console.log("Etsy test-shops API called");
    
    const user = await getAuthenticatedUser(request);
    if (!user) {
      console.log("Unauthorized: No valid user found");
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });
    }
    
    console.log("Authenticated user:", user.uid);

    // Kullanıcının Etsy token'ını getir
    const tokenDoc = await db.collection('etsy_tokens').doc(user.uid).get();
    
    if (!tokenDoc.exists) {
      return NextResponse.json({
        error: 'Etsy token not found',
        message: 'User has no Etsy token'
      }, { status: 404 });
    }
    
    const tokenData = tokenDoc.data();
    console.log("Token data retrieved:", {
      expires_at: tokenData?.expires_at,
      has_access_token: !!tokenData?.access_token,
      has_refresh_token: !!tokenData?.refresh_token
    });
    
    // Doğrudan Etsy API'sine istek yap
    console.log('Making direct request to Etsy API');
    
    // 1. Önce kullanıcı bilgilerini al
    const userResponse = await fetch('https://openapi.etsy.com/v3/application/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData?.access_token}`,
        'x-api-key': process.env.ETSY_CLIENT_ID!,
      },
    });
    
    if (!userResponse.ok) {
      const errorBody = await userResponse.text();
      console.error('Failed to fetch Etsy user info:', {
        status: userResponse.status,
        body: errorBody,
      });
      return NextResponse.json({
        error: 'Failed to fetch Etsy user info',
        details: errorBody
      }, { status: userResponse.status });
    }
    
    const userData = await userResponse.json();
    console.log('Etsy user data:', JSON.stringify(userData).substring(0, 200) + '...');
    
    // 2. Şimdi mağaza bilgilerini al - me/shops endpoint'ini kullan
    const shopsResponse = await fetch(`https://openapi.etsy.com/v3/application/me/shops`, {
      headers: {
        'Authorization': `Bearer ${tokenData?.access_token}`,
        'x-api-key': process.env.ETSY_CLIENT_ID!,
      },
    });
    
    if (!shopsResponse.ok) {
      const errorBody = await shopsResponse.text();
      console.error('Failed to fetch Etsy shop info:', {
        status: shopsResponse.status,
        body: errorBody,
      });
      return NextResponse.json({
        error: 'Failed to fetch Etsy shop info',
        details: errorBody
      }, { status: shopsResponse.status });
    }
    
    const shopsData = await shopsResponse.json();
    console.log('Etsy shops data:', JSON.stringify(shopsData).substring(0, 200) + '...');
    
    // Tüm verileri döndür
    return NextResponse.json({
      user: userData,
      shops: shopsData,
      tokenInfo: {
        expires_at: tokenData?.expires_at,
        has_access_token: !!tokenData?.access_token,
        has_refresh_token: !!tokenData?.refresh_token
      }
    });
  } catch (error: any) {
    console.error('Error in test-shops API:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error', details: error.message }),
      { status: 500 },
    );
  }
} 