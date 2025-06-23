// Mock Supabase client for compatibility
export function createClientSupabase() {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          data: [],
          error: null
        })
      }),
      insert: () => ({
        data: null,
        error: null
      })
    })
  };
}