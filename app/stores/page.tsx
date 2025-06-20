import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAuth } from "@/lib/auth"
import StoresClient from "./stores-client"
import { getEtsyStores } from '@/lib/etsy-api'

async function getStoresData(userId: string) {
  // If userId is invalid, return empty data
  if (!userId) {
    console.log("getStoresData: No user ID provided")
    return {
      stores: [],
      profile: null,
    }
  }

  try {
    console.log("Fetching stores data for user:", userId)
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

    console.log(`Found ${stores?.length || 0} stores for user ${userId}`)
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
  try {
    // Önce auth kontrolü yapıyoruz - bu fonksiyon kullanıcı giriş yapmamışsa login sayfasına yönlendirir
    console.log("Checking auth on stores page")
    const user = await requireAuth()
    console.log("User authenticated on stores page:", user.id)
    
    const storesData = await getStoresData(user.id)
    
    return <StoresClient user={user} storesData={storesData} />
  } catch (error) {
    console.error("Error in StoresPage:", error)
    // Eğer auth hatası değilse ve başka bir hata ise, login sayfasına yönlendir
    redirect("/auth/login")
  }
}
