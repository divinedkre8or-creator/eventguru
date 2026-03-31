-- Add new columns to dp_templates if they do not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dp_templates' AND column_name = 'name_font_family') THEN
        ALTER TABLE public.dp_templates ADD COLUMN name_font_family TEXT NOT NULL DEFAULT 'sans-serif';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dp_templates' AND column_name = 'name_text_align') THEN
        ALTER TABLE public.dp_templates ADD COLUMN name_text_align TEXT NOT NULL DEFAULT 'left';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dp_templates' AND column_name = 'name_width') THEN
        ALTER TABLE public.dp_templates ADD COLUMN name_width FLOAT NOT NULL DEFAULT 300;
    END IF;
END $$;
