"use client"

import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Product } from "@/types/product";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash, Pencil, Pin, ExternalLink, Copy } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onCopy?: (product: Product) => void;
  onTogglePin?: (product: Product) => void;
  isPinned?: boolean;
  pinLoading?: boolean;
  gridType?: 'grid3' | 'grid4' | 'grid5' | 'list';
}

const ProductCard = ({
  product,
  onEdit,
  onDelete,
  onCopy,
  onTogglePin,
  isPinned = false,
  pinLoading = false,
  gridType = 'grid3'
}: ProductCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Etsy görselleri için proxy kullan
  const getProxiedImageUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("etsystatic.com")) {
      return `/api/proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  // Ürün görselini al (eski veya yeni yapıda olabilir)
  const imageUrl = product.image_url || 
    (product.images && product.images.length > 0 ? 
      (typeof product.images[0] === 'string' ? 
        product.images[0] : 
        product.images[0]?.url_570xN || '') : 
      '/images/placeholder-product.jpg');
      
  // Etsy URL'ini güvenli bir şekilde kontrol et
  const hasEtsyUrl = product.etsy_listing_id && product.etsy_listing_id > 0;
  const etsyUrl = hasEtsyUrl ? `https://www.etsy.com/listing/${product.etsy_listing_id}` : '';

  return (
    <Card className="overflow-hidden group h-full flex flex-col transition-all duration-200 hover:shadow-xl border-gray-100 hover:border-primary/20">
      <div className="relative overflow-hidden aspect-square bg-gray-50">
        <Image
          src={getProxiedImageUrl(imageUrl)}
          alt={product.title || "Ürün görseli"}
          fill
          className={cn(
            "object-cover transition-all duration-300 group-hover:scale-105",
            !imageLoaded && "scale-110 blur-sm"
          )}
          onLoad={() => setImageLoaded(true)}
        />
        
        {/* Top left pin button */}
        {onTogglePin && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute top-2 left-2 transition-all bg-white/70 hover:bg-white/90 h-8 w-8 rounded-full shadow-sm",
              isPinned && "text-red-500"
            )}
            onClick={() => onTogglePin(product)}
            disabled={pinLoading}
          >
            <Pin className={cn("h-4 w-4", isPinned && "fill-red-500")} />
          </Button>
        )}
        
        {/* Etsy link */}
        {hasEtsyUrl && (
          <a 
            href={etsyUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="absolute top-2 right-2 bg-white/70 hover:bg-white/90 p-2 rounded-full shadow-sm transition-all opacity-0 group-hover:opacity-100"
            title="Etsy'de Görüntüle"
          >
            <ExternalLink className="h-4 w-4 text-gray-700" />
          </a>
        )}
      </div>
      
      <CardContent className="p-4 flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium line-clamp-2 text-sm">{product.title}</h3>
        </div>
        
        {product.price && (
          <p className="text-lg font-bold text-primary">
            {formatPrice(product.price)}
          </p>
        )}

        <div className="flex flex-wrap gap-1 mt-2">
          {/* Ürün durumu varsa göster (state alanı Product tipinde tanımlı değil, 
              ancak API yanıtında olabilir, bu nedenle any tipiyle güvenli erişim) */}
          {(product as any).state === "active" && (
            <Badge variant="default" className="bg-green-500 hover:bg-green-600">Aktif</Badge>
          )}
          {(product as any).state === "draft" && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Taslak</Badge>
          )}
          {(product as any).state === "inactive" && (
            <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50">Pasif</Badge>
          )}
          
          {product.etsy_listing_id && (
            <Badge variant="outline" className="text-xs">
              ID: {product.etsy_listing_id}
            </Badge>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-2 border-t bg-muted/20 gap-2 flex-wrap">
        {onEdit && (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(product)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Düzenle
          </Button>
        )}
        
        {onCopy && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onCopy(product)}
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            Kopyala
          </Button>
        )}
        
        {onDelete && (
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            onClick={() => onDelete(product)}
          >
            <Trash className="h-3.5 w-3.5 mr-1" />
            Sil
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ProductCard; 