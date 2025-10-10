-- Create panel_layouts table
CREATE TABLE panel_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID REFERENCES panels(id) ON DELETE CASCADE NOT NULL UNIQUE,
  orientation TEXT NOT NULL DEFAULT 'landscape' CHECK (orientation IN ('portrait', 'landscape')),
  elements JSONB NOT NULL DEFAULT '{
    "modelName": {"x": 360, "y": 400, "width": 1200, "height": 150, "fontSize": 96, "fontFamily": "Inter", "fontWeight": 700, "color": "#FFD700", "textAlign": "center", "visible": true, "zIndex": 10},
    "modelPhoto": {"x": 760, "y": 100, "width": 400, "height": 400, "borderRadius": "50%", "borderWidth": 6, "borderColor": "#FFD700", "visible": true, "zIndex": 20},
    "room": {"x": 760, "y": 600, "width": 400, "height": 80, "fontSize": 48, "fontFamily": "Inter", "fontWeight": 600, "color": "#FFD700", "textAlign": "center", "visible": true, "zIndex": 10},
    "time": {"x": 50, "y": 50, "width": 300, "height": 60, "fontSize": 32, "fontFamily": "Inter", "fontWeight": 400, "color": "#FFFFFF", "visible": true, "zIndex": 5},
    "calledAt": {"x": 710, "y": 750, "width": 500, "height": 50, "fontSize": 28, "fontFamily": "Inter", "fontWeight": 400, "color": "#FFFFFF99", "textAlign": "center", "visible": true, "zIndex": 5}
  }'::jsonb,
  canvas_width INTEGER NOT NULL DEFAULT 1920,
  canvas_height INTEGER NOT NULL DEFAULT 1080,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE panel_layouts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage panel layouts"
ON panel_layouts FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view panel layouts"
ON panel_layouts FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_panel_layouts_updated_at
BEFORE UPDATE ON panel_layouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();