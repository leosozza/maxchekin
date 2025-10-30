-- Update default values for lead creation fields according to requirements
-- SOURCE_ID should be 'CALL', PARENT_ID_1120 should be 4, UF_CRM_1741215746 should be 4

UPDATE public.lead_creation_config
SET field_value = 'CALL',
    description = 'Campo Fonte - ID da origem do lead (padrão: CALL)'
WHERE field_name = 'SOURCE_ID';

UPDATE public.lead_creation_config
SET field_value = '4',
    description = 'Projetos Comerciais - ID do projeto pai (padrão: 4)'
WHERE field_name = 'PARENT_ID_1120';

UPDATE public.lead_creation_config
SET field_value = '4',
    description = 'Campo customizado - Projeto relacionado (padrão: 4)'
WHERE field_name = 'UF_CRM_1741215746';

-- Ensure these fields exist with proper descriptions
INSERT INTO public.lead_creation_config (field_name, field_value, field_type, description, is_active)
VALUES 
  ('SOURCE_ID', 'CALL', 'text', 'Campo Fonte - ID da origem do lead (padrão: CALL)', true),
  ('PARENT_ID_1120', '4', 'text', 'Projetos Comerciais - ID do projeto pai (padrão: 4)', true),
  ('UF_CRM_1741215746', '4', 'text', 'Campo customizado - Projeto relacionado (padrão: 4)', true)
ON CONFLICT (field_name) DO UPDATE
  SET field_value = EXCLUDED.field_value,
      description = EXCLUDED.description,
      is_active = true;
