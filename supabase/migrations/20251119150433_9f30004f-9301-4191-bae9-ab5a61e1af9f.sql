-- Remover tabelas obsoletas da simplificação da aplicação
-- ATENÇÃO: Esta migration remove várias tabelas. Certifique-se de fazer backup antes de executar.

-- Dropar tabelas relacionadas a painéis
DROP TABLE IF EXISTS panel_layouts CASCADE;
DROP TABLE IF EXISTS panel_config CASCADE;
DROP TABLE IF EXISTS calls CASCADE;
DROP TABLE IF EXISTS panels CASCADE;

-- Dropar tabelas relacionadas a webhooks (manter apenas a configuração global)
-- Nota: webhook_config tem panel_id que será NULL após panels ser dropada

-- Dropar tabelas relacionadas a mídias
DROP TABLE IF EXISTS media CASCADE;

-- Dropar tabelas relacionadas ao Kanban
DROP TABLE IF EXISTS kanban_stage_fields CASCADE;
DROP TABLE IF EXISTS kanban_stage_users CASCADE;
DROP TABLE IF EXISTS kanban_cards CASCADE;
DROP TABLE IF EXISTS kanban_events CASCADE;
DROP TABLE IF EXISTS kanban_stages CASCADE;

-- Dropar outras tabelas não utilizadas
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS apk_config CASCADE;
DROP TABLE IF EXISTS screensaver_config CASCADE;

-- Simplificar user_permissions removendo referências a recursos que não existem mais
-- Manter apenas permissões de 'admin' e 'checkin'
DELETE FROM user_permissions 
WHERE resource_type NOT IN ('checkin', 'admin');

-- Atualizar função de permissões padrão para apenas dar checkin aos operadores
CREATE OR REPLACE FUNCTION public.add_default_operator_permissions()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role = 'operator' THEN
    INSERT INTO public.user_permissions (user_id, resource_type, resource_id)
    VALUES (NEW.user_id, 'checkin', NULL)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;