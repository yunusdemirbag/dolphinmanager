import StoresClient from "./stores-client"

export default async function StoresPage() {
  // Firebase geçişi sonrası basitleştirilmiş stores page
  return <StoresClient initialStores={[]} />
}