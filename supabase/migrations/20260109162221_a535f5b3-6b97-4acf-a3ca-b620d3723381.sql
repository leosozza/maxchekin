-- Create appointments table for scheduled leads
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  phone TEXT,
  bitrix_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT NOT NULL,
  telemarketing_name TEXT,
  source TEXT CHECK (source IS NULL OR source IN ('Scouter', 'Meta')),
  scouter_name TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'checked_in', 'no_show', 'cancelled')),
  checked_in_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Public can view appointments (for check-in screen)
CREATE POLICY "Anyone can view appointments" 
ON public.appointments 
FOR SELECT 
USING (true);

-- Anyone can insert appointments (for webhook)
CREATE POLICY "Anyone can insert appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (true);

-- Anyone can update appointments (for check-in)
CREATE POLICY "Anyone can update appointments" 
ON public.appointments 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Admins can delete
CREATE POLICY "Admins can delete appointments" 
ON public.appointments 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for common queries
CREATE INDEX idx_appointments_scheduled_date ON public.appointments(scheduled_date);
CREATE INDEX idx_appointments_bitrix_id ON public.appointments(bitrix_id);
CREATE INDEX idx_appointments_status ON public.appointments(status);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

-- Create trigger for updated_at
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();