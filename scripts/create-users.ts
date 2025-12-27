/**
 * Script to create admin users for the Exam Admin Portal
 * 
 * To run this script:
 * 1. Ensure you have the Supabase CLI installed or use the Supabase dashboard
 * 2. This creates users in both auth.users and public.users tables
 * 
 * Users to be created:
 * - Super Admin: admin@pramaan.gov.in
 * - District In-Charge: district@pramaan.gov.in
 * - Mandal In-Charge: mandal@pramaan.gov.in
 * - Centre In-Charge: centre@pramaan.gov.in
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wzifglpcybxlhbwvhpmj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''; // Need service key for admin operations

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY is required to create users.');
    console.log('\nTo create users manually via Supabase Dashboard:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to Authentication → Users → Add User');
    console.log('4. Create users with these credentials:\n');

    const users = [
        { email: 'admin@pramaan.gov.in', role: 'SUPER_ADMIN', name: 'Super Administrator' },
        { email: 'district@pramaan.gov.in', role: 'DISTRICT_IN_CHARGE', name: 'District Officer' },
        { email: 'mandal@pramaan.gov.in', role: 'MANDAL_IN_CHARGE', name: 'Mandal Officer' },
        { email: 'centre@pramaan.gov.in', role: 'CENTRE_IN_CHARGE', name: 'Centre Supervisor' },
    ];

    users.forEach(user => {
        console.log(`   Email: ${user.email}`);
        console.log(`   Password: Admin@123`);
        console.log(`   Role: ${user.role}`);
        console.log('');
    });

    console.log('5. After creating auth users, run this SQL to add them to public.users:');
    console.log(`
-- Insert users into public.users table
INSERT INTO public.users (id, name, email, role, is_active)
SELECT 
  au.id,
  CASE 
    WHEN au.email = 'admin@pramaan.gov.in' THEN 'Super Administrator'
    WHEN au.email = 'district@pramaan.gov.in' THEN 'District Officer'
    WHEN au.email = 'mandal@pramaan.gov.in' THEN 'Mandal Officer'
    WHEN au.email = 'centre@pramaan.gov.in' THEN 'Centre Supervisor'
  END as name,
  au.email,
  CASE 
    WHEN au.email = 'admin@pramaan.gov.in' THEN 'SUPER_ADMIN'
    WHEN au.email = 'district@pramaan.gov.in' THEN 'DISTRICT_IN_CHARGE'
    WHEN au.email = 'mandal@pramaan.gov.in' THEN 'MANDAL_IN_CHARGE'
    WHEN au.email = 'centre@pramaan.gov.in' THEN 'CENTRE_IN_CHARGE'
  END as role,
  true as is_active
FROM auth.users au
WHERE au.email IN ('admin@pramaan.gov.in', 'district@pramaan.gov.in', 'mandal@pramaan.gov.in', 'centre@pramaan.gov.in')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role;
`);

    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

interface UserToCreate {
    email: string;
    password: string;
    name: string;
    role: string;
    district_id?: string;
    mandal_id?: string;
    centre_id?: string;
}

const usersToCreate: UserToCreate[] = [
    {
        email: 'admin@pramaan.gov.in',
        password: 'Admin@123',
        name: 'Super Administrator',
        role: 'SUPER_ADMIN',
    },
    {
        email: 'district@pramaan.gov.in',
        password: 'Admin@123',
        name: 'District Officer',
        role: 'DISTRICT_IN_CHARGE',
        // district_id: 'uuid-of-district', // Add actual district ID when available
    },
    {
        email: 'mandal@pramaan.gov.in',
        password: 'Admin@123',
        name: 'Mandal Officer',
        role: 'MANDAL_IN_CHARGE',
        // mandal_id: 'uuid-of-mandal', // Add actual mandal ID when available
    },
    {
        email: 'centre@pramaan.gov.in',
        password: 'Admin@123',
        name: 'Centre Supervisor',
        role: 'CENTRE_IN_CHARGE',
        // centre_id: 'uuid-of-centre', // Add actual centre ID when available
    },
];

async function createUsers() {
    console.log('Creating users...\n');

    for (const userData of usersToCreate) {
        try {
            // Create auth user
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: userData.email,
                password: userData.password,
                email_confirm: true,
            });

            if (authError) {
                console.error(`❌ Failed to create auth user ${userData.email}:`, authError.message);
                continue;
            }

            console.log(`✓ Created auth user: ${userData.email}`);

            // Create public.users record
            const { error: profileError } = await supabase
                .from('users')
                .upsert({
                    id: authData.user.id,
                    name: userData.name,
                    email: userData.email,
                    role: userData.role,
                    is_active: true,
                    district_id: userData.district_id,
                    mandal_id: userData.mandal_id,
                    centre_id: userData.centre_id,
                });

            if (profileError) {
                console.error(`❌ Failed to create profile for ${userData.email}:`, profileError.message);
                continue;
            }

            console.log(`✓ Created profile for: ${userData.name} (${userData.role})\n`);
        } catch (error) {
            console.error(`❌ Error creating ${userData.email}:`, error);
        }
    }

    console.log('\n✓ User creation complete!');
    console.log('\nLogin credentials:');
    usersToCreate.forEach(user => {
        console.log(`  ${user.role}: ${user.email} / ${user.password}`);
    });
}

createUsers();
