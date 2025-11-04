-- Remover UNIQUE constraint de check_ins.lead_id para permitir múltiplos check-ins
-- Isso permite que o mesmo lead possa ter vários check-ins (múltiplos modelos)
ALTER TABLE public.check_ins DROP CONSTRAINT IF EXISTS check_ins_lead_id_key;