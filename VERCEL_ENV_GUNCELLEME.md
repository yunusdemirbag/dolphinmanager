# 🚀 Vercel Environment Variables Güncelleme

## 📍 Adım Adım Rehber

### 1. Vercel Dashboard
```
🔗 https://vercel.com/dashboard
1. "dolphinmanager" projesini bul ve tıkla
2. Üst menüden "Settings" sekmesine git
3. Sol menüden "Environment Variables" seç
```

### 2. Güncellenecek Variables

#### ETSY_CLIENT_ID
- **Eski Değer**: `09etv418r09uh0wrvvam0asb`
- **Yeni Değer**: `vqxojc8u4keyk1oyhj3u7vzn`
- **Environment**: Production, Preview, Development (hepsini seç)

#### ETSY_CLIENT_SECRET
- **Eski Değer**: `uhmm76rlp3`
- **Yeni Değer**: `uop87pc6d4`
- **Environment**: Production, Preview, Development (hepsini seç)

#### ETSY_API_KEY
- **Eski Değer**: `09etv418r09uh0wrvvam0asb`
- **Yeni Değer**: `vqxojc8u4keyk1oyhj3u7vzn`
- **Environment**: Production, Preview, Development (hepsini seç)

### 3. Güncelleme İşlemi
```
1. Her variable'ın yanındaki "..." menüsüne tıkla
2. "Edit" seç
3. Yeni değeri yapıştır
4. "Save" tıkla
5. Tüm environment'ları (Prod, Preview, Dev) seçili olduğundan emin ol
```

### 4. Deployment Trigger
```
Değişiklik yaptıktan sonra:
1. "Deployments" sekmesine git
2. "Redeploy" butonuna tıkla
3. Veya yeni commit push'la otomatik deployment tetikle
```

### 5. Doğrulama
```
Deployment bittikten sonra:
1. https://dolphinmanager-phi.vercel.app/stores
2. Yeni mağaza bağlamayı dene
3. API limitinin aşılmadığını kontrol et
```

## ⚠️ Önemli Notlar

### Downtime
- Güncelleme sırasında kısa süreli kesinti olabilir
- En iyi production dışı saatlerde yap

### Backup Plan
Eğer sorun olursa eski değerlere geri dön:
```
ETSY_CLIENT_ID: 09etv418r09uh0wrvvam0asb
ETSY_CLIENT_SECRET: uhmm76rlp3
ETSY_API_KEY: 09etv418r09uh0wrvvam0asb
```

### Test
- Önce Preview environment'ta test et
- Sonra Production'a uygula

## 📊 Beklenen Sonuç
- ✅ Mevcut 4 mağaza çalışmaya devam eder
- ✅ 5 yeni mağaza daha bağlanabilir
- ✅ Toplam 10 mağaza kapasitesi