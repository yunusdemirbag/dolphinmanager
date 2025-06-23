'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, Clock, Play, Pause, Settings as SettingsIcon } from "lucide-react";
import ProductFormModal from "@/components/ProductFormModal";

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState('products');
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);

  const tabs = [
    { id: 'products', label: 'Ürünler', icon: Package },
    { id: 'queue', label: 'Kuyruktaki Ürünler', icon: Clock },
    { id: 'auto-add', label: 'Otomatik Ürün Ekleme', icon: Plus },
  ];

  const renderProducts = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Ürünler</h2>
          <p className="text-gray-600">Etsy'e yüklenmiş veya taslak ürünleriniz</p>
        </div>
        <Button onClick={() => setIsProductFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Ürün Ekle
        </Button>
      </div>
      
      <div className="grid gap-4">
        <Card className="p-4">
          <div className="text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Henüz ürün eklenmemiş</p>
            <p className="text-sm">İlk ürününüzü eklemek için yukarıdaki butona tıklayın</p>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderQueue = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Kuyruk Yönetimi</h2>
          <p className="text-gray-600">Etsy'e yüklenmeyi bekleyen ürünler</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <SettingsIcon className="w-4 h-4 mr-2" />
            Ayarlar
          </Button>
          <Button 
            variant={isQueueRunning ? "destructive" : "default"}
            onClick={() => setIsQueueRunning(!isQueueRunning)}
          >
            {isQueueRunning ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Durdur
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Başlat
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        <Card className="p-4">
          <div className="text-center text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Kuyrukta ürün bulunmuyor</p>
            <p className="text-sm">Ürün ekleme formundan "Kuyruğa Ekle" butonunu kullanın</p>
          </div>
        </Card>
      </div>

      {isQueueRunning && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-800 font-medium">Kuyruk işleniyor...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderAutoAdd = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Otomatik Ürün Ekleme</h2>
        <p className="text-gray-600">Toplu olarak ürün ekleme sistemi</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Klasör Seçimi</CardTitle>
          <CardDescription>
            Görseller ve kaynaklar klasörlerini seçin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Görseller Klasörü</label>
            <Button variant="outline" className="w-full justify-start">
              Klasör Seç
            </Button>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Kaynaklar Klasörü</label>
            <Button variant="outline" className="w-full justify-start">
              Klasör Seç
            </Button>
          </div>
          <Button className="w-full" disabled>
            Otomatik Ürün Ekleme İşlemini Başlat
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black">Ürünler</h1>
        <p className="text-gray-600">Ürünlerinizi yönetin ve Etsy'e yükleyin</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'queue' && renderQueue()}
        {activeTab === 'auto-add' && renderAutoAdd()}
      </div>

      <ProductFormModal 
        isOpen={isProductFormOpen} 
        onClose={() => setIsProductFormOpen(false)} 
      />
    </div>
  );
}