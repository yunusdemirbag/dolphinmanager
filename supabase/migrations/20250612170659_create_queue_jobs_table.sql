-- Queue Jobs tablosu oluştur
CREATE TABLE IF NOT EXISTS queue_jobs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  data JSONB,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- İndeksler ekle
CREATE INDEX IF NOT EXISTS queue_jobs_user_id_idx ON queue_jobs(user_id);
CREATE INDEX IF NOT EXISTS queue_jobs_status_idx ON queue_jobs(status);
CREATE INDEX IF NOT EXISTS queue_jobs_created_at_idx ON queue_jobs(created_at);

-- RLS politikaları
ALTER TABLE queue_jobs ENABLE ROW LEVEL SECURITY;

-- Her kullanıcı kendi işlerini görebilir ve değiştirebilir
CREATE POLICY "Users can view their own jobs"
  ON queue_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs"
  ON queue_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs"
  ON queue_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs"
  ON queue_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Admin için politikalar
CREATE POLICY "Service role can do anything"
  ON queue_jobs
  USING (auth.role() = 'service_role');
