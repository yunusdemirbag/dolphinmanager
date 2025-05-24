import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protected routes
  const protectedRoutes = ["/dashboard", "/products", "/orders", "/analytics", "/onboarding"]
  const isProtectedRoute = protectedRoutes.some((route) => req.nextUrl.pathname.startsWith(route))

  // Auth routes
  const authRoutes = ["/auth/login", "/auth/register"]
  const isAuthRoute = authRoutes.includes(req.nextUrl.pathname)

  // Redirect logic
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL("/auth/login", req.url))
  }

  if (isAuthRoute && session) {
    // Check if user needs onboarding
    const { data: profile } = await supabase
      .from("profiles")
      .select("etsy_shop_name")
      .eq("id", session.user.id)
      .single()

    if (!profile?.etsy_shop_name) {
      return NextResponse.redirect(new URL("/onboarding", req.url))
    } else {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  }

  // Redirect root to appropriate page
  if (req.nextUrl.pathname === "/") {
    if (session) {
      // Check if user needs onboarding
      const { data: profile } = await supabase
        .from("profiles")
        .select("etsy_shop_name")
        .eq("id", session.user.id)
        .single()

      if (!profile?.etsy_shop_name) {
        return NextResponse.redirect(new URL("/onboarding", req.url))
      } else {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
    } else {
      return NextResponse.redirect(new URL("/auth/login", req.url))
    }
  }

  return res
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
