'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function AuthCheck({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
    router.push('/login');
  };

  useEffect(() => {
    // Sayfa yüklendiğinde oturum durumunu kontrol et
    const loginStatus = localStorage.getItem('isLoggedIn');
    
    if (loginStatus !== 'true') {
      // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
      router.push('/login');
    } else {
      setIsLoggedIn(true);
    }
    
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null; // useEffect içinde yönlendirme yapılacak
  }

  // Kullanıcı giriş yapmışsa içeriği göster
  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-1"
        >
          <LogOut className="w-4 h-4" />
          Çıkış
        </Button>
      </div>
      {children}
    </>
  );
}