CREATE TABLE IF NOT EXISTS public.dp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  template_image_url TEXT NOT NULL,
  
  -- The core dimensions of the organizer's canvas when the template was configured
  canvas_width INTEGER NOT NULL DEFAULT 500,
  canvas_height INTEGER NOT NULL DEFAULT 500,
  
  -- Coordinates & Size for the Attendee Image Placeholder
  image_x FLOAT NOT NULL DEFAULT 150,
  image_y FLOAT NOT NULL DEFAULT 100,
  image_width FLOAT NOT NULL DEFAULT 200,
  image_height FLOAT NOT NULL DEFAULT 200,
  image_rounded BOOLEAN DEFAULT true,
  
  -- Coordinates & Styling for the Attendee Name Placeholder
  name_x FLOAT NOT NULL DEFAULT 150,
  name_y FLOAT NOT NULL DEFAULT 320,
  name_color TEXT NOT NULL DEFAULT '#000000',
  name_font_size FLOAT NOT NULL DEFAULT 28,
  name_font_weight TEXT NOT NULL DEFAULT 'bold',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id)
);

-- RLS setup
ALTER TABLE public.dp_templates ENABLE ROW LEVEL SECURITY;

-- Organizers can select their templates, attendees can view it too (needs public access for the tool)
CREATE POLICY "DP templates are fully visible to everyone" 
ON public.dp_templates FOR SELECT 
USING (true);

-- Organizers can insert their templates
CREATE POLICY "Organizers can insert DP templates" 
ON public.dp_templates FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = event_id 
    AND events.organiser_id = auth.uid()
  )
);

-- Organizers can update their templates
CREATE POLICY "Organizers can update DP templates" 
ON public.dp_templates FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = event_id 
    AND events.organiser_id = auth.uid()
  )
);

-- Organizers can delete their templates
CREATE POLICY "Organizers can delete DP templates" 
ON public.dp_templates FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = event_id 
    AND events.organiser_id = auth.uid()
  )
);
