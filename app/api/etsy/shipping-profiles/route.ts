import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getShippingProfiles } from "@/lib/etsy-api"

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shop_id');

    if (!shopId) {
      return NextResponse.json({ error: 'Missing shop_id parameter' }, { status: 400 });
    }

    const shippingProfiles = await getShippingProfiles(user.id, parseInt(shopId));

    return NextResponse.json({ shipping_profiles: shippingProfiles });
  } catch (error) {
    console.error("Error in /api/etsy/shipping-profiles:", error);
    return NextResponse.json({ error: 'Failed to fetch shipping profiles' }, { status: 500 });
  }
} 