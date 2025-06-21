#!/bin/bash

# Bu script, projeyi src klasörü yapısına taşır
echo "Dolphin Manager - src klasörüne geçiş başlatılıyor..."

# Klasörleri oluştur
mkdir -p src/app src/components src/lib src/styles src/hooks src/contexts src/types

# Dosyaları kopyala
echo "Dosyalar kopyalanıyor..."
cp -r app/* src/app/
cp -r components/* src/components/
cp -r lib/* src/lib/
cp -r styles/* src/styles/
cp -r hooks/* src/hooks/
cp -r contexts/* src/contexts/
cp -r types/* src/types/
cp middleware.ts src/

# Gerekli düzenlemeler
echo "Yapılandırma dosyaları güncelleniyor..."

# README.md dosyasını güncelle
echo "src/README.md oluşturuluyor..."
cat > src/README.md << 'EOL'
# Dolphin Manager Kaynak Kodu

Bu klasör, Dolphin Manager uygulamasının tüm kaynak kodunu içerir. Proje yapısı aşağıdaki gibidir:

## Klasör Yapısı

- `app/`: Next.js App Router sayfaları ve API rotaları
- `components/`: Yeniden kullanılabilir UI bileşenleri
- `contexts/`: React Context API ile oluşturulmuş bağlamlar
- `hooks/`: Özel React hook'ları
- `lib/`: Yardımcı fonksiyonlar, API istemcileri ve diğer yardımcı programlar
- `styles/`: Global CSS ve stil dosyaları
- `types/`: TypeScript tip tanımlamaları

## Kod Kuralları

1. **Tek Doğruluk Kaynağı**: Global durum için Redux Toolkit kullanılmalıdır.
2. **Modüler Sayfa Yapısı**: Sayfalar ve bileşenler mantıksal olarak organize edilmelidir.
3. **Tutarlı Stil**: Tailwind CSS ve shadcn/ui bileşenleri kullanılmalıdır.
4. **Verimli Bağımlılık**: Gereksiz paketlerden kaçınılmalıdır.
5. **Temiz Kod**: TypeScript tip güvenliği sağlanmalı ve açıklayıcı isimler kullanılmalıdır.

## İçe Aktarma (Import) Kuralları

Mutlak import'lar kullanılmalıdır:

```typescript
// Doğru
import Button from '@/components/ui/button';

// Yanlış
import Button from '../../components/ui/button';
```
EOL

echo "Geçiş tamamlandı!"
echo "Şimdi 'npm run dev' komutu ile uygulamayı test edebilirsiniz." 