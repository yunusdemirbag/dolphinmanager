import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Firebase connection test
    const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (!firebaseProjectId || !firebaseApiKey) {
      return NextResponse.json({
        success: false,
        error: "Firebase environment variables not configured",
      });
    }

    // Basic Firebase configuration test
    return NextResponse.json({
      success: true,
      message: "Firebase connection configured successfully",
      firebase: {
        projectId: firebaseProjectId,
        hasApiKey: !!firebaseApiKey,
        hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        hasStorageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Firebase connection test failed",
    });
  }
}