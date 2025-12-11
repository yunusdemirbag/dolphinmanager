# Dolphin Manager

## 📖 Proje Açıklaması

Dolphin Manager, 2100 yılından gelmiş gibi hissettiren, hiper-modern Etsy ürün yönetim sistemidir. Tesla ve Apple'ın tasarım felsefesini yansıtan minimalist, güçlü ve kusursuz bir deneyim sunar.

## 🎯 Vizyonumuz

Bu proje, mevcut karmaşık yapıları bir kenara bırakarak, tamamen sıfırdan, sadece Firebase altyapısını kullanan, son derece akıllı ve basit bir yapı üzerine kurulmuştur. Her bir piksel, her bir animasyon, modern tasarım prensiplerini yansıtır.

## 🏗️ Teknik Altyapı

### 🔧 Teknolojiler
- **Next.js 15** - React framework
- **TypeScript** - Tip güvenliği
- **Tailwind CSS** - Utility-first CSS
- **Firebase** - Backend ve veritabanı
- **Lucide React** - Modern ikonlar

### 📁 Proje Yapısı
```
dolphinmanager/
├── app/                    # Next.js App Router
│   ├── stores/            # Mağazalar sayfası
│   ├── products/          # Ürünler sayfası (3 sekme)
│   ├── settings/          # Ayarlar sayfası
│   └── api/               # API rotaları
│       └── etsy/          # Etsy API entegrasyonu
├── components/            # React bileşenleri
│   ├── ui/                # Temel UI bileşenleri
│   └── Navigation.tsx     # Ana navigasyon
├── lib/                   # Yardımcı fonksiyonlar
│   ├── firebase.ts       # Firebase client config
│   ├── firebase-admin.ts # Firebase admin config
│   └── utils.ts          # Genel yardımcılar
└── .env.local            # Ortam değişkenleri
```

## 🔑 Çevre Değişkenleri

### Firebase Yapılandırması
```env
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."

FIREBASE_PROJECT_ID="..."
FIREBASE_CLIENT_EMAIL="..."
FIREBASE_PRIVATE_KEY="..."
```

### Etsy API Yapılandırması
```env
ETSY_CLIENT_ID="..."
ETSY_CLIENT_SECRET="..."
ETSY_REDIRECT_URI="..."
ETSY_SCOPE="..."
ETSY_API_BASE="..."
```

### OpenAI API
```env
OPENAI_API_KEY="..."
```

## 🎨 Tasarım Prensipleri

### Tesla/Apple Tarzı Minimalizm
- **Renk Paleti**: Beyaz/açık gri arka plan + siyah/koyu gri elementler
- **Tipografi**: Clean, modern fontlar (Inter)
- **Animasyonlar**: Smooth, 200ms transitions
- **Butonlar**: Rounded corners, hover states
- **Kartlar**: Subtle shadows, clean borders

### UI Bileşenleri
- `Button`: 5 varyant (default, outline, secondary, ghost, destructive)
- `Card`: Minimalist kart yapısı
- `Input`: Modern form elementleri
- `Navigation`: Tab-based navigasyon

## 📄 Sayfa Yapıları

### 1. Ana Sayfa (/)
- **Amaç**: Hoş geldin sayfası
- **İçerik**: 3 ana sayfa için kart linkler
- **Tasarım**: Centered layout, büyük kartlar

### 2. Mağazalar (/stores)
- **Amaç**: Etsy mağaza bağlantı yönetimi
- **Özellikler**:
  - Etsy mağaza bağlama
  - Mağaza istatistikleri
  - Token yenileme
  - Bağlantı kesme

### 3. Ürünler (/products)
- **Amaç**: Ana ürün yönetim merkezi
- **3 Sekme**:
  1. **Ürünler**: Etsy'deki mevcut ürünler
  2. **Kuyruktaki Ürünler**: Firebase real-time kuyruk
  3. **Otomatik Ürün Ekleme**: Toplu ürün ekleme

### 4. Ayarlar (/settings)
- **Amaç**: Sistem yapılandırması
- **Özellikler**:
  - Kuyruk bekleme süresi
  - Profil bilgileri
  - Tema tercihleri

## 🔄 Kuyruk Sistemi

### Firebase Firestore Koleksiyonları
- `queue_jobs`: Ürün yükleme kuyruğu
- `etsy_stores`: Mağaza bağlantı bilgileri

### Kuyruk Durumları
- `pending`: Bekleyen
- `processing`: İşleniyor
- `completed`: Tamamlandı
- `failed`: Hatalı

### Otomatik İşleme
- 20 saniye aralıklarla otomatik işleme
- Real-time durum güncellemeleri
- Hata loglaması ve yeniden deneme

## 🚀 Kurulum

### 1. Bağımlılıkları Yükle
```bash
npm install
```

### 2. Çevre Değişkenlerini Ayarla
`.env.local` dosyasını oluştur ve gerekli değişkenleri ekle

### 3. Development Sunucusunu Başlat
```bash
npm run dev
```

### 4. Production Build
```bash
npm run build
npm start
```

## 📦 Vercel Deployment

### Vercel Ortam Değişkenleri
Tüm `.env.local` değişkenlerini Vercel dashboard'ına ekle

### Build Ayarları
- Framework: Next.js
- Node.js Version: 18.x
- Build Command: `npm run build`
- Output Directory: `.next`

---

**Dolphin Manager** - 2100 yılından gelen modern Etsy yönetim deneyimi 🐬
