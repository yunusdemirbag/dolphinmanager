import { getUser } from "@/lib/auth"
import { getEtsyStores } from "@/lib/etsy-api"
import StoresClient from "./stores-client"
import { redirect } from "next/navigation"

async function getStoresData(userId: string) {
  try {
    const stores = await getEtsyStores(userId)
    return {
      stores,
      profile: null
    }
  } catch (error) {
    console.error("Error fetching stores:", error)
    return {
      stores: [],
      profile: null,
      error: error instanceof Error ? error.message : "Mağaza bilgileri alınamadı"
    }
  }
}

export default async function StoresPage() {
  const user = await getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  const storesData = await getStoresData(user.id)

  return (
    <div className="min-h-screen bg-gray-50">
      <StoresClient user={user} storesData={storesData} />
    </div>
  )
}
