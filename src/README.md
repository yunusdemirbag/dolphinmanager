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