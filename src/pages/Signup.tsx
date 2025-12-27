/**
 * ⚠️ TEMPORARY SIGNUP PAGE - FOR TESTING ONLY
 * 
 * This page allows users to self-register and choose their role.
 * DELETE THIS FILE before production deployment!
 * 
 * To remove:
 * 1. Delete this file (src/pages/Signup.tsx)
 * 2. Remove the route from src/App.tsx
 * 3. Remove the signup link from src/pages/Login.tsx
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';

const ROLE_OPTIONS = [
    { value: 'SUPER_ADMIN', label: 'Super Admin (Full Access)' },
    { value: 'DISTRICT_IN_CHARGE', label: 'District In-Charge' },
    { value: 'MANDAL_IN_CHARGE', label: 'Mandal In-Charge' },
    { value: 'CENTRE_IN_CHARGE', label: 'Centre In-Charge' },
];

export function Signup() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'SUPER_ADMIN',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            // Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        name: formData.name,
                    },
                },
            });

            if (authError) {
                setError(authError.message);
                setIsLoading(false);
                return;
            }

            if (!authData.user) {
                setError('Failed to create user');
                setIsLoading(false);
                return;
            }

            // Create user profile in public.users table
            const { error: profileError } = await supabase
                .from('users')
                .insert({
                    id: authData.user.id,
                    name: formData.name,
                    email: formData.email,
                    role: formData.role,
                    is_active: true,
                });

            if (profileError) {
                console.error('Profile creation error:', profileError);
                // User was created in auth but profile failed
                // They can still login and we can fix the profile later
            }

            setIsSuccess(true);

            // Auto redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-50 to-surface-100 dark:from-surface-900 dark:to-surface-950 p-4">
                <Card padding="lg" className="w-full max-w-md text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-2">
                        Account Created!
                    </h1>
                    <p className="text-surface-600 dark:text-surface-400 mb-6">
                        Your account has been created successfully.
                        Redirecting you to login...
                    </p>
                    <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-50 to-surface-100 dark:from-surface-900 dark:to-surface-950 p-4">
            {/* Warning Banner */}
            <div className="fixed top-0 left-0 right-0 bg-amber-500 text-amber-950 text-center py-2 text-sm font-medium z-50">
                ⚠️ TEMPORARY SIGNUP PAGE - For Testing Only - Delete Before Production
            </div>

            <Card padding="lg" className="w-full max-w-md mt-8">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/25">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
                        Create Account
                    </h1>
                    <p className="text-surface-500 dark:text-surface-400 mt-1 text-sm">
                        Testing mode - Select any role
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                )}

                {/* Signup Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Full Name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John Doe"
                        leftIcon={<User className="w-4 h-4" />}
                        required
                    />

                    <Input
                        label="Email Address"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        leftIcon={<Mail className="w-4 h-4" />}
                        required
                    />

                    <Input
                        label="Password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        leftIcon={<Lock className="w-4 h-4" />}
                        helperText="Minimum 6 characters"
                        required
                    />

                    <Input
                        label="Confirm Password"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        leftIcon={<Lock className="w-4 h-4" />}
                        required
                    />

                    <Select
                        label="Role (For Testing)"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        options={ROLE_OPTIONS}
                    />

                    <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        isLoading={isLoading}
                    >
                        Create Account
                    </Button>
                </form>

                {/* Login Link */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-surface-600 dark:text-surface-400">
                        Already have an account?{' '}
                        <Link
                            to="/login"
                            className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                        >
                            Sign In
                        </Link>
                    </p>
                </div>
            </Card>
        </div>
    );
}
