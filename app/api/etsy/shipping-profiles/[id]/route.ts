import { NextResponse } from 'next/server'
import { getEtsyClient } from '@/lib/etsy'

// Kargo profilini güncelle
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const etsy = await getEtsyClient()
    const data = await request.json()
    const profile = await etsy.updateShippingProfile(parseInt(params.id), data)
    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error updating shipping profile:', error)
    return NextResponse.json(
      { error: 'Kargo profili güncellenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}

// Kargo profilini sil
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const etsy = await getEtsyClient()
    await etsy.deleteShippingProfile(parseInt(params.id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting shipping profile:', error)
    return NextResponse.json(
      { error: 'Kargo profili silinirken bir hata oluştu' },
      { status: 500 }
    )
  }
} 