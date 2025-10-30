-- Add SOURCE_ID field to lead_creation_config
INSERT INTO public.lead_creation_config (field_name, field_value, field_type, description, is_active)
VALUES 
  ('SOURCE_ID', 'UC_SJ3VW5', 'text', 'Campo Fonte - ID da origem do lead', true)
ON CONFLICT (field_name) DO UPDATE 
  SET field_value = 'UC_SJ3VW5',
      description = 'Campo Fonte - ID da origem do lead',
      is_active = true;
