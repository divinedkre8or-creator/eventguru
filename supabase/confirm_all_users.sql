-- ====================================================================
-- INSTANT EMAIL CONFIRMATION SCRIPT FOR SUPABASE
-- Run this in your Supabase SQL Editor if users cannot log in due to unconfirmed email:
-- https://supabase.com/dashboard/project/edpnvsakkudorleqqhxv/sql/new
-- ====================================================================

-- 1. Auto-confirm all unconfirmed users created so far
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 2. Verify registered users and assigned roles
SELECT 
    u.id, 
    u.email, 
    u.email_confirmed_at, 
    p.full_name, 
    r.role
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
LEFT JOIN public.user_roles r ON r.user_id = u.id
ORDER BY u.created_at DESC;
