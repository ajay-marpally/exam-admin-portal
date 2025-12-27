import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { type User, type UserRole, type GeographicScope, type AuthState, getRolePermissions, type RolePermissions } from '../types/auth';
import { logAuditEvent, AuditActions } from '../services/auditService';

interface AuthContextValue extends AuthState {
    login: (email: string, password: string) => Promise<{ error: string | null }>;
    logout: () => Promise<void>;
    permissions: RolePermissions;
}

const defaultPermissions: RolePermissions = {
    canCreateExams: false,
    canEditExams: false,
    canDeleteExams: false,
    canCreateUsers: false,
    canViewAllDistricts: false,
    canViewAllMandals: false,
    canViewAllCentres: false,
    canExportReports: false,
    canLockEvidence: false,
    canTerminateAttempts: false,
    canEscalate: false,
    canAcknowledge: false,
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        isLoading: true,
        isAuthenticated: false,
        scope: {},
    });

    const [permissions, setPermissions] = useState<RolePermissions>(defaultPermissions);

    // Fetch user profile and resolve scope
    const fetchUserProfile = useCallback(async (userId: string): Promise<User | null> => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !data) {
            console.error('Error fetching user profile:', error);
            return null;
        }

        // Map the database role to our UserRole type
        const roleMapping: Record<string, UserRole> = {
            'ADMIN': 'SUPER_ADMIN',
            'SUPER_ADMIN': 'SUPER_ADMIN',
            'DISTRICT_IN_CHARGE': 'DISTRICT_IN_CHARGE',
            'MANDAL_IN_CHARGE': 'MANDAL_IN_CHARGE',
            'CENTRE_IN_CHARGE': 'CENTRE_IN_CHARGE',
            'INVIGILATOR': 'CENTRE_IN_CHARGE', // Map INVIGILATOR to CENTRE_IN_CHARGE
        };

        return {
            ...data,
            role: roleMapping[data.role] || 'CENTRE_IN_CHARGE',
        };
    }, []);

    // Initialize auth state
    useEffect(() => {
        let isMounted = true;

        const initAuth = async () => {
            try {
                // Add timeout to prevent infinite hanging
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Auth timeout')), 10000)
                );

                const sessionPromise = supabase.auth.getSession();
                const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;

                if (!isMounted) return;

                if (session?.user) {
                    try {
                        const profile = await fetchUserProfile(session.user.id);
                        if (!isMounted) return;

                        if (profile) {
                            const scope: GeographicScope = {
                                districtId: profile.district_id,
                                mandalId: profile.mandal_id,
                                centreId: profile.centre_id,
                            };

                            setState({
                                user: profile,
                                isLoading: false,
                                isAuthenticated: true,
                                scope,
                            });
                            setPermissions(getRolePermissions(profile.role));
                            return;
                        }
                    } catch (profileError) {
                        console.error('Error fetching profile:', profileError);
                    }
                }

                // No session or profile fetch failed
                if (isMounted) {
                    setState({
                        user: null,
                        isLoading: false,
                        isAuthenticated: false,
                        scope: {},
                    });
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
                // Always set loading to false on error
                if (isMounted) {
                    setState({
                        user: null,
                        isLoading: false,
                        isAuthenticated: false,
                        scope: {},
                    });
                }
            }
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;

            if (event === 'SIGNED_IN' && session?.user) {
                try {
                    const profile = await fetchUserProfile(session.user.id);
                    if (profile && isMounted) {
                        const scope: GeographicScope = {
                            districtId: profile.district_id,
                            mandalId: profile.mandal_id,
                            centreId: profile.centre_id,
                        };

                        setState({
                            user: profile,
                            isLoading: false,
                            isAuthenticated: true,
                            scope,
                        });
                        setPermissions(getRolePermissions(profile.role));
                    }
                } catch (error) {
                    console.error('Error in auth state change:', error);
                }
            } else if (event === 'SIGNED_OUT') {
                setState({
                    user: null,
                    isLoading: false,
                    isAuthenticated: false,
                    scope: {},
                });
                setPermissions(defaultPermissions);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [fetchUserProfile]);

    const login = async (email: string, password: string): Promise<{ error: string | null }> => {
        setState(prev => ({ ...prev, isLoading: true }));

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            await logAuditEvent(null, {
                action: AuditActions.LOGIN_FAILED,
                entity: 'user',
                evidence: { email, error: error.message },
            });
            setState(prev => ({ ...prev, isLoading: false }));
            return { error: error.message };
        }

        if (data.user) {
            const profile = await fetchUserProfile(data.user.id);
            if (profile) {
                await logAuditEvent(profile.id, {
                    action: AuditActions.LOGIN,
                    entity: 'user',
                    entity_id: profile.id,
                    evidence: { email, role: profile.role },
                });

                const scope: GeographicScope = {
                    districtId: profile.district_id,
                    mandalId: profile.mandal_id,
                    centreId: profile.centre_id,
                };

                setState({
                    user: profile,
                    isLoading: false,
                    isAuthenticated: true,
                    scope,
                });
                setPermissions(getRolePermissions(profile.role));
                return { error: null };
            }
        }

        setState(prev => ({ ...prev, isLoading: false }));
        return { error: 'Failed to fetch user profile' };
    };

    const logout = async () => {
        if (state.user) {
            await logAuditEvent(state.user.id, {
                action: AuditActions.LOGOUT,
                entity: 'user',
                entity_id: state.user.id,
            });
        }
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ ...state, login, logout, permissions }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
