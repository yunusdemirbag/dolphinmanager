import fs from 'fs';
import path from 'path';
import os from 'os';

// Önbellek klasörü yolu
const CACHE_DIR = path.join(os.homedir(), 'Documents', 'dolphin-cache');

// Önbellek klasörünü oluştur (yoksa)
export function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`✅ Önbellek klasörü oluşturuldu: ${CACHE_DIR}`);
  }
  return CACHE_DIR;
}

// Mağaza için önbellek dosyası yolu
export function getStoreCacheFilePath(shopId: string) {
  ensureCacheDir();
  return path.join(CACHE_DIR, `store-${shopId}.json`);
}

// Önbelleğe veri kaydet
export function saveToCache(shopId: string, data: any) {
  try {
    const filePath = getStoreCacheFilePath(shopId);
    fs.writeFileSync(filePath, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
    console.log(`✅ Önbelleğe kaydedildi: ${filePath}`);
    return true;
  } catch (error) {
    console.error('❌ Önbelleğe kaydetme hatası:', error);
    return false;
  }
}

// Önbellekten veri oku
export function loadFromCache(shopId: string, maxAge = 24 * 60 * 60 * 1000) { // Varsayılan 24 saat
  try {
    const filePath = getStoreCacheFilePath(shopId);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const cacheData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Önbellek süresi kontrolü
    if (Date.now() - cacheData.timestamp > maxAge) {
      console.log('⚠️ Önbellek süresi dolmuş');
      return null;
    }
    
    console.log(`✅ Önbellekten yüklendi: ${filePath}`);
    return cacheData.data;
  } catch (error) {
    console.error('❌ Önbellekten okuma hatası:', error);
    return null;
  }
}

// Önbelleği temizle
export function clearCache(shopId?: string) {
  try {
    if (shopId) {
      // Belirli bir mağazanın önbelleğini temizle
      const filePath = getStoreCacheFilePath(shopId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ Önbellek temizlendi: ${filePath}`);
      }
    } else {
      // Tüm önbelleği temizle
      const files = fs.readdirSync(CACHE_DIR);
      files.forEach(file => {
        fs.unlinkSync(path.join(CACHE_DIR, file));
      });
      console.log(`✅ Tüm önbellek temizlendi: ${CACHE_DIR}`);
    }
    return true;
  } catch (error) {
    console.error('❌ Önbellek temizleme hatası:', error);
    return false;
  }
}