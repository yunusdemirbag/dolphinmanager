import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ÖNEMLİ: Bu istemci, SERVICE_ROLE_KEY kullandığı için TAM YETKİLERE sahiptir.
// Bu istemciyi ASLA tarayıcı tarafında veya güvenli olmayan bir sunucu ortamında ifşa etmeyin.
// Sadece sunucu tarafı API rotaları ve 'getStaticProps'/'getServerSideProps' gibi güvenli ortamlarda kullanılmalıdır.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey) 