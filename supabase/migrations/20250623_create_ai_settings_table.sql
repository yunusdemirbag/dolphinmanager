-- AI ayarları tablosunu oluştur
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model VARCHAR(50) NOT NULL DEFAULT 'gpt-4o-mini',
  temperature DECIMAL(3, 2) NOT NULL DEFAULT 0.7,
  title_prompt TEXT,
  tags_prompt TEXT,
  category_prompt TEXT,
  focus_title_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS politikaları
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi ayarlarını görebilir ve düzenleyebilir
CREATE POLICY "Users can view their own AI settings" 
  ON ai_settings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI settings" 
  ON ai_settings FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI settings" 
  ON ai_settings FOR UPDATE 
  USING (auth.uid() = user_id);

-- Güncelleme zamanını otomatik güncelleyen trigger
CREATE OR REPLACE FUNCTION update_ai_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_settings_updated_at
BEFORE UPDATE ON ai_settings
FOR EACH ROW
EXECUTE FUNCTION update_ai_settings_updated_at(); 