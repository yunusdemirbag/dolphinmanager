// lib/auth.ts
// Bu dosya, hem sunucu hem de tarayıcı tarafında kullanıcı kimliğini doğrulamak için merkezi fonksiyonlar içerir.

import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin'; // Sadece sunucu tarafında kullanılır
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client'; // Sadece tarayıcı tarafında kullanılır
import { redirect } from 'next/navigation';

/**
 * SUNUCU TARAFI: Gelen bir isteğin (request) çerezlerini (cookies) kullanarak
 * kullanıcının kimliğini doğrular. Sadece API rotaları ve Sunucu Bileşenleri'nde kullanılır.
 * @param req - Next.js'ten gelen NextRequest veya standart Request objesi.
 * @returns Doğrulanmış kullanıcı token'ı veya null.
 */
export async function getAuthenticatedUser(req: Request | NextRequest) {
  // 1. İstek başlıklarından (headers) 'session' adındaki çerezi bul.
  const sessionCookie = (req.headers.get('cookie') || '')
    .split(';')
    .find(c => c.trim().startsWith('session='))
    ?.split('=')[1];

  // 2. Eğer çerez yoksa, kullanıcı giriş yapmamış demektir.
  if (!sessionCookie) {
    return null;
  }

  // 3. Çerezi Firebase Admin SDK ile doğrula.
  // Bu, çerezin geçerli ve sahte olmadığını garanti eder.
  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedToken;
  } catch (error) {
    // Çerez geçersiz veya süresi dolmuşsa, kullanıcı giriş yapmamış demektir.
    console.warn("Invalid session cookie found in lib/auth.ts:", error);
    return null;
  }
}

/**
 * SUNUCU TARAFI: Bir sayfanın veya API rotasının korunmasını sağlar.
 * Eğer kullanıcı giriş yapmamışsa, onu doğrudan giriş sayfasına yönlendirir.
 * @param req - Gelen istek.
 * @returns Kullanıcı giriş yapmışsa kullanıcı token'ını döndürür. Aksi takdirde yönlendirme yapar.
 */
export async function requireAuth(req: Request | NextRequest) {
  const user = await getAuthenticatedUser(req);

  if (!user) {
    // Kullanıcı yoksa, /auth/login sayfasına yönlendir.
    redirect('/auth/login');
  }

  return user;
}


// ------------------- TARAYICI TARAFI (CLIENT-SIDE) -------------------
// Aşağıdaki fonksiyonlar SADECE "use client" ile işaretlenmiş bileşenlerde kullanılır.


/**
 * TARAYICI TARAFI: Kullanıcının giriş durumunu anlık olarak dinler.
 * Bu bir "hook"tur ve React bileşenleri içinde kullanılır.
 * @returns Mevcut kullanıcı (User objesi), null (giriş yapmamış) veya undefined (henüz kontrol ediliyor).
 */
import { useState, useEffect } from 'react';

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