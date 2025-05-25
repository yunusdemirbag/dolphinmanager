import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function getUser() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      console.log("getUser error:", error)
      return null
    }

    return user
  } catch (error) {
    console.error("Error getting user:", error)
    return null
  }
}

export async function requireAuth() {
  try {
    const user = await getUser()

    if (!user) {
      console.log("requireAuth: No user found, redirecting to login")
      redirect("/auth/login")
    }

    return user
  } catch (error) {
    console.error("Error in requireAuth:", error)
    redirect("/auth/login")
  }
}

export async function getUserProfile(userId: string) {
  try {
    const supabase = await createClient()
    
    const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

    if (error) {
      console.error("Error fetching profile:", error)
      return null
    }

    return profile
  } catch (error) {
    console.error("Error in getUserProfile:", error)
    return null
  }
}

// Client-side auth helper
export async function getClientUser() {
  if (typeof window === "undefined") return null

  try {
    const { createClientSupabase } = await import("@/lib/supabase")
    const supabase = createClientSupabase()

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      console.log("getClientUser error:", error)
      return null
    }

    return user
  } catch (error) {
    console.error("Error getting client user:", error)
    return null
  }
}
