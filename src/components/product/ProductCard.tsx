"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Copy, Edit, Trash2, Check, X } from "lucide-react"
import { Product } from "@/types/product"
import { formatPrice } from "@/lib/utils"

interface ProductCardProps {
  product: Product
  listView?: boolean
  isSelected: boolean
  onSelect: (listingId: number) => void
  onEdit: (product: Product) => void
  onCopy: (product: Product) => void
  onDelete: (listingId: number) => void
  onUpdateState: (product: Product, newState: "active" | "inactive" | "draft") => void
}

export function ProductCard({
  product,
  listView = false,
  isSelected,
  onSelect,
  onEdit,
  onCopy,
  onDelete,
  onUpdateState
}: ProductCardProps) {
  if (listView) {
    return (
      <div
        className={`bg-white rounded-2xl shadow-sm overflow-hidden flex flex-row items-center min-h-[180px] hover:shadow-lg transition-shadow duration-300 border border-gray-100 ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          if (
            (e.target as HTMLElement).tagName === 'BUTTON' ||
            (e.target as HTMLElement).closest('button') ||
            (e.target as HTMLElement).tagName === 'A' ||
            (e.target as HTMLElement).closest('a')
          ) {
            return;
          }
          onSelect(product.listing_id);
        }}
      >
        <div className="relative w-[140px] h-[140px] bg-gray-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0].url_570xN}
              alt={product.images[0].alt_text || 'Product image'}
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500">No image available</span>
            </div>
          )}
          <div className="absolute top-2 left-2 z-30">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect(product.listing_id)}
              className="bg-white border-gray-300 rounded-sm"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-between px-6 py-4 min-w-0">
          <div className="flex flex-col gap-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate mb-1">{product.title}</h3>
            <div className="text-gray-500 text-sm truncate mb-2">{product.description?.slice(0, 80)}{product.description && product.description.length > 80 ? '...' : ''}</div>
            <div className="flex flex-row items-center gap-6 mb-2">
              <span className="text-xl font-bold text-primary">{formatPrice(product.price)}</span>
              <span className="text-xs text-gray-500">Stok: {product.quantity}</span>
              <span className="text-xs text-gray-500">Görüntüleme: {product.metrics?.views || 0}</span>
              <span className="text-xs text-gray-500">Favori: {product.metrics?.favorites || 0}</span>
              <span className="text-xs text-gray-500">Satış: {product.metrics?.sold || 0}</span>
            </div>
          </div>
          <div className="flex flex-row gap-2 mt-2 w-full justify-between">
            <Button
              variant="outline"
              size="icon"
              className="flex-1 min-w-0"
              title="Düzenle"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(product);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="flex-1 min-w-0"
              title="Kopyala"
              onClick={(e) => {
                e.stopPropagation();
                onCopy(product);
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="flex-1 min-w-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Sil"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(product.listing_id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={
                'flex-1 min-w-0 ' +
                (product.state === 'active'
                  ? 'text-green-600 hover:text-green-700'
                  : product.state === 'inactive'
                    ? 'text-red-600 hover:text-red-700'
                    : 'text-yellow-700 hover:text-yellow-800')
              }
              title={product.state === 'active' ? 'Aktif/Pasif Yap' : 'Aktif Yap'}
              onClick={(e) => {
                e.stopPropagation();
                const newState = product.state === 'active' ? 'inactive' : 'active';
                onUpdateState(product, newState);
              }}
            >
              {product.state === 'active' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col relative hover:shadow-lg transition-shadow duration-300 border border-gray-100 group ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
      style={{ cursor: 'pointer', minHeight: 340 }}
      onClick={(e) => {
        if (
          (e.target as HTMLElement).tagName === 'BUTTON' ||
          (e.target as HTMLElement).closest('button') ||
          (e.target as HTMLElement).tagName === 'A' ||
          (e.target as HTMLElement).closest('a')
        ) {
          return;
        }
        onSelect(product.listing_id);
      }}
    >
      <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-all duration-200">
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white shadow px-3 py-1 rounded-full text-xs font-medium text-primary hover:bg-primary hover:text-white border border-primary hover:border-primary-dark transition-colors duration-200"
          title="Etsy'de Göster"
          onClick={e => e.stopPropagation()}
        >
          Etsy'de Göster
        </a>
      </div>
      <div className="absolute top-2 left-2 z-30">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(product.listing_id)}
          className="bg-white border-gray-300 rounded-sm"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden relative">
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0].url_570xN}
            alt={product.images[0].alt_text || 'Product image'}
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500">No image available</span>
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col justify-between px-4 py-3">
        <h3 className="text-base font-bold text-gray-900 truncate mb-1">{product.title}</h3>
        <div className="text-gray-500 text-xs truncate mb-2">{product.description?.slice(0, 60)}{product.description && product.description.length > 60 ? '...' : ''}</div>
        <div className="flex flex-row items-center gap-3 mb-2">
          <span className="text-lg font-bold text-primary">{formatPrice(product.price)}</span>
          <span className="text-xs text-gray-500">Stok: {product.quantity}</span>
          <span className="text-xs text-gray-500">Görüntüleme: {product.metrics?.views ?? product.views ?? 0}</span>
          <span className="text-xs text-gray-500">Satış: {product.metrics?.sold ?? product.sold ?? 0}</span>
        </div>
        <div className="flex flex-row gap-2 mt-2 w-full justify-between">
          <Button
            variant="outline"
            size="icon"
            className="flex-1 min-w-0"
            title="Düzenle"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(product);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="flex-1 min-w-0"
            title="Kopyala"
            onClick={(e) => {
              e.stopPropagation();
              onCopy(product);
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="flex-1 min-w-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Sil"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(product.listing_id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={
              'flex-1 min-w-0 ' +
              (product.state === 'active'
                ? 'text-green-600 hover:text-green-700'
                : product.state === 'inactive'
                  ? 'text-red-600 hover:text-red-700'
                  : 'text-yellow-700 hover:text-yellow-800')
            }
            title={product.state === 'active' ? 'Aktif/Pasif Yap' : 'Aktif Yap'}
            onClick={(e) => {
              e.stopPropagation();
              const newState = product.state === 'active' ? 'inactive' : 'active';
              onUpdateState(product, newState);
            }}
          >
            {product.state === 'active' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
} 