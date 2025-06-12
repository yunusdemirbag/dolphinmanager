"use client"

import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Product } from "@/types/product";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash, Pencil, Pin } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onTogglePin?: (product: Product) => void;
  isPinned?: boolean;
  pinLoading?: boolean;
}

const ProductCard = ({
  product,
  onEdit,
  onDelete,
  onTogglePin,
  isPinned = false,
  pinLoading = false,
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

  return (
    <Card className="overflow-hidden group h-full flex flex-col">
      <div className="relative overflow-hidden h-48 bg-gray-100">
        <Image
          src={getProxiedImageUrl(imageUrl)}
          alt={product.title || "Ürün görseli"}
          fill
          className={cn(
            "object-cover transition-all group-hover:scale-105",
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
              "absolute top-2 left-2 transition-all bg-white/70 hover:bg-white/90 h-8 w-8",
              isPinned && "text-red-500"
            )}
            onClick={() => onTogglePin(product)}
            disabled={pinLoading}
          >
            <Pin className={cn("h-4 w-4", isPinned && "fill-red-500")} />
          </Button>
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

        {product.etsy_listing_id && (
          <Badge variant="outline" className="mt-2">
            Etsy: {product.etsy_listing_id}
          </Badge>
        )}
      </CardContent>
      
      <CardFooter className="p-2 border-t bg-muted/30 gap-2 flex-wrap">
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