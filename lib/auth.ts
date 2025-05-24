import { createServerSupabase } from "./supabase"
import { redirect } from "next/navigation"

export async function getUser() {
  const supabase = createServerSupabase()

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    console.error("Error getting user:", error)
    return null
  }
}

export async function requireAuth() {
  const user = await getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return user
}

export async function getUserProfile(userId: string) {
  const supabase = createServerSupabase()

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

  if (error) {
    console.error("Error fetching profile:", error)
    return null
  }

  return profile
}

// Client-side auth helper
export async function getClientUser() {
  if (typeof window === "undefined") return null

  const { createClientSupabase } = await import("./supabase")
  const supabase = createClientSupabase()

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    console.error("Error getting client user:", error)
    return null
  }
}
