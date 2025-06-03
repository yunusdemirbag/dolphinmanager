import { NextResponse } from 'next/server';
import { getShippingProfiles } from '@/lib/etsy-api';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shop_id');

    if (!shopId) {
      return NextResponse.json({
        success: false,
        error: 'Shop ID is required'
      }, { status: 400 });
    }

    // Get user ID from session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const shippingProfiles = await getShippingProfiles(user.id, parseInt(shopId));

    return NextResponse.json({
      success: true,
      data: shippingProfiles
    });

  } catch (error) {
    console.error('Error fetching shipping profiles:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch shipping profiles'
    }, { status: 500 });
  }
} 