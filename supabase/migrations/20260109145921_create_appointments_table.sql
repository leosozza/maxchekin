-- Create appointments table for scheduled appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  bitrix_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  scheduled_datetime TIMESTAMP WITH TIME ZONE GENERATED ALWAYS AS (
    (scheduled_date + scheduled_time)::timestamp with time zone
  ) STORED,
  telemarketing_name TEXT,
  source TEXT CHECK (source IN ('Scouter', 'Meta')),
  scouter_name TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'checked_in', 'cancelled')),
  checked_in_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for efficient querying by date
CREATE INDEX idx_appointments_scheduled_date ON public.appointments(scheduled_date);
CREATE INDEX idx_appointments_scheduled_datetime ON public.appointments(scheduled_datetime);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_bitrix_id ON public.appointments(bitrix_id);

-- Enable Row Level Security
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view appointments
CREATE POLICY "Authenticated users can view appointments"
ON public.appointments FOR SELECT
USING (auth.role() = 'authenticated');

-- Authenticated users can insert appointments (for webhook)
CREATE POLICY "Authenticated users can create appointments"
ON public.appointments FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update appointments (for check-in)
CREATE POLICY "Authenticated users can update appointments"
ON public.appointments FOR UPDATE
USING (auth.role() = 'authenticated');

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE public.appointments IS 'Stores scheduled appointments received via webhook from Bitrix24';
