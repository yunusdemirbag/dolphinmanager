# 🔧 Etsy App Callback URL Düzeltmesi

## 🚨 Problem
```
"The application that is requesting authorization is not recognized"
```

## 📍 Sebep
İkinci Developer hesabındaki "personalemymanager" app'inde callback URL eksik/yanlış.

## 🛠️ Çözüm Adımları

### 1. Etsy Developer Console
```
🔗 https://www.etsy.com/developers/your-apps
1. İkinci hesabınla giriş yap
2. "personalemymanager" app'ini tıkla
3. "App Details" veya "Settings" sekmesine git
```

### 2. Redirect URI Ayarla
```
Eklenecek URL:
https://dolphinmanager-phi.vercel.app/api/etsy/callback

NOT: HTTP değil HTTPS olmalı!
```

### 3. Scope Permissions Kontrol
```
Gerekli izinler:
☑️ email_r
☑️ shops_r  
☑️ shops_w
☑️ listings_r
☑️ listings_w  
☑️ listings_d
☑️ transactions_r
☑️ transactions_w
☑️ profile_r
☑️ address_r
☑️ address_w
☑️ billing_r
☑️ cart_r
☑️ cart_w
```

### 4. App Status
```
App durumu: "Active" olmalı
Environment: "Sandbox" veya "Production"
```

### 5. Kaydet ve Bekle
```
1. Değişiklikleri kaydet
2. 5-10 dakika bekle (propagation time)
3. Yeniden dene
```

## 🔄 Test
```
Düzeltme sonrası:
1. https://dolphinmanager-phi.vercel.app/stores
2. "Yeni Mağaza Bağla" tıkla
3. Etsy authorization sayfası düzgün açılmalı
```

## ⚠️ Alternatif Plan
Eğer bu app ile sorun devam ederse:
```
1. Aynı Developer hesabında yeni app oluştur
2. Veya birinci hesaba geri dön (eski API keys)
```