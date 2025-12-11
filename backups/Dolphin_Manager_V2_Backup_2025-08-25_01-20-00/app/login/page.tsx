'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Basit doğrulama - gerçek uygulamada bu işlem sunucu tarafında yapılmalıdır
    if (username === 'admin' && password === 'admin1') {
      // Başarılı giriş
      toast({
        title: "Giriş başarılı",
        description: "Yönetim paneline yönlendiriliyorsunuz.",
        variant: "default",
      });
      
      // Oturum bilgisini localStorage'a kaydet
      localStorage.setItem('isLoggedIn', 'true');
      
      // Ana sayfaya yönlendir
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } else {
      // Başarısız giriş
      toast({
        title: "Giriş başarısız",
        description: "Kullanıcı adı veya şifre hatalı.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex flex-col items-center justify-center mb-4">
            <h1 className="text-3xl font-bold text-center">Dolphin Manager</h1>
            <p className="text-gray-600 text-center mt-1">Yönetim Paneli Girişi</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Kullanıcı Adı</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Kullanıcı adınızı girin"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifrenizi girin"
                required
              />
            </div>
            <Button type="submit" className="w-full bg-black hover:bg-gray-800" disabled={loading}>
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
            
          </form>
        </CardContent>
      </Card>
    </div>
  );
}