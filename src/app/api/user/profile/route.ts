import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { db as adminDb } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  try {
    const profileDocRef = adminDb.collection('profiles').doc(user.uid)
    const profileDoc = await profileDocRef.get()

    if (!profileDoc.exists) {
      return new NextResponse(JSON.stringify({ error: 'Profile not found' }), { status: 404 })
    }
    return NextResponse.json(profileDoc.data())
  } catch (error) {
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
  }
}