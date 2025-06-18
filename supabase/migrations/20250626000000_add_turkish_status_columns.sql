-- Etsy uploads tablosuna Türkçe durum kolonları ekleme
ALTER TABLE etsy_uploads 
ADD COLUMN IF NOT EXISTS durum_tr TEXT,
ADD COLUMN IF NOT EXISTS aciklama_tr TEXT,
ADD COLUMN IF NOT EXISTS baslik_tr TEXT,
ADD COLUMN IF NOT EXISTS olusturma_tarihi_tr TEXT,
ADD COLUMN IF NOT EXISTS islem_tarihi_tr TEXT;

-- Mevcut kayıtları güncelle
UPDATE etsy_uploads 
SET 
  durum_tr = CASE 
    WHEN state = 'pending' THEN 'Sırada Bekliyor'
    WHEN state = 'processing' THEN 'İşleniyor'
    WHEN state = 'completed' THEN 'Yüklendi'
    WHEN state = 'failed' THEN 'Hata'
    ELSE 'Bilinmiyor'
  END,
  baslik_tr = COALESCE(
    SUBSTRING(product_data->>'title' FROM 1 FOR 50) || '...',
    'Başlık Yok'
  ),
  olusturma_tarihi_tr = TO_CHAR(created_at AT TIME ZONE 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI'),
  islem_tarihi_tr = CASE 
    WHEN processed_at IS NOT NULL THEN TO_CHAR(processed_at AT TIME ZONE 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI')
    ELSE '-'
  END,
  aciklama_tr = CASE 
    WHEN state = 'pending' THEN 'Kuyrukta bekliyor, yakında işlenecek'
    WHEN state = 'processing' THEN 'Şu anda Etsy''ye yükleniyor'
    WHEN state = 'completed' AND listing_id IS NOT NULL THEN 'Etsy''de yayınlandı (ID: ' || listing_id || ')'
    WHEN state = 'failed' THEN COALESCE('Hata: ' || error_message, 'Bilinmeyen hata oluştu')
    ELSE 'Durum belirsiz'
  END;

-- Trigger oluştur - yeni kayıtlar için otomatik Türkçe güncelleme
CREATE OR REPLACE FUNCTION update_turkish_columns()
RETURNS TRIGGER AS $$
BEGIN
  NEW.durum_tr = CASE 
    WHEN NEW.state = 'pending' THEN 'Sırada Bekliyor'
    WHEN NEW.state = 'processing' THEN 'İşleniyor'
    WHEN NEW.state = 'completed' THEN 'Yüklendi'
    WHEN NEW.state = 'failed' THEN 'Hata'
    ELSE 'Bilinmiyor'
  END;
  
  NEW.baslik_tr = COALESCE(
    SUBSTRING(NEW.product_data->>'title' FROM 1 FOR 50) || '...',
    'Başlık Yok'
  );
  
  NEW.olusturma_tarihi_tr = TO_CHAR(NEW.created_at AT TIME ZONE 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI');
  
  NEW.islem_tarihi_tr = CASE 
    WHEN NEW.processed_at IS NOT NULL THEN TO_CHAR(NEW.processed_at AT TIME ZONE 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI')
    ELSE '-'
  END;
  
  NEW.aciklama_tr = CASE 
    WHEN NEW.state = 'pending' THEN 'Kuyrukta bekliyor, yakında işlenecek'
    WHEN NEW.state = 'processing' THEN 'Şu anda Etsy''ye yükleniyor'
    WHEN NEW.state = 'completed' AND NEW.listing_id IS NOT NULL THEN 'Etsy''de yayınlandı (ID: ' || NEW.listing_id || ')'
    WHEN NEW.state = 'failed' THEN COALESCE('Hata: ' || NEW.error_message, 'Bilinmeyen hata oluştu')
    ELSE 'Durum belirsiz'
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı tabloya bağla
DROP TRIGGER IF EXISTS tr_update_turkish_columns ON etsy_uploads;
CREATE TRIGGER tr_update_turkish_columns
  BEFORE INSERT OR UPDATE ON etsy_uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_turkish_columns();

-- View oluştur - Türkçe kuyruk görünümü
CREATE OR REPLACE VIEW kuyruk_durumu AS
SELECT 
  durum_tr as "Durum",
  baslik_tr as "Ürün Başlığı", 
  olusturma_tarihi_tr as "Eklenme Tarihi",
  islem_tarihi_tr as "İşlem Tarihi",
  aciklama_tr as "Açıklama",
  listing_id as "Etsy ID",
  id as "Sistem ID"
FROM etsy_uploads 
ORDER BY created_at DESC;

COMMENT ON VIEW kuyruk_durumu IS 'Etsy kuyruk durumunun Türkçe görünümü'; 