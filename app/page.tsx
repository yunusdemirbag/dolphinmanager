import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Store, Package, Settings } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-black">
          Dolphin Manager
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          2100 yılından gelmiş gibi hissettiren, hiper-modern Etsy ürün yönetim sistemi. 
          Tesla ve Apple'ın tasarım felsefesiyle buluşan minimalist deneyim.
        </p>
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
