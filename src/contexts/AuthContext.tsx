"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, onAuthStateChanged, getIdToken } from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  getAuthToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  getAuthToken: async () => null
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🔄 Auth provider başlatılıyor...')
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔄 Auth state değişti:', user ? `${user.email} (${user.uid})` : 'Kullanıcı yok')
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const getAuthToken = async (): Promise<string | null> => {
    if (!user) {
      console.warn('⚠️ Auth token alınamadı: Kullanıcı giriş yapmamış')
      return null
    }

    try {
      const token = await getIdToken(user, true) // forceRefresh = true
      console.log('✅ Auth token alındı')
      return token
    } catch (error) {
      console.error('❌ Auth token alma hatası:', error)
      return null
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, getAuthToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}