import { EtsyListing, EtsyPayment, EtsyReceipt, EtsyStore, EtsyLedgerEntry } from './etsy-api';

/**
 * Generates mock store data when API requests fail
 */
export function generateMockStores(count: number = 1): EtsyStore[] {
  return Array.from({ length: count }, (_, i) => ({
    shop_id: 1000 + i,
    shop_name: `DemoStore${i + 1}`,
    title: `Demo Mağaza ${i + 1}`,
    announcement: 'Bu bir demo mağazadır.',
    currency_code: 'USD',
    is_vacation: false,
    listing_active_count: 25 + Math.floor(Math.random() * 75),
    num_favorers: 100 + Math.floor(Math.random() * 900),
    url: `https://www.etsy.com/shop/demostore${i + 1}`,
    image_url_760x100: 'https://placehold.co/760x100',
    review_count: 50 + Math.floor(Math.random() * 150),
    review_average: 4 + Math.random(),
    is_active: true,
    last_synced_at: new Date().toISOString(),
    avatar_url: 'https://placehold.co/150x150'
  }));
}

/**
 * Generates mock listing data when API requests fail
 */
export function generateMockListings(
  count: number = 25,
  shopId: number = 1000
): { listings: EtsyListing[], count: number } {
  const listings = Array.from({ length: count }, (_, i) => ({
    listing_id: 10000 + i,
    user_id: 5000,
    shop_id: shopId,
    title: `Demo Ürün ${i + 1}`,
    description: 'Bu bir demo ürün açıklamasıdır. API hataları nedeniyle gerçek veri yerine gösterilmektedir.',
    state: Math.random() > 0.2 ? 'active' : 'inactive',
    quantity: 1 + Math.floor(Math.random() * 10),
    url: `https://www.etsy.com/listing/${10000 + i}`,
    views: Math.floor(Math.random() * 1000),
    price: {
      amount: 1000 + Math.floor(Math.random() * 5000),
      divisor: 100,
      currency_code: 'USD',
    },
    tags: ['demo', 'örnek', 'test'],
    images: [{
      listing_id: 10000 + i,
      listing_image_id: 20000 + i,
      url_75x75: 'https://placehold.co/75x75',
      url_170x135: 'https://placehold.co/170x135',
      url_570xN: 'https://placehold.co/570x400',
      url_fullxfull: 'https://placehold.co/800x600',
      alt_text: `Demo Ürün ${i + 1}`,
    }],
  } as EtsyListing));

  return {
    listings,
    count: 100 + count, // Toplam sayfa sayısını simüle etmek için daha büyük bir sayı
  };
}

/**
 * Generates mock receipt data when API requests fail
 */
export function generateMockReceipts(
  count: number = 25,
  shopId: number = 1000
): { receipts: EtsyReceipt[], count: number } {
  const now = Math.floor(Date.now() / 1000);
  const oneDay = 24 * 60 * 60;
  
  const receipts = Array.from({ length: count }, (_, i) => ({
    receipt_id: 30000 + i,
    receipt_type: 0,
    seller_user_id: 5000,
    seller_email: 'seller@example.com',
    buyer_user_id: 6000 + i,
    buyer_email: `buyer${i}@example.com`,
    name: `Demo Müşteri ${i + 1}`,
    first_line: 'Demo Adres',
    second_line: '',
    city: 'İstanbul',
    state: '',
    zip: '34000',
    formatted_address: 'Demo Adres\nİstanbul, 34000\nTürkiye',
    country_iso: 'TR',
    payment_method: 'credit_card',
    payment_email: `buyer${i}@example.com`,
    message_from_seller: '',
    message_from_buyer: '',
    message_from_payment: '',
    is_paid: true,
    is_shipped: Math.random() > 0.3,
    create_timestamp: now - (i * oneDay),
    update_timestamp: now - (i * oneDay) + 3600,
    grandtotal: {
      amount: 2000 + Math.floor(Math.random() * 10000),
      divisor: 100,
      currency_code: 'USD',
    },
    subtotal: {
      amount: 1800 + Math.floor(Math.random() * 9000),
      divisor: 100,
      currency_code: 'USD',
    },
    total_price: {
      amount: 1800 + Math.floor(Math.random() * 9000),
      divisor: 100,
      currency_code: 'USD',
    },
    total_shipping_cost: {
      amount: 200 + Math.floor(Math.random() * 1000),
      divisor: 100,
      currency_code: 'USD',
    },
    total_tax_cost: {
      amount: Math.floor(Math.random() * 500),
      divisor: 100,
      currency_code: 'USD',
    },
    total_vat_cost: {
      amount: 0,
      divisor: 100,
      currency_code: 'USD',
    },
    discount_amt: {
      amount: 0,
      divisor: 100,
      currency_code: 'USD',
    },
    gift_wrap_price: {
      amount: 0,
      divisor: 100,
      currency_code: 'USD',
    },
  } as EtsyReceipt));

  return {
    receipts,
    count: 50 + count,
  };
}

/**
 * Generates mock payment data when API requests fail
 */
export function generateMockPayments(
  count: number = 25,
  shopId: number = 1000
): { payments: EtsyPayment[], count: number } {
  const now = Math.floor(Date.now() / 1000);
  const oneDay = 24 * 60 * 60;
  
  const payments = Array.from({ length: count }, (_, i) => {
    const grossAmount = 2000 + Math.floor(Math.random() * 10000);
    const feesAmount = Math.floor(grossAmount * 0.065); // ~6.5% fee
    const netAmount = grossAmount - feesAmount;
    
    return {
      payment_id: 40000 + i,
      buyer_user_id: 6000 + i,
      shop_id: shopId,
      receipt_id: 30000 + i,
      amount_gross: {
        amount: grossAmount,
        divisor: 100,
        currency_code: 'USD',
      },
      amount_fees: {
        amount: feesAmount,
        divisor: 100,
        currency_code: 'USD',
      },
      amount_net: {
        amount: netAmount,
        divisor: 100,
        currency_code: 'USD',
      },
      posted_gross: {
        amount: grossAmount,
        divisor: 100,
        currency_code: 'USD',
      },
      posted_fees: {
        amount: feesAmount,
        divisor: 100,
        currency_code: 'USD',
      },
      posted_net: {
        amount: netAmount,
        divisor: 100,
        currency_code: 'USD',
      },
      adjusted_gross: {
        amount: grossAmount,
        divisor: 100,
        currency_code: 'USD',
      },
      adjusted_fees: {
        amount: feesAmount,
        divisor: 100,
        currency_code: 'USD',
      },
      adjusted_net: {
        amount: netAmount,
        divisor: 100,
        currency_code: 'USD',
      },
      currency: 'USD',
      shop_currency: 'USD',
      buyer_currency: 'USD',
      shipping_user_id: 6000 + i,
      shipping_address_id: 7000 + i,
      billing_address_id: 7000 + i,
      status: 'paid',
      shipped_timestamp: now - (i * oneDay) + 86400,
      create_timestamp: now - (i * oneDay),
      update_timestamp: now - (i * oneDay) + 3600,
    } as EtsyPayment;
  });

  return {
    payments,
    count: 50 + count,
  };
}

/**
 * Generates mock ledger entries when API requests fail
 */
export function generateMockLedgerEntries(
  count: number = 25,
  shopId: number = 1000
): { entries: EtsyLedgerEntry[], count: number } {
  const now = Math.floor(Date.now() / 1000);
  const oneDay = 24 * 60 * 60;
  
  let balance = 50000; // $500.00 starting balance
  
  const entries = Array.from({ length: count }, (_, i) => {
    // Generate random amount between +$5.00 and +$200.00 for sales
    // or between -$5.00 and -$20.00 for fees
    const isSale = Math.random() > 0.3;
    const amount = isSale 
      ? 500 + Math.floor(Math.random() * 19500) 
      : -(500 + Math.floor(Math.random() * 1500));
    
    balance += amount;
    
    return {
      entry_id: 50000 + i,
      ledger_id: 1000,
      sequence_number: i,
      amount: {
        amount,
        divisor: 100,
        currency_code: 'USD',
      },
      currency: 'USD',
      description: isSale 
        ? `Demo Satış #${i + 1}` 
        : `Demo İşlem Ücreti #${i + 1}`,
      balance: {
        amount: balance,
        divisor: 100,
        currency_code: 'USD',
      },
      create_date: now - (i * oneDay),
    } as EtsyLedgerEntry;
  });

  return {
    entries,
    count: 50 + count,
  };
}

/**
 * Generates mock financial summary when API requests fail
 */
export function generateMockFinancialSummary(shopId: number = 1): {
  totalRevenue: number
  totalOrders: number
  totalFees: number
  netRevenue: number
  averageOrderValue: number
  currency: string
} {
  const totalOrders = 15 + Math.floor(Math.random() * 35);
  const totalRevenue = Math.round((totalOrders * (25 + Math.random() * 50)) * 100) / 100;
  const totalFees = Math.round((totalRevenue * 0.15) * 100) / 100;
  const netRevenue = Math.round((totalRevenue - totalFees) * 100) / 100;
  const averageOrderValue = Math.round((totalRevenue / totalOrders) * 100) / 100;

  return {
    totalRevenue,
    totalOrders,
    totalFees,
    netRevenue,
    averageOrderValue,
    currency: 'USD'
  };
} 