'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Store, ChevronDown, Check, Loader2 } from 'lucide-react';

export function StoreSelector() {
  const { activeStore, allStores, switchStore, isLoading, hasMultipleStores } = useStore();
  const [isSwitching, setIsSwitching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Outside click handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Eğer loading ise
  if (isLoading) {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Yükleniyor...
      </Button>
    );
  }

  // Eğer mağaza yoksa
  if (!activeStore || allStores.length === 0) {
    return (
      <Button variant="outline" asChild>
        <a href="/stores">
          <Store className="w-4 h-4 mr-2" />
          Mağaza Bağla
        </a>
      </Button>
    );
  }

  // Eğer tek mağaza varsa dropdown gösterme
  if (!hasMultipleStores) {
    return (
      <Button variant="outline" asChild>
        <a href="/stores">
          <Store className="w-4 h-4 mr-2" />
          {activeStore.shop_name}
        </a>
      </Button>
    );
  }

  // Çoklu mağaza - Custom dropdown
  const handleStoreSwitch = async (store: any) => {
    if (store.shop_id === activeStore.shop_id) return;
    
    setIsSwitching(true);
    setIsOpen(false);
    try {
      await switchStore(store);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button 
        variant="outline" 
        disabled={isSwitching}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isSwitching ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Store className="w-4 h-4 mr-2" />
        )}
        {activeStore.shop_name}
        <ChevronDown className="w-4 h-4 ml-2" />
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="p-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-700">
              Mağaza Seç ({allStores.length})
            </span>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {allStores.map((store) => (
              <button
                key={store.shop_id}
                onClick={() => handleStoreSwitch(store)}
                className="w-full text-left p-3 hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <Store className="w-4 h-4 mr-3 text-orange-500" />
                  <div>
                    <div className="font-medium text-gray-900">{store.shop_name}</div>
                    <div className="text-xs text-gray-500">ID: {store.shop_id}</div>
                  </div>
                </div>
                {store.shop_id === activeStore.shop_id && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
              </button>
            ))}
          </div>
          
          <div className="border-t border-gray-100">
            <a 
              href="/stores" 
              className="w-full text-left p-3 hover:bg-gray-50 flex items-center text-gray-700"
            >
              <Store className="w-4 h-4 mr-3" />
              Mağazaları Yönet
            </a>
          </div>
        </div>
      )}
    </div>
  );
}