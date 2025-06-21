# Dolphin Manager

E-ticaret mağaza yönetim platformu.

## Özellikler
- Etsy entegrasyonu
- Stok yönetimi
- Sipariş takibi
- Finansal raporlama
- Çoklu mağaza desteği
- Supabase entegrasyonu

## Geliştirme
```bash
npm install
npm run dev
```

## Deployment
```bash
git push
```

Vercel ile otomatik dağıtım yapılandırılmıştır. Main branch'e yapılan her push sonrasında uygulama otomatik olarak deploy edilir. 

## 📜 Kod Kuralları

### 1. 🧠 Tek Doğruluk Kaynağı (Redux)
- Global durum sadece Redux Toolkit ile yönetilmelidir.
- `Context API` uygulama durumu için yasaktır. Sadece tema, i18n vb. için kullanılabilir.

### 2. 🧭 Modüler Sayfa Yapısı
- `src/app/layout.tsx` sadece Provider sarmalayıcıları ve ana düzeni içermelidir.
- Tüm sayfa bileşenleri ilgili klasörlerde organize edilmelidir.

### 3. 🎨 Tutarlı Stil Yaklaşımı
- Tailwind CSS ve shadcn/ui bileşenleri kullanılmalıdır.
- Tüm renkler, yazı boyutları ve boşluk değerleri tema dosyasından alınmalıdır.
- Özel stiller için CSS modülleri tercih edilmelidir.

### 4. 📦 Verimli Bağımlılık Yönetimi
- Yeni paket eklemeden önce mevcut çözümleri kontrol edin.
- Her amaç için yalnızca bir kütüphane kullanılmalıdır.
- Gereksiz paketlerden ve kod tekrarından kaçının.

### 5. 🧼 Temiz Kod Pratikleri
- **Mutlak import'lar** kullanın (örn. `@/components/ui/button`) via `tsconfig`.
- `any` tipinden tamamen kaçının. TypeScript tip sistemini tam olarak kullanın.
- Her dosya, değişken ve fonksiyon için açıklayıcı isimler kullanın.
- Tüm dosyalar **tek bir sorumluluğa** hizmet etmelidir.

## 📁 Klasör Yapısı

Proje, `src` klasörü altında organize edilmiştir:

```
src/
├── app/             # Next.js App Router sayfaları ve API rotaları
├── components/      # Yeniden kullanılabilir UI bileşenleri
├── contexts/        # React Context API ile oluşturulmuş bağlamlar
├── hooks/           # Özel React hook'ları
├── lib/             # Yardımcı fonksiyonlar ve servisler
├── styles/          # Global CSS ve stil dosyaları
├── types/           # TypeScript tip tanımlamaları
└── middleware.ts    # Next.js middleware
```

---

## 🤖 GPT Instructions (Cursor internal):
Whenever you create, edit, or refactor any code or file:
- Follow the folder structure above.
- Follow all code rules strictly.
- Structure code for scalability and team collaboration.

> ❗If a file violates these rules, propose a fix or suggest where it should live instead.