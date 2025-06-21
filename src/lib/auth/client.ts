"use client";

import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

/**
 * TARAYICI TARAFI: Kullanıcının giriş durumunu anlık olarak dinler.
 * Bu bir "hook"tur ve React bileşenleri içinde kullanılır.
 * @returns Mevcut kullanıcı (User objesi), null (giriş yapmamış) veya undefined (henüz kontrol ediliyor).
 */
export function useAuth() {
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined: yükleniyor

  useEffect(() => {
    // onAuthStateChanged, Firebase'in kimlik doğrulama durumundaki
    // herhangi bir değişikliği (giriş, çıkış) anında yakalar.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Bileşen ekrandan kaldırıldığında (unmount), bu dinleyiciyi temizle.
    // Bu, hafıza sızıntılarını önler.
    return () => unsubscribe();
  }, []);

  return user;
} 