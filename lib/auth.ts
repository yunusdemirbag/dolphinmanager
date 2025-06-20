import { redirect } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged, User } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { cookies } from "next/headers"

// Server-side authentication helper using cookies
export async function getUser(): Promise<User | null> {
  try {
    // For server-side, we need to verify the session token from cookies
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value
    
    if (!sessionToken) {
      return null
    }

    // In a production app, you would verify the Firebase session token here
    // For now, we'll return null to indicate no authenticated user
    // You'll need to implement Firebase Admin SDK for server-side verification
    
    return null
  } catch (error) {
    console.error("Error getting user:", error)
    return null
  }
}

export async function requireAuth(): Promise<User> {
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
    const userDocRef = doc(db, "profiles", userId)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      console.log("User profile not found")
      return null
    }

    return { id: userDoc.id, ...userDoc.data() }
  } catch (error) {
    console.error("Error in getUserProfile:", error)
    return null
  }
}

// Client-side auth helper
export function getClientUser(): Promise<User | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}
