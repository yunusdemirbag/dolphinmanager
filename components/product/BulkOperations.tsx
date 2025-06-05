import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { 
  Copy, 
  Edit, 
  Trash, 
  MoreHorizontal, 
  Tag, 
  DollarSign, 
  Box, 
  Eye, 
  EyeOff,
  RefreshCw,
  LayoutGrid,
  Zap
} from "lucide-react";

interface BulkOperationsProps {
  selectedProducts: number[];
  products: any[];
  onSelectAll: () => void;
  onSelectNone: () => void;
  onSelectProduct: (id: number) => void;
  onUpdateBulkState: (state: "active" | "inactive" | "draft") => Promise<void>;
  onDeleteBulk: () => Promise<void>;
  onBulkUpdatePrice: (amount: number, type: "fixed" | "percent" | "increase" | "decrease") => Promise<void>;
  onBulkUpdateTags: (tags: string[], action: "add" | "remove" | "replace") => Promise<void>;
  onBulkUpdateQuantity: (quantity: number) => Promise<void>;
}

export default function BulkOperations({
  selectedProducts,
  products,
  onSelectAll,
  onSelectNone,
  onSelectProduct,
  onUpdateBulkState,
  onDeleteBulk,
  onBulkUpdatePrice,
  onBulkUpdateTags,
  onBulkUpdateQuantity,
}: BulkOperationsProps) {
  const [bulkPriceAmount, setBulkPriceAmount] = useState<number>(0);
  const [bulkPriceType, setBulkPriceType] = useState<"fixed" | "percent" | "increase" | "decrease">("fixed");
  const [bulkTagInput, setBulkTagInput] = useState<string>("");
  const [bulkTagAction, setBulkTagAction] = useState<"add" | "remove" | "replace">("add");
  const [bulkQuantity, setBulkQuantity] = useState<number>(1);
  const [selectedTab, setSelectedTab] = useState<string>("price");

  const handleBulkUpdatePrice = () => {
    if (bulkPriceAmount === 0 && (bulkPriceType === "fixed" || bulkPriceType === "percent")) {
      toast({
        title: "Geçersiz tutar",
        description: "Lütfen geçerli bir tutar girin",
        variant: "destructive",
      });
      return;
    }

    onBulkUpdatePrice(bulkPriceAmount, bulkPriceType);
  };

  const handleBulkUpdateTags = () => {
    if (!bulkTagInput.trim()) {
      toast({
        title: "Etiket gerekli",
        description: "Lütfen en az bir etiket girin",
        variant: "destructive",
      });
      return;
    }

    const tags = bulkTagInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    onBulkUpdateTags(tags, bulkTagAction);
  };

  const handleBulkUpdateQuantity = () => {
    if (bulkQuantity < 0) {
      toast({
        title: "Geçersiz miktar",
        description: "Miktar 0'dan büyük olmalıdır",
        variant: "destructive",
      });
      return;
    }

    onBulkUpdateQuantity(bulkQuantity);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={selectedProducts.length === products.length && products.length > 0}
            onCheckedChange={(checked) => {
              if (checked) {
                onSelectAll();
              } else {
                onSelectNone();
              }
            }}
          />
          <span className="text-sm font-medium">
            {selectedProducts.length} ürün seçildi ({products.length} toplam)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {selectedProducts.length > 0 && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="w-4 h-4 mr-2" />
                    İşlemler
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Toplu İşlemler</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onUpdateBulkState("active")}>
                    <Eye className="w-4 h-4 mr-2" /> Aktif Yap
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUpdateBulkState("inactive")}>
                    <EyeOff className="w-4 h-4 mr-2" /> Pasif Yap
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUpdateBulkState("draft")}>
                    <Edit className="w-4 h-4 mr-2" /> Taslak Yap
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600" onClick={onDeleteBulk}>
                    <Trash className="w-4 h-4 mr-2" /> Sil
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Badge className="bg-blue-600">
                {selectedProducts.length} seçili
              </Badge>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={onSelectAll}>
            Tümünü Seç
          </Button>
          <Button variant="ghost" size="sm" onClick={onSelectNone}>
            Seçimi Temizle
          </Button>
        </div>
      </div>

      {selectedProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Toplu Düzenleme</CardTitle>
            <CardDescription>
              Seçilen {selectedProducts.length} ürün için toplu işlemler uygulayın
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="price">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Fiyat
                </TabsTrigger>
                <TabsTrigger value="tags">
                  <Tag className="w-4 h-4 mr-2" />
                  Etiketler
                </TabsTrigger>
                <TabsTrigger value="quantity">
                  <Box className="w-4 h-4 mr-2" />
                  Stok
                </TabsTrigger>
                <TabsTrigger value="sync">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Senkronizasyon
                </TabsTrigger>
              </TabsList>

              <TabsContent value="price" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">İşlem Tipi</label>
                    <Select
                      value={bulkPriceType}
                      onValueChange={(value) =>
                        setBulkPriceType(value as "fixed" | "percent" | "increase" | "decrease")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="İşlem seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Sabit Fiyat</SelectItem>
                        <SelectItem value="percent">Yüzde Değişim</SelectItem>
                        <SelectItem value="increase">Tutar Artır</SelectItem>
                        <SelectItem value="decrease">Tutar Azalt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {bulkPriceType === "fixed"
                        ? "Yeni Fiyat"
                        : bulkPriceType === "percent"
                        ? "Yüzde Değişim"
                        : bulkPriceType === "increase"
                        ? "Artış Tutarı"
                        : "Azalış Tutarı"}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        {bulkPriceType === "percent" ? (
                          <span className="text-gray-500">%</span>
                        ) : (
                          <DollarSign className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <Input
                        type="number"
                        placeholder={
                          bulkPriceType === "fixed"
                            ? "Örn: 99.99"
                            : bulkPriceType === "percent"
                            ? "Örn: 10"
                            : "Örn: 5"
                        }
                        className="pl-9"
                        value={bulkPriceAmount || ""}
                        onChange={(e) => setBulkPriceAmount(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
                <Button className="w-full" onClick={handleBulkUpdatePrice}>
                  <Zap className="w-4 h-4 mr-2" />
                  Fiyatları Güncelle
                </Button>
              </TabsContent>

              <TabsContent value="tags" className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">İşlem Tipi</label>
                  <Select
                    value={bulkTagAction}
                    onValueChange={(value) => setBulkTagAction(value as "add" | "remove" | "replace")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="İşlem seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Etiket Ekle</SelectItem>
                      <SelectItem value="remove">Etiket Kaldır</SelectItem>
                      <SelectItem value="replace">Etiketleri Değiştir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Etiketler (virgülle ayırın)</label>
                  <Input
                    placeholder="canvas, wall art, abstract, modern"
                    value={bulkTagInput}
                    onChange={(e) => setBulkTagInput(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={handleBulkUpdateTags}>
                  <Tag className="w-4 h-4 mr-2" />
                  Etiketleri Güncelle
                </Button>
              </TabsContent>

              <TabsContent value="quantity" className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Yeni Stok Miktarı</label>
                  <Input
                    type="number"
                    placeholder="Örn: 10"
                    value={bulkQuantity || ""}
                    onChange={(e) => setBulkQuantity(parseInt(e.target.value) || 0)}
                  />
                </div>
                <Button className="w-full" onClick={handleBulkUpdateQuantity}>
                  <Box className="w-4 h-4 mr-2" />
                  Stok Güncelle
                </Button>
              </TabsContent>

              <TabsContent value="sync" className="space-y-4">
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Seçilen ürünleri Etsy ile senkronize edin. Bu işlem, Etsy'deki ürün verilerini 
                    güncelleyecektir.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="w-full">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Etsy'den Al
                    </Button>
                    <Button className="w-full">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Etsy'ye Gönder
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 