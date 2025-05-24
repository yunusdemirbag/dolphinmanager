-- Test kullanıcısı için örnek veri (sadece test için)
-- Bu verileri gerçek kullanıcı kaydı olduktan sonra silebilirsiniz

-- Örnek analytics verisi
INSERT INTO analytics (user_id, metric_type, value, date) VALUES
  ('00000000-0000-0000-0000-000000000000', 'view', 150, CURRENT_DATE - INTERVAL '1 day'),
  ('00000000-0000-0000-0000-000000000000', 'view', 200, CURRENT_DATE),
  ('00000000-0000-0000-0000-000000000000', 'revenue', 1250.50, CURRENT_DATE - INTERVAL '1 day'),
  ('00000000-0000-0000-0000-000000000000', 'revenue', 890.75, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Bu test verilerini gerçek kullanıcı ID'si ile değiştirmeyi unutmayın!
