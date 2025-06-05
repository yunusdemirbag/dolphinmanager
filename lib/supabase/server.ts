import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database.types'
import { SupabaseClient } from '@supabase/supabase-js'

export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = cookies()
  
  // Debug bilgisi ekleyelim
  console.log("Creating server-side Supabase client with URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = cookieStore.get(name);
          if (name === 'sb-access-token' || name === 'sb-refresh-token') {
            console.log(`Reading auth cookie: ${name}, exists: ${!!cookie}`);
          }
          return cookie?.value;
        },
        set(name, value, options) {
          try {
            if (name === 'sb-access-token' || name === 'sb-refresh-token') {
              console.log(`Setting auth cookie: ${name}, length: ${value?.length || 0}`);
            }
            cookieStore.set({ name, value, ...options })
          } catch (e) {
            // Bu hata server component içinde olması beklenir
            console.warn('Failed to set cookie in a Server Component', e)
          }
        },
        remove(name, options) {
          try {
            if (name === 'sb-access-token' || name === 'sb-refresh-token') {
              console.log(`Removing auth cookie: ${name}`);
            }
            cookieStore.set({ name, value: '', ...options })
          } catch (e) {
            // Bu hata server component içinde olması beklenir
            console.warn('Failed to remove cookie in a Server Component', e)
          }
        },
      },
    }
  )
  
  return client
} 