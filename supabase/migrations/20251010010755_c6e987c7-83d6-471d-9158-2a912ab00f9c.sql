-- Create app_role enum for user roles
CREATE TYPE app_role AS ENUM ('admin', 'operator', 'viewer');

-- Create user_roles table
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create webhook_config table
CREATE TABLE webhook_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID REFERENCES panels(id) ON DELETE CASCADE,
  bitrix_webhook_url TEXT NOT NULL,
  auth_token TEXT,
  notify_on_checkin BOOLEAN DEFAULT true,
  notify_on_call BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE webhook_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view webhook configs"
ON webhook_config
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage webhook configs"
ON webhook_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create field_mapping table
CREATE TABLE field_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bitrix_field_name TEXT NOT NULL,
  maxcheckin_field_name TEXT NOT NULL,
  field_type TEXT NOT NULL,
  transform_function TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE field_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view field mappings"
ON field_mapping
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage field mappings"
ON field_mapping
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create activity_logs table
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  user_id UUID REFERENCES auth.users(id),
  panel_id UUID REFERENCES panels(id),
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_logs_event_type ON activity_logs(event_type);
CREATE INDEX idx_logs_severity ON activity_logs(severity);
CREATE INDEX idx_logs_created_at ON activity_logs(created_at DESC);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view activity logs"
ON activity_logs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can insert activity logs"
ON activity_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can manage activity logs"
ON activity_logs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update panels RLS policies
DROP POLICY IF EXISTS "Anyone can view active panels" ON panels;

CREATE POLICY "Anyone can view active panels"
ON panels
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage panels"
ON panels
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Operators can update panels"
ON panels
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'operator'))
WITH CHECK (public.has_role(auth.uid(), 'operator'));

-- Update media RLS policies
DROP POLICY IF EXISTS "Anyone can view active media" ON media;

CREATE POLICY "Anyone can view active media"
ON media
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins and operators can manage media"
ON media
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'operator')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'operator')
);

-- Create trigger for webhook_config updated_at
CREATE TRIGGER update_webhook_config_updated_at
BEFORE UPDATE ON webhook_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();