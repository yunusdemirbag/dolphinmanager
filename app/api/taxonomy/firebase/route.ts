import { NextResponse } from 'next/server';
import { getTaxonomyNodesFromFirebase, syncTaxonomyNodesToFirebase } from '@/lib/firebase-sync';

export async function GET() {
  try {
    const nodes = await getTaxonomyNodesFromFirebase();
    
    return NextResponse.json({ 
      success: true,
      taxonomy_nodes: nodes,
      cached: true,
      source: 'firebase'
    });
  } catch (error) {
    console.error('Error fetching taxonomy nodes from Firebase:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch taxonomy nodes from Firebase',
        message: 'Firebase erişiminde bir sorun oluştu. Lütfen Firebase bağlantınızı kontrol edin.'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taxonomy_nodes } = body;

    if (!taxonomy_nodes || !Array.isArray(taxonomy_nodes)) {
      return NextResponse.json(
        { error: 'Missing required field: taxonomy_nodes' },
        { status: 400 }
      );
    }

    await syncTaxonomyNodesToFirebase(taxonomy_nodes);

    return NextResponse.json({ 
      message: 'Taxonomy nodes synced to Firebase successfully',
      count: taxonomy_nodes.length
    });
  } catch (error) {
    console.error('Error syncing taxonomy nodes to Firebase:', error);
    return NextResponse.json(
      { error: 'Failed to sync taxonomy nodes' },
      { status: 500 }
    );
  }
}