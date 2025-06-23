'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Clock, User, Palette } from "lucide-react";

export default function SettingsPage() {
  const [queueDelay, setQueueDelay] = useState(20);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Ayarları kaydetme işlemi
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Ayarlar kaydedildi');
    } catch (error) {
      console.error('Ayar kaydetme hatası:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black">Ayarlar</h1>
        <p className="text-gray-600">Sistem ayarlarınızı yapılandırın</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <CardTitle>Kuyruk Ayarları</CardTitle>
            </div>
            <CardDescription>
              Otomatik ürün gönderme kuyruğunun bekleme süresini ayarlayın
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Bekleme Süresi (saniye)
              </label>
              <Input
                type="number"
                value={queueDelay}
                onChange={(e) => setQueueDelay(Number(e.target.value))}
                min="5"
                max="300"
                className="w-32"
              />
              <p className="text-xs text-gray-500 mt-1">
                5-300 saniye arası değer girebilirsiniz
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <CardTitle>Profil Bilgileri</CardTitle>
            </div>
            <CardDescription>
              Profil bilgilerinizi güncelleyin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Kullanıcı Adı
              </label>
              <Input placeholder="Kullanıcı adınız" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                E-posta
              </label>
              <Input type="email" placeholder="E-posta adresiniz" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Palette className="w-5 h-5" />
              <CardTitle>Tema Tercihleri</CardTitle>
            </div>
            <CardDescription>
              Arayüz temasını seçin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Button variant="outline" className="flex-1">
                Açık Tema
              </Button>
              <Button variant="ghost" className="flex-1" disabled>
                Koyu Tema
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Şu anda sadece açık tema desteklenmektedir
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </Button>
        </div>
      </div>
    </div>
  );
}