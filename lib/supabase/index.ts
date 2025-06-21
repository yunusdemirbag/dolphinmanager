export { createClient } from './server'
export { createAdminClient } from './admin'
export { createClientFromBrowser } from './client'

// Backward compatibility için
export async function createClientSupabase() {
  const { createClient } = await import('./server')
  return createClient()
} 