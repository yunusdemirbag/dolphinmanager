import { createClientComponentClient, createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { createClient } from "@supabase/supabase-js"
import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database.types"

// Environment variables check
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable")
}

// Client-side Supabase client
export const createClientSupabase = () => {
  // Next.js 15 için modern API kullanımı
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Server-side Supabase client with cookies - only use in server components
export const createServerComponentSupabase = () => {
  if (typeof window !== "undefined") {
    throw new Error("createServerComponentSupabase should only be used in server components")
  }

  const { cookies } = require("next/headers")
  return createServerComponentClient<Database>({ cookies })
}

// Admin Supabase client (for server actions and API routes)
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey, // Fallback to anon key if service key not available
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

// Simple client for basic operations (fallback)
export const createSimpleClient = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey)
}

// Server-side Supabase admin client for API routes
export const createServerSupabase = () => {
  return supabaseAdmin
}
