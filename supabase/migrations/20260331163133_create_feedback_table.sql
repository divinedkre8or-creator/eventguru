-- Create feedback table
CREATE TYPE feedback_type AS ENUM ('bug', 'suggestion', 'complaint', 'support');
CREATE TYPE feedback_status AS ENUM ('pending', 'reviewed', 'resolved');

CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    type feedback_type NOT NULL,
    message TEXT NOT NULL,
    status feedback_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow authenticates users to insert feedback
CREATE POLICY "Users can insert their own feedback" 
ON public.feedback FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow admins to view all feedback
CREATE POLICY "Admins can view feedback" 
ON public.feedback FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Allow admins to update feedback status
CREATE POLICY "Admins can update feedback" 
ON public.feedback FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);
