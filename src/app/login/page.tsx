import { redirect } from 'next/navigation'

export default function LoginPage() {
  // /login'i /auth/login'e yönlendir
  redirect('/auth/login')
}