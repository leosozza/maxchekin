-- Permitir acesso público às configurações necessárias para check-in
-- Isso é seguro pois são apenas leituras de configuração

-- Webhook config: permitir leitura pública (necessário para check-in funcionar)
DROP POLICY IF EXISTS "Anyone can view webhook configs" ON webhook_config;
DROP POLICY IF EXISTS "Public can view active webhook configs" ON webhook_config;

CREATE POLICY "Public can view active webhook configs"
ON webhook_config FOR SELECT
USING (is_active = true);

-- Check-in config: permitir leitura pública
DROP POLICY IF EXISTS "Anyone can view check-in config" ON check_in_config;
DROP POLICY IF EXISTS "Public can view check-in config" ON check_in_config;

CREATE POLICY "Public can view check-in config"
ON check_in_config FOR SELECT
USING (true);

-- Field mapping: permitir leitura pública (necessário para mapear campos do Bitrix)
DROP POLICY IF EXISTS "Anyone can view field mappings" ON field_mapping;
DROP POLICY IF EXISTS "Public can view active field mappings" ON field_mapping;

CREATE POLICY "Public can view active field mappings"
ON field_mapping FOR SELECT
USING (is_active = true);

-- Custom fields: permitir leitura pública dos campos ativos
DROP POLICY IF EXISTS "Anyone can view custom fields" ON custom_fields;
DROP POLICY IF EXISTS "Public can view active custom fields" ON custom_fields;

CREATE POLICY "Public can view active custom fields"
ON custom_fields FOR SELECT
USING (is_active = true);