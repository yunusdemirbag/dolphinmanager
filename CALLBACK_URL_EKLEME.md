# 🔧 Etsy App Callback URL Ekleme

## 📸 Mevcut Durum
- ✅ Website URL: `https://dolphinmanager-phi.vercel.app`
- ❌ Callback URLs: Eksik

## 🎯 Yapılacak
1. "Edit your callback URLs" butonuna tıkla
2. Yeni callback URL ekle
3. Kaydet

## 📋 Eklenecek Callback URL
```
https://dolphinmanager-phi.vercel.app/api/etsy/callback
```

## ⚠️ Dikkat Edilecekler
- HTTPS ile başlamalı (HTTP değil)
- Tam path olmalı (/api/etsy/callback)
- Slash (/) karakterleri doğru olmalı
- Boşluk olmamalı

## 🔄 Test
Callback URL eklendikten sonra:
1. 5 dakika bekle
2. Mağaza bağlamayı tekrar dene
3. Etsy authorization sayfası düzgün çalışmalı

## 📝 Sorun Devam Ederse
- App'i tamamen sil ve yeniden oluştur
- Veya eski API keys'lere geri dön