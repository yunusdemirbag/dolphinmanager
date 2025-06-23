import { NextResponse } from 'next/server';

export async function GET() {
  // Mock ürün verileri
  const mockProducts = [
    {
      listing_id: 1001,
      user_id: 123456,
      shop_id: 987654,
      title: "Hokusai Great Wave Canvas Wall Art",
      description: "Beautiful Japanese art print",
      state: "active",
      creation_timestamp: Date.now() / 1000,
      created_timestamp: Date.now() / 1000,
      ending_timestamp: (Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 gün sonra
      original_creation_timestamp: Date.now() / 1000,
      last_modified_timestamp: Date.now() / 1000,
      updated_timestamp: Date.now() / 1000,
      state_timestamp: Date.now() / 1000,
      quantity: 10,
      shop_section_id: 12345,
      featured_rank: -1,
      url: "https://www.etsy.com/listing/mock/hokusai-great-wave",
      num_favorers: 5,
      tags: ["art", "japanese", "wave", "canvas"],
      price: {
        amount: 7600,
        divisor: 100,
        currency_code: "USD"
      },
      taxonomy_id: 2078,
      views: 25,
      images: [
        {
          listing_image_id: 1001001,
          url_75x75: "https://i.etsystatic.com/mock/75x75.jpg",
          url_170x135: "https://i.etsystatic.com/mock/170x135.jpg",
          url_570xN: "https://i.etsystatic.com/mock/570xN.jpg",
          url_fullxfull: "https://i.etsystatic.com/mock/fullxfull.jpg",
          full_height: 1000,
          full_width: 800
        }
      ]
    },
    {
      listing_id: 1002,
      user_id: 123456,
      shop_id: 987654,
      title: "Gustav Klimt The Kiss Canvas Art",
      description: "Famous artwork reproduction",
      state: "active",
      creation_timestamp: Date.now() / 1000,
      created_timestamp: Date.now() / 1000,
      ending_timestamp: (Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 gün sonra
      original_creation_timestamp: Date.now() / 1000,
      last_modified_timestamp: Date.now() / 1000,
      updated_timestamp: Date.now() / 1000,
      state_timestamp: Date.now() / 1000,
      quantity: 8,
      shop_section_id: 12345,
      featured_rank: -1,
      url: "https://www.etsy.com/listing/mock/klimt-kiss",
      num_favorers: 12,
      tags: ["art", "klimt", "kiss", "canvas"],
      price: {
        amount: 8500,
        divisor: 100,
        currency_code: "USD"
      },
      taxonomy_id: 2078,
      views: 42,
      images: [
        {
          listing_image_id: 1002001,
          url_75x75: "https://i.etsystatic.com/mock/klimt/75x75.jpg",
          url_170x135: "https://i.etsystatic.com/mock/klimt/170x135.jpg",
          url_570xN: "https://i.etsystatic.com/mock/klimt/570xN.jpg",
          url_fullxfull: "https://i.etsystatic.com/mock/klimt/fullxfull.jpg",
          full_height: 1200,
          full_width: 900
        }
      ]
    },
    {
      listing_id: 1003,
      user_id: 123456,
      shop_id: 987654,
      title: "Van Gogh Starry Night Canvas Print",
      description: "Classic masterpiece reproduction",
      state: "draft",
      creation_timestamp: Date.now() / 1000,
      created_timestamp: Date.now() / 1000,
      ending_timestamp: (Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 gün sonra
      original_creation_timestamp: Date.now() / 1000,
      last_modified_timestamp: Date.now() / 1000,
      updated_timestamp: Date.now() / 1000,
      state_timestamp: Date.now() / 1000,
      quantity: 5,
      shop_section_id: 12345,
      featured_rank: -1,
      url: "https://www.etsy.com/listing/mock/van-gogh-starry-night",
      num_favorers: 0,
      tags: ["art", "van gogh", "starry night", "canvas"],
      price: {
        amount: 9200,
        divisor: 100,
        currency_code: "USD"
      },
      taxonomy_id: 2078,
      views: 0,
      images: [
        {
          listing_image_id: 1003001,
          url_75x75: "https://i.etsystatic.com/mock/vangogh/75x75.jpg",
          url_170x135: "https://i.etsystatic.com/mock/vangogh/170x135.jpg",
          url_570xN: "https://i.etsystatic.com/mock/vangogh/570xN.jpg",
          url_fullxfull: "https://i.etsystatic.com/mock/vangogh/fullxfull.jpg",
          full_height: 1100,
          full_width: 850
        }
      ]
    }
  ];

  console.log("Mock ürün verileri döndürülüyor:", mockProducts.length);

  // Başarılı yanıt döndür
  return NextResponse.json({
    count: mockProducts.length,
    products: mockProducts
  });
} 