-- Função para criar role automaticamente quando usuário se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se for o email do admin, criar como admin
  IF NEW.email = 'leonardo.zogbi@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role);
  ELSE
    -- Outros usuários recebem role de operator
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'operator'::app_role);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger que executa a função quando um novo usuário é criado
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Adicionar role de operator para usuários que não têm role
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'operator'::app_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL
  AND u.email != 'leonardo.zogbi@gmail.com';

-- Garantir que leonardo.zogbi@gmail.com tenha role de admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'leonardo.zogbi@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;