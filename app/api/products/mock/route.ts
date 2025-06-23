import { NextResponse } from 'next/server';

// Mock ürün verileri
const MOCK_PRODUCTS = [
  {
    id: '1001',
    title: 'Modern Minimalist Wall Art',
    description: 'Elegant minimalist wall art perfect for modern homes.',
    price: 29.99,
    currency_code: 'USD',
    quantity: 4,
    taxonomy_id: 1027, // Wall Decor
    tags: ['minimalist', 'wall art', 'modern', 'home decor', 'abstract', 'canvas print', 'digital download', 'printable', 'black and white', 'geometric', 'scandinavian', 'nordic', 'contemporary'],
    materials: ['digital file', 'canvas'],
    images: [
      'https://i.etsystatic.com/sample/1.jpg',
      'https://i.etsystatic.com/sample/2.jpg',
      'https://i.etsystatic.com/sample/3.jpg',
    ],
    variations: [
      { size: '8x10 inch', pattern: 'Black Frame', price: 29.99 },
      { size: '8x10 inch', pattern: 'White Frame', price: 29.99 },
      { size: '11x14 inch', pattern: 'Black Frame', price: 39.99 },
      { size: '11x14 inch', pattern: 'White Frame', price: 39.99 },
    ],
    created_at: '2023-10-15T14:30:00Z',
    updated_at: '2023-11-20T09:45:00Z',
    state: 'active'
  },
  {
    id: '1002',
    title: 'Abstract Geometric Printable Wall Art',
    description: 'Beautiful abstract geometric patterns for your home or office.',
    price: 24.99,
    currency_code: 'USD',
    quantity: 4,
    taxonomy_id: 1027, // Wall Decor
    tags: ['abstract', 'geometric', 'printable', 'wall art', 'digital download', 'home decor', 'office decor', 'modern', 'minimalist', 'colorful', 'instant download', 'print at home', 'diy'],
    materials: ['digital file'],
    images: [
      'https://i.etsystatic.com/sample/4.jpg',
      'https://i.etsystatic.com/sample/5.jpg',
    ],
    variations: [
      { size: '5x7 inch', pattern: 'Pattern 1', price: 19.99 },
      { size: '5x7 inch', pattern: 'Pattern 2', price: 19.99 },
      { size: '8x10 inch', pattern: 'Pattern 1', price: 24.99 },
      { size: '8x10 inch', pattern: 'Pattern 2', price: 24.99 },
    ],
    created_at: '2023-09-05T10:15:00Z',
    updated_at: '2023-12-01T16:20:00Z',
    state: 'active'
  },
  {
    id: '1003',
    title: 'Botanical Print Set of 6',
    description: 'Beautiful botanical prints for your home. Set of 6 high-quality digital downloads.',
    price: 34.99,
    currency_code: 'USD',
    quantity: 4,
    taxonomy_id: 1027, // Wall Decor
    tags: ['botanical', 'prints', 'set', 'wall art', 'digital download', 'home decor', 'plant', 'nature', 'green', 'vintage', 'illustration', 'printable', 'kitchen'],
    materials: ['digital file'],
    images: [
      'https://i.etsystatic.com/sample/6.jpg',
      'https://i.etsystatic.com/sample/7.jpg',
      'https://i.etsystatic.com/sample/8.jpg',
    ],
    variations: [
      { size: '5x7 inch', pattern: 'Green Theme', price: 34.99 },
      { size: '5x7 inch', pattern: 'Sepia Theme', price: 34.99 },
      { size: '8x10 inch', pattern: 'Green Theme', price: 44.99 },
      { size: '8x10 inch', pattern: 'Sepia Theme', price: 44.99 },
    ],
    created_at: '2023-11-10T08:45:00Z',
    updated_at: '2024-01-05T11:30:00Z',
    state: 'active'
  }
];

export async function GET() {
  try {
    return NextResponse.json({
      count: MOCK_PRODUCTS.length,
      results: MOCK_PRODUCTS
    });
  } catch (error) {
    console.error('Error fetching mock products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
} 