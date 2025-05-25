import { redirect } from "next/navigation"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase"
import StoresClient from "./stores-client"

async function getStoresData(userId: string) {
  // If userId is invalid, return empty data
  if (!userId) {
    return {
      stores: [],
      profile: null,
    }
  }

  try {
    const [{ data: stores, error: storesError }, { data: profile, error: profileError }] = await Promise.all([
      supabaseAdmin.from("etsy_stores").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabaseAdmin.from("profiles").select("*").eq("id", userId).single(),
    ])

    if (storesError || profileError) {
      console.error("Stores data fetch error:", { storesError, profileError })
      return {
        stores: [],
        profile: null,
      }
    }

    return {
      stores: stores || [],
      profile: profile || null,
    }
  } catch (error) {
    console.error("Stores data fetch error:", error)
    return {
      stores: [],
      profile: null,
    }
  }
}

export default async function StoresPage() {
  const supabase = createServerComponentClient({ cookies })
  
  // Gerçek kullanıcı ID'sini al
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  const storesData = await getStoresData(user.id)

  return <StoresClient user={user} storesData={storesData} />
}
