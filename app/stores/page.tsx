import { redirect } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase"
import StoresClient from "./stores-client"

async function getStoresData(userId: string) {
  // If userId is placeholder or invalid, return empty data
  if (!userId || userId === "placeholder-user-id") {
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
  // Placeholder user ID - in real app, get from session
  const userId = "placeholder-user-id"

  if (!userId) {
    redirect("/auth/login")
  }

  const storesData = await getStoresData(userId)

  return <StoresClient user={{ id: userId }} storesData={storesData} />
}
