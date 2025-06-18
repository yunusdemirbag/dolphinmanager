import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '@/types/database.types'

export async function createClient() {
  const cookieStore = await cookies()
  
  // Debug bilgisi ekleyelim
  console.log("Creating server-side Supabase client with URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
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
  
  // Şema önbelleğini yenilemeyi dene
  try {
    await refreshSchemaCache(client);
    console.log("Supabase client oluşturuldu");
  } catch (e) {
    // Şema yenileme hatası kritik değil, devam et
    console.log("Şema önbelleği yenileme denemesi yapıldı");
  }
  
  return client
}

// Service role client oluştur (RLS bypass için)
export function createServiceClient(
  supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL!,
  serviceRoleKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY!
) {
  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Şema önbelleğini yenilemek için yardımcı fonksiyon
export async function refreshSchemaCache(client: any) {
  try {
    // Önce refresh_schema_cache RPC fonksiyonunu çağır
    try {
      await client.rpc('refresh_schema_cache');
      console.log("Şema önbelleği yenilendi");
    } catch (e) {
      // refresh_schema_cache fonksiyonu mevcut değilse, alternatif yöntemi dene
      console.log("refresh_schema_cache fonksiyonu bulunamadı, alternatif yöntem deneniyor");
    }
    
    // Alternatif yöntem - doğrudan pg_notify
    await client.rpc('pg_notify', { channel: 'pgrst', payload: 'reload schema' });
    
    // Geçici tablo oluştur ve sil (yedek yöntem)
    try {
      const tempTableName = `_temp_schema_refresh_${Date.now()}`;
      await client.rpc('execute_sql', { 
        sql: `CREATE TEMPORARY TABLE ${tempTableName} (id SERIAL PRIMARY KEY); DROP TABLE ${tempTableName};` 
      });
    } catch (e) {
      // execute_sql fonksiyonu mevcut değilse, hata önemli değil
    }
    
    return { success: true, message: "Şema önbelleği yenilendi" };
  } catch (error) {
    console.error("Şema önbelleği yenileme hatası:", error);
    return { success: false, error };
  }
} 