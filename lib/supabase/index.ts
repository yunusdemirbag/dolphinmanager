// This file provides a single import point for Supabase client
import { createClientFromBrowser } from './client'

// Re-export the client creation function
export const createClientSupabase = createClientFromBrowser 