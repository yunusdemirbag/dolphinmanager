import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowRight, Store, Package, Settings, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { getConnectedStoreFromFirebaseAdmin } from '@/lib/firebase-admin';

export default async function Home() {
  // Etsy mağaza durumunu al
  let storeInfo = null;
  try {
    storeInfo = await getConnectedStoreFromFirebaseAdmin();
  } catch (error) {
    console.error('Store bilgisi alınamadı:', error);
  }
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-black">
          Dolphin Manager
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          2100 yılından gelmiş gibi hissettiren, hiper-modern Etsy ürün yönetim sistemi. 
          Tesla ve Apple&apos;ın tasarım felsefesiyle buluşan minimalist deneyim.
        </p>
      </div>

      {/* Etsy Mağaza Durumu */}
      <div className="max-w-4xl mx-auto">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Store className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg">Etsy Mağaza Durumu</CardTitle>
              </div>
              {storeInfo ? (
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Bağlı
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                  <XCircle className="w-3 h-3 mr-1" />
                  Bağlı Değil
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {storeInfo ? (
                <>
                  <div>
                    <p className="text-sm text-gray-600">Etsy Mağazası</p>
                    <p className="font-semibold text-gray-900">{storeInfo.shop_name || 'CyberDecorArt'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Son Senkronizasyon</p>
                    <p className="font-semibold text-gray-900">
                      {storeInfo.updated_at ? 
                        (storeInfo.updated_at.seconds ? 
                          new Date(storeInfo.updated_at.seconds * 1000).toLocaleString('tr-TR') :
                          new Date(storeInfo.updated_at).toLocaleString('tr-TR')
                        ) : 
                        new Date().toLocaleString('tr-TR')
                      }
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-gray-600">Etsy Mağazası</p>
                    <p className="font-semibold text-gray-500">Bağlı değil</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Son Senkronizasyon</p>
                    <p className="font-semibold text-gray-500">-</p>
                  </div>
                </>
              )}
            </div>
            {!storeInfo && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <p className="text-sm text-amber-800">
                    Etsy mağazanızı bağlamak için Mağazalar sayfasına gidin.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <Card className="group hover:shadow-lg transition-all duration-300">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mx-auto mb-4">
              <Store className="w-6 h-6 text-white" />
            </div>
            <CardTitle>Mağazalar</CardTitle>
            <CardDescription>
              Etsy mağazanızı bağlayın ve yönetin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/stores">
              <Button className="w-full group-hover:bg-gray-900 transition-colors">
                Mağazalara Git
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mx-auto mb-4">
              <Package className="w-6 h-6 text-white" />
            </div>
            <CardTitle>Ürünler</CardTitle>
            <CardDescription>
              Ürünlerinizi ekleyin, düzenleyin ve yönetin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/products">
              <Button className="w-full group-hover:bg-gray-900 transition-colors">
                Ürünlere Git
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mx-auto mb-4">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <CardTitle>Ayarlar</CardTitle>
            <CardDescription>
              Sistem ayarlarınızı yapılandırın
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings">
              <Button className="w-full group-hover:bg-gray-900 transition-colors">
                Ayarlara Git
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
