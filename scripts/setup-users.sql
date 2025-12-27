-- ============================================
-- Admin Users Setup Script for Exam Admin Portal
-- ============================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- 
-- This script creates 4 admin users with different roles:
-- 1. Super Admin - Full access
-- 2. District In-Charge - District-level access
-- 3. Mandal In-Charge - Mandal-level access  
-- 4. Centre In-Charge - Centre-level access
-- ============================================

-- Step 1: Ensure the users table has the required columns
-- (Run this first if columns are missing)

DO $$ 
BEGIN
  -- Add role column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE public.users ADD COLUMN role TEXT DEFAULT 'CENTRE_IN_CHARGE';
  END IF;
  
  -- Add geographic scope columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'district_id') THEN
    ALTER TABLE public.users ADD COLUMN district_id UUID REFERENCES districts(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'mandal_id') THEN
    ALTER TABLE public.users ADD COLUMN mandal_id UUID REFERENCES mandals(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'centre_id') THEN
    ALTER TABLE public.users ADD COLUMN centre_id UUID REFERENCES exam_centres(id);
  END IF;
END $$;

-- Step 2: Create auth users using Supabase Auth API
-- NOTE: You need to create these via the Dashboard (Authentication → Users → Add User)
-- Or use the Supabase Admin API with a service key
-- 
-- Create these users with password: Admin@123
-- - admin@pramaan.gov.in
-- - district@pramaan.gov.in
-- - mandal@pramaan.gov.in
-- - centre@pramaan.gov.in

-- Step 3: After creating auth users, run this to set up their profiles
-- This will match auth users by email and create/update their public profiles

INSERT INTO public.users (id, name, email, role, is_active, created_at)
SELECT 
  au.id,
  CASE 
    WHEN au.email = 'admin@pramaan.gov.in' THEN 'Super Administrator'
    WHEN au.email = 'district@pramaan.gov.in' THEN 'District Officer'
    WHEN au.email = 'mandal@pramaan.gov.in' THEN 'Mandal Officer'
    WHEN au.email = 'centre@pramaan.gov.in' THEN 'Centre Supervisor'
    ELSE 'Unknown User'
  END as name,
  au.email,
  CASE 
    WHEN au.email = 'admin@pramaan.gov.in' THEN 'SUPER_ADMIN'
    WHEN au.email = 'district@pramaan.gov.in' THEN 'DISTRICT_IN_CHARGE'
    WHEN au.email = 'mandal@pramaan.gov.in' THEN 'MANDAL_IN_CHARGE'
    WHEN au.email = 'centre@pramaan.gov.in' THEN 'CENTRE_IN_CHARGE'
    ELSE 'CENTRE_IN_CHARGE'
  END as role,
  true as is_active,
  NOW() as created_at
FROM auth.users au
WHERE au.email IN (
  'admin@pramaan.gov.in', 
  'district@pramaan.gov.in', 
  'mandal@pramaan.gov.in', 
  'centre@pramaan.gov.in'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_active = true;

-- Step 4: Verify the users were created
SELECT id, name, email, role, is_active, created_at 
FROM public.users 
ORDER BY 
  CASE role 
    WHEN 'SUPER_ADMIN' THEN 1
    WHEN 'DISTRICT_IN_CHARGE' THEN 2
    WHEN 'MANDAL_IN_CHARGE' THEN 3
    WHEN 'CENTRE_IN_CHARGE' THEN 4
  END;

-- ============================================
-- LOGIN CREDENTIALS:
-- ============================================
-- Super Admin:      admin@pramaan.gov.in     / Admin@123
-- District Officer: district@pramaan.gov.in  / Admin@123
-- Mandal Officer:   mandal@pramaan.gov.in    / Admin@123
-- Centre Supervisor: centre@pramaan.gov.in   / Admin@123
-- ============================================
