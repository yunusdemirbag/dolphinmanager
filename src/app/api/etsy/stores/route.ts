import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/firebase/admin";

export async function GET(request: NextRequest) {
  try {
    console.log("Etsy stores API called");
    
    const user = await getAuthenticatedUser(request);
    if (!user) {
      console.log("Unauthorized: No valid user found");
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });
    }
    
    console.log("Authenticated user:", user.uid);

    // Kullanıcının bağlı mağazalarını getir
    const storesSnapshot = await db
      .collection('etsy_stores')
      .where('user_id', '==', user.uid)
      .get();

    console.log(`Found ${storesSnapshot.size} stores for user ${user.uid}`);

    const stores = storesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (stores.length === 0) {
      console.log("No stores found for user");
      return NextResponse.json(
        {
          success: false,
          error: 'Henüz Etsy mağazası bağlanmamış',
          code: 'NO_STORES',
        },
        { status: 200 }, // Use 200 to allow frontend to handle this state
      );
    }

    console.log(`Returning ${stores.length} stores`);
    return NextResponse.json({
      success: true,
      stores,
    });
  } catch (error: any) {
    console.error('Error fetching Etsy stores:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500 },
    );
  }
}