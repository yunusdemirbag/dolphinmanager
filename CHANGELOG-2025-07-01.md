# Değişiklik Kaydı - 1 Temmuz 2025

## Etsy API Başlık Doğrulama Hatası Düzeltmesi

### Problem
- Etsy API "does not start with a letter or number" hatası
- "contains invalid characters" doğrulama hatası
- Başlıklar API tarafından reddediliyordu

### Çözüm

#### 1. AI Başlık Üretimi Düzeltmesi (`lib/ai-title-tag-system.ts`)
- **Yeni `sanitizeTitle()` fonksiyonu eklendi** (satır 894-923)
  - Geçersiz karakterleri temizler
  - Başlığın harf/rakam ile başlamasını garanti eder
  - 140 karakter limitini kontrol eder

#### 2. AI Prompt Güncellemesi
- **ETSY API COMPLIANCE kuralları eklendi** (satır 46-54)
  - Başlık harf/rakam ile başlamalı
  - İzin verilen karakterler belirtildi
  - Yasak karakterler açıklandı

#### 3. Form Validasyonu Güçlendirildi (`components/product-form/ProductFormSubmission.tsx`)
- **Etsy API doğrulama kuralları eklendi** (satır 309-317)
  - Başlık formatı kontrolü
  - Geçersiz karakter kontrolü
  - API hatalarını önlemek için ön kontrol

#### 4. Diğer İyileştirmeler
- **AI model optimizasyonu**: `gpt-4o` → `gpt-4o-mini` (daha hızlı, daha ucuz)
- **Resim sıkıştırma**: AI için %50 boyut azaltma
- **Paralel işleme**: AI çağrıları optimize edildi

### Teknik Detaylar

**Düzeltilen Dosyalar:**
1. `lib/ai-title-tag-system.ts` - AI başlık üretimi ve temizleme
2. `components/product-form/ProductFormSubmission.tsx` - Form validasyonu
3. `app/api/ai/analyze-and-generate/route.ts` - Model optimizasyonu
4. `components/EmbeddedProductForm.tsx` - Resim sıkıştırma

**Regex Kullanımı:**
- Başlık kontrolü: `/^[a-zA-Z0-9]/`
- Geçersiz karakter temizleme: `/[^\w\s\-|—.,!?&'():]/g`

### Test Sonuçları
- ✅ Başlıklar artık harf/rakam ile başlıyor
- ✅ Geçersiz karakterler otomatik temizleniyor
- ✅ API doğrulama hataları çözüldü
- ✅ Form öncesi validasyon çalışıyor

### Commit Hash
`2e1469d` - "Etsy API başlık doğrulama hatalarını çöz"

---

## Sonraki Adımlar
- [ ] Production'da test et
- [ ] Performans metrikleri takip et
- [ ] Kullanıcı geri bildirimlerini değerlendir