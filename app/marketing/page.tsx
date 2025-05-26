"use client";

import { ArrowUp, Eye, ShoppingCart, DollarSign, TrendingUp } from "lucide-react";

export default function MarketingPage() {
  return (
    <div className="container p-6 mx-auto max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Marketing Dashboard</h1>
        <button className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
          Senkronize Et
        </button>
      </div>
      
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between">
            <div>
              <div className="text-gray-500 text-sm font-medium mb-1">Görüntülenme</div>
              <div className="text-2xl font-bold">59.400</div>
            </div>
            <div className="bg-blue-50 h-10 w-10 flex items-center justify-center rounded-full">
              <Eye className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <div className="flex items-center mt-3 text-sm">
            <span className="flex items-center text-green-500 mr-1">
              <ArrowUp className="h-3 w-3 mr-0.5" />
              13.2%
            </span>
            <span className="text-gray-500">geçen aya göre</span>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between">
            <div>
              <div className="text-gray-500 text-sm font-medium mb-1">Satışlar</div>
              <div className="text-2xl font-bold">438</div>
            </div>
            <div className="bg-green-50 h-10 w-10 flex items-center justify-center rounded-full">
              <ShoppingCart className="h-5 w-5 text-green-500" />
            </div>
          </div>
          <div className="flex items-center mt-3 text-sm">
            <span className="flex items-center text-green-500 mr-1">
              <ArrowUp className="h-3 w-3 mr-0.5" />
              11.8%
            </span>
            <span className="text-gray-500">geçen aya göre</span>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between">
            <div>
              <div className="text-gray-500 text-sm font-medium mb-1">Gelir</div>
              <div className="text-2xl font-bold">₺2,702.96</div>
            </div>
            <div className="bg-purple-50 h-10 w-10 flex items-center justify-center rounded-full">
              <DollarSign className="h-5 w-5 text-purple-500" />
            </div>
          </div>
          <div className="flex items-center mt-3 text-sm">
            <span className="flex items-center text-green-500 mr-1">
              <ArrowUp className="h-3 w-3 mr-0.5" />
              11.4%
            </span>
            <span className="text-gray-500">geçen aya göre</span>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between">
            <div>
              <div className="text-gray-500 text-sm font-medium mb-1">Dönüşüm Oranı</div>
              <div className="text-2xl font-bold">%0.2</div>
            </div>
            <div className="bg-orange-50 h-10 w-10 flex items-center justify-center rounded-full">
              <TrendingUp className="h-5 w-5 text-orange-500" />
            </div>
          </div>
          <div className="text-gray-500 text-sm mt-3">
            Ortalama Sipariş: ₺25.99
          </div>
        </div>
      </div>
      
      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Ürün Performansı</h2>
          <p className="text-sm text-gray-500 mt-1">Son 30 günde en çok satan ürünler</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-sm text-gray-500 border-b">
                <th className="text-left p-4 font-medium">Ürün</th>
                <th className="text-center p-4 font-medium">Fiyat</th>
                <th className="text-center p-4 font-medium">Görüntülenme</th>
                <th className="text-center p-4 font-medium">Satış</th>
                <th className="text-center p-4 font-medium">Dönüşüm</th>
                <th className="text-center p-4 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg mr-3 flex items-center justify-center text-gray-400">
                      <span className="text-xs">Ürün</span>
                    </div>
                    <div>
                      <div className="font-medium">Örnek Ürün 1</div>
                      <div className="text-xs text-gray-500">SKU: PRD-001</div>
                    </div>
                  </div>
                </td>
                <td className="text-center p-4 font-medium">₺25.00</td>
                <td className="text-center p-4">240</td>
                <td className="text-center p-4">12</td>
                <td className="text-center p-4">5.0%</td>
                <td className="text-center p-4">
                  <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Aktif</span>
                </td>
              </tr>
              <tr className="border-b hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg mr-3 flex items-center justify-center text-gray-400">
                      <span className="text-xs">Ürün</span>
                    </div>
                    <div>
                      <div className="font-medium">Örnek Ürün 2</div>
                      <div className="text-xs text-gray-500">SKU: PRD-002</div>
                    </div>
                  </div>
                </td>
                <td className="text-center p-4 font-medium">₺19.99</td>
                <td className="text-center p-4">180</td>
                <td className="text-center p-4">8</td>
                <td className="text-center p-4">4.4%</td>
                <td className="text-center p-4">
                  <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Aktif</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="p-4 text-center border-t border-gray-100">
          <button className="text-primary text-sm font-medium hover:underline">
            Tüm Ürünleri Görüntüle
          </button>
        </div>
      </div>
      
      {/* Marketing Tips */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Marketing İpuçları</h2>
          <p className="text-sm text-gray-500 mt-1">Satışlarınızı artırmak için öneriler</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">SEO Optimizasyonu</h3>
            <p className="text-sm text-blue-700">
              Anahtar kelimelerinizi gözden geçirin ve başlıklarda kullanın. 
              Özellikle "canvas" ve "duvar dekorasyonu" gibi popüler aramaları içeren ürünlere odaklanın.
            </p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">Fiyatlandırma Stratejisi</h3>
            <p className="text-sm text-green-700">
              En çok görüntülenen ama az satılan ürünleriniz için fiyat indirimi deneyebilirsiniz.
              Yüksek dönüşüm oranına sahip ürünlerinizin fiyatını artırabilirsiniz.
            </p>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="font-semibold text-purple-900 mb-2">Sosyal Medya Tanıtımı</h3>
            <p className="text-sm text-purple-700">
              En popüler ürünlerinizi Pinterest ve Instagram'da tanıtın.
              Görseller ve kullanıcı yorumlarıyla sosyal kanıt oluşturun.
            </p>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4">
            <h3 className="font-semibold text-orange-900 mb-2">Sezonsal Kampanyalar</h3>
            <p className="text-sm text-orange-700">
              Yaklaşan özel günler ve tatiller için özel kampanyalar planlayın.
              Sınırlı süreli indirimlerle satışlarınızı artırın.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 