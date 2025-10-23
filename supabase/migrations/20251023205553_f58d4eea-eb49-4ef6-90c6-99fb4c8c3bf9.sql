-- Create theme preferences table
CREATE TABLE IF NOT EXISTS public.theme_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_mode TEXT NOT NULL CHECK (theme_mode IN ('light', 'dark', 'blue-pink')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.theme_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own theme preferences"
ON public.theme_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own theme preferences"
ON public.theme_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own theme preferences"
ON public.theme_preferences
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own theme preferences"
ON public.theme_preferences
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_theme_preferences_updated_at
BEFORE UPDATE ON public.theme_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();