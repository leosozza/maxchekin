-- Criar bucket público para APKs
INSERT INTO storage.buckets (id, name, public)
VALUES ('apk-files', 'apk-files', true);

-- Tabela para gerenciar informações do APK
CREATE TABLE apk_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  version_name TEXT,
  version_code INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apenas um APK ativo por vez
CREATE UNIQUE INDEX idx_active_apk ON apk_config(is_active) WHERE is_active = true;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_apk_config_updated_at
  BEFORE UPDATE ON apk_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE apk_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Leitura pública do APK ativo
CREATE POLICY "Qualquer pessoa pode ver APK ativo"
  ON apk_config FOR SELECT
  USING (is_active = true);

-- Apenas admins podem gerenciar APKs
CREATE POLICY "Apenas admins podem gerenciar APKs"
  ON apk_config FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Policy para upload (apenas admins)
CREATE POLICY "Admins podem fazer upload de APKs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'apk-files' AND
    has_role(auth.uid(), 'admin')
  );

-- Policy para leitura pública
CREATE POLICY "Qualquer pessoa pode baixar APKs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'apk-files');

-- Policy para deletar (apenas admins)
CREATE POLICY "Admins podem deletar APKs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'apk-files' AND
    has_role(auth.uid(), 'admin')
  );