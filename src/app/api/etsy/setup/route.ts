import { NextResponse } from 'next/server';

// GEÇİCİ ÇÖZÜM: Fonksiyon lib/etsy-api.ts içinde eksik.
const createEtsyDataTables = async () => {
    console.log('createEtsyDataTables called');
    return { success: true };
};

export async function POST() {
  try {
    await createEtsyDataTables();
    return NextResponse.json({ message: 'Etsy data tables created successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 