'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Store, Package, Settings } from 'lucide-react';
import { StoreSelector } from '@/components/StoreSelector';

const Navigation = () => {
  const pathname = usePathname();

  const links = [
    {
      href: '/stores',
      label: 'Mağazalar',
      icon: Store,
      active: pathname.startsWith('/stores'),
    },
    {
      href: '/products',
      label: 'Ürünler',
      icon: Package,
      active: pathname.startsWith('/products'),
    },
    {
      href: '/settings',
      label: 'Ayarlar',
      icon: Settings,
      active: pathname.startsWith('/settings'),
    },
  ];

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold text-black">
              Dolphin Manager
            </Link>
            
            <div className="flex space-x-1">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                      link.active
                        ? "bg-black text-white"
                        : "text-gray-800 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <Icon size={18} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          
          {/* Mağaza Seçici - Sağ tarafta */}
          <div className="flex items-center">
            <StoreSelector />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;