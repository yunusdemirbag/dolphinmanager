# 🔄 İkinci Developer Hesabı API Keys Değişimi

## 📋 Mevcut Bilgiler (1. Hesap)
```
ETSY_CLIENT_ID="09etv418r09uh0wrvvam0asb"
ETSY_CLIENT_SECRET="uhmm76rlp3"
```

## 🆕 Yeni Bilgiler (2. Hesap) - Doldurulacak
```
ETSY_CLIENT_ID="BURAYA_IKINCI_HESAP_CLIENT_ID"
ETSY_CLIENT_SECRET="BURAYA_IKINCI_HESAP_CLIENT_SECRET"
```

## ⚡ Değişim Adımları

### 1. İkinci Hesaptan API Keys Al
```
🔗 https://www.etsy.com/developers/your-apps
1. İkinci hesabınla giriş yap
2. App seç/oluştur
3. API bilgilerini kopyala
```

### 2. .env.local Dosyasını Güncelle
```bash
# Satır 18-19'u değiştir:
ETSY_CLIENT_ID="yeni_client_id"
ETSY_CLIENT_SECRET="yeni_client_secret"
```

### 3. Restart Development Server
```bash
# Terminal'de:
npm run dev
# veya
yarn dev
```

### 4. Test Et
```
1. Yeni mağaza bağlamayı dene
2. Mevcut mağazaların çalışıp çalışmadığını kontrol et
```

## ⚠️ Önemli Notlar

### Callback URL
Yeni app'te callback URL'nin doğru olduğundan emin ol:
```
https://dolphinmanager-phi.vercel.app/api/etsy/callback
```

### Scope Permissions
Aynı izinleri ver:
```
email_r shops_r shops_w listings_r listings_w listings_d 
transactions_r transactions_w profile_r address_r address_w 
billing_r cart_r cart_w
```

### Mevcut Bağlantılar
- 1. hesaptaki mağazalar çalışmaya devam eder
- 2. hesaba yeni 5 mağaza daha bağlayabilirsin
- Toplam: 10 mağaza kapasitesi

## 🔄 Geri Alma
Eğer problem olursa eski keys'leri geri koy:
```
ETSY_CLIENT_ID="09etv418r09uh0wrvvam0asb"
ETSY_CLIENT_SECRET="uhmm76rlp3"
```