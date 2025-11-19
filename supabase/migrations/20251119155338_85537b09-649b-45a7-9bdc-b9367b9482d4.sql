-- Remover trigger e função do Kanban que causam erro no check-in
DROP TRIGGER IF EXISTS trigger_kanban_card_on_checkin ON public.check_ins;
DROP FUNCTION IF EXISTS public.fn_kanban_add_card_on_checkin();