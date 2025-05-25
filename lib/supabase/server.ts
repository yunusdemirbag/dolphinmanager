import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database.types'

export async function createClient() {
  try {
    // Next.js 15 ile uyumlu, cookie tabanlı Supabase client
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            const cookieStore = await cookies();
            return cookieStore.get(name)?.value;
          }
        }
      }
    )
  } catch (error) {
    console.error("Error creating Supabase client:", error);
    throw error;
  }
} 