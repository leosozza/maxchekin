-- Função que adiciona permissões padrão quando um novo operador é criado
CREATE OR REPLACE FUNCTION public.add_default_operator_permissions()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se o novo usuário é operador, dar permissão básica de check-in
  IF NEW.role = 'operator' THEN
    INSERT INTO public.user_permissions (user_id, resource_type, resource_id)
    VALUES (NEW.user_id, 'checkin', NULL)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para adicionar permissões padrão
DROP TRIGGER IF EXISTS on_operator_created ON public.user_roles;
CREATE TRIGGER on_operator_created
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.add_default_operator_permissions();