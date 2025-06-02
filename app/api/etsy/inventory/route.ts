import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEtsyListings } from '@/lib/etsy-api'; // Assuming getEtsyListings is suitable for inventory data

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Inventory API auth error:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // Extract shopId from query parameters if needed, or use a default/primary shop
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId'); // Assuming shopId is passed as a query param

    if (!shopId) {
        // In a real application, you might fetch the user's primary shop ID from your database
        // For now, let's return an error or use a hardcoded placeholder if acceptable
        console.error("Shop ID is required for inventory fetch.");
        return NextResponse.json({ error: "Shop ID is required" }, { status: 400 });
    }

    // Fetch Etsy listings which contain inventory information
    // You might need to adjust limit/offset and state based on how inventory is managed/displayed
    const { listings, count } = await getEtsyListings(userId, parseInt(shopId), 100, 0, 'active');

    // Transform listings data into the InventoryItem format expected by the frontend
    const inventoryData = listings.map(listing => ({
      id: listing.listing_id,
      title: listing.title,
      sku: listing.inventory?.products?.[0]?.sku || '', // Assuming SKU is in the first product offering
      store: listing.shop_id.toString(), // Or fetch store name if available
      current_stock: listing.quantity,
      reserved_stock: 0, // Etsy API might not provide this directly, use a placeholder or calculate if possible
      available_stock: listing.quantity, // Simple for now, adjust if reserved stock is implemented
      status: listing.quantity > 10 ? 'in_stock' : listing.quantity > 0 ? 'low_stock' : 'out_of_stock', // Example status logic
      sales_velocity: 0, // Needs historical data, placeholder
      reorder_point: 0, // Needs to be defined or calculated, placeholder
      lead_time: 0, // Needs to be defined, placeholder
      cost_price: (listing.price?.amount || 0) / (listing.price?.divisor || 1), // Price in dollars
      category: listing.taxonomy_id?.toString() || '', // Or fetch taxonomy path
    }));

    return NextResponse.json({ inventory: inventoryData });

  } catch (error: any) {
    console.error("Error fetching inventory data:", error);
    return NextResponse.json({ error: "Failed to fetch inventory data", details: error.message }, { status: 500 });
  }
} 