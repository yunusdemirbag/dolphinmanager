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
    
    // Return mock data as fallback
    const mockNodes = [
      { id: 68887271, name: "Art & Collectibles", level: 1, path: ["Art & Collectibles"] },
      { id: 68887312, name: "Prints", level: 2, path: ["Art & Collectibles", "Prints"] },
      { id: 68887313, name: "Digital Prints", level: 3, path: ["Art & Collectibles", "Prints", "Digital Prints"] },
      { id: 68887314, name: "Giclee", level: 3, path: ["Art & Collectibles", "Prints", "Giclee"] },
      { id: 68887280, name: "Painting", level: 2, path: ["Art & Collectibles", "Painting"] },
      { id: 68887281, name: "Canvas Art", level: 3, path: ["Art & Collectibles", "Painting", "Canvas Art"] },
      { id: 68887282, name: "Acrylic Painting", level: 3, path: ["Art & Collectibles", "Painting", "Acrylic"] },
      { id: 68889482, name: "Home & Living", level: 1, path: ["Home & Living"] },
      { id: 1027, name: "Home Decor", level: 2, path: ["Home & Living", "Home Decor"] },
      { id: 1366, name: "Wall Decor", level: 3, path: ["Home & Living", "Home Decor", "Wall Decor"] },
      { id: 1028, name: "Wall Hangings", level: 3, path: ["Home & Living", "Home Decor", "Wall Hangings"] }
    ];
    
    return NextResponse.json({
      success: true,
      taxonomy_nodes: mockNodes,
      cached: false,
      source: 'mock'
    });
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