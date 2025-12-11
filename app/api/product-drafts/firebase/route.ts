import { NextResponse } from 'next/server';
import { 
  getProductDraftsFromFirebase, 
  saveProductDraftToFirebase, 
  updateProductDraftInFirebase,
  deleteProductDraftFromFirebase 
} from '@/lib/firebase-sync';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const shopId = searchParams.get('shop_id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const drafts = await getProductDraftsFromFirebase(
      userId, 
      shopId ? parseInt(shopId) : undefined
    );
    
    return NextResponse.json({ drafts });
  } catch (error) {
    console.error('Error fetching product drafts from Firebase:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product drafts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      user_id, 
      shop_id, 
      title, 
      description, 
      tags, 
      images, 
      variations,
      category_id,
      shop_section_id,
      shipping_profile_id,
      is_personalized,
      processing_min,
      processing_max,
      status = 'draft'
    } = body;

    if (!user_id || !shop_id || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, shop_id, title' },
        { status: 400 }
      );
    }

    const draftId = await saveProductDraftToFirebase({
      user_id,
      shop_id,
      title,
      description: description || '',
      tags: tags || [],
      images: images || [],
      variations: variations || [],
      category_id,
      shop_section_id,
      shipping_profile_id,
      is_personalized: is_personalized || false,
      processing_min: processing_min || 1,
      processing_max: processing_max || 3,
      status
    });

    return NextResponse.json({ 
      message: 'Product draft saved successfully',
      draft_id: draftId
    });
  } catch (error) {
    console.error('Error saving product draft to Firebase:', error);
    return NextResponse.json(
      { error: 'Failed to save product draft' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { draft_id, ...updates } = body;

    if (!draft_id) {
      return NextResponse.json(
        { error: 'Draft ID is required' },
        { status: 400 }
      );
    }

    await updateProductDraftInFirebase(draft_id, updates);

    return NextResponse.json({ 
      message: 'Product draft updated successfully',
      draft_id
    });
  } catch (error) {
    console.error('Error updating product draft in Firebase:', error);
    return NextResponse.json(
      { error: 'Failed to update product draft' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get('draft_id');

    if (!draftId) {
      return NextResponse.json(
        { error: 'Draft ID is required' },
        { status: 400 }
      );
    }

    await deleteProductDraftFromFirebase(draftId);

    return NextResponse.json({ 
      message: 'Product draft deleted successfully',
      draft_id: draftId
    });
  } catch (error) {
    console.error('Error deleting product draft from Firebase:', error);
    return NextResponse.json(
      { error: 'Failed to delete product draft' },
      { status: 500 }
    );
  }
}