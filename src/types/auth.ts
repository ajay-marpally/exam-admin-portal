// User roles for the admin dashboard
export type UserRole =
    | 'SUPER_ADMIN'
    | 'DISTRICT_IN_CHARGE'
    | 'MANDAL_IN_CHARGE'
    | 'CENTRE_IN_CHARGE';

// Geographic scope for role-based filtering
export interface GeographicScope {
    stateId?: string;
    districtId?: string;
    mandalId?: string;
    centreId?: string;
}

// User interface matching the users table
export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    is_active: boolean;
    created_at: string;
    // Extended fields for geographic scoping
    district_id?: string;
    mandal_id?: string;
    centre_id?: string;
}

// Auth context state
export interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    scope: GeographicScope;
}

// Login credentials
export interface LoginCredentials {
    email: string;
    password: string;
}

// Role permissions
export interface RolePermissions {
    canCreateExams: boolean;
    canEditExams: boolean;
    canDeleteExams: boolean;
    canCreateUsers: boolean;
    canViewAllDistricts: boolean;
    canViewAllMandals: boolean;
    canViewAllCentres: boolean;
    canExportReports: boolean;
    canLockEvidence: boolean;
    canTerminateAttempts: boolean;
    canEscalate: boolean;
    canAcknowledge: boolean;
}

// Get permissions based on role
export function getRolePermissions(role: UserRole): RolePermissions {
    switch (role) {
        case 'SUPER_ADMIN':
            return {
                canCreateExams: true,
                canEditExams: true,
                canDeleteExams: true,
                canCreateUsers: true,
                canViewAllDistricts: true,
                canViewAllMandals: true,
                canViewAllCentres: true,
                canExportReports: true,
                canLockEvidence: true,
                canTerminateAttempts: true,
                canEscalate: true,
                canAcknowledge: true,
            };
        case 'DISTRICT_IN_CHARGE':
            return {
                canCreateExams: false,
                canEditExams: false,
                canDeleteExams: false,
                canCreateUsers: false,
                canViewAllDistricts: false,
                canViewAllMandals: true,
                canViewAllCentres: true,
                canExportReports: true,
                canLockEvidence: false,
                canTerminateAttempts: false,
                canEscalate: true,
                canAcknowledge: true,
            };
        case 'MANDAL_IN_CHARGE':
            return {
                canCreateExams: false,
                canEditExams: false,
                canDeleteExams: false,
                canCreateUsers: false,
                canViewAllDistricts: false,
                canViewAllMandals: false,
                canViewAllCentres: true,
                canExportReports: false,
                canLockEvidence: false,
                canTerminateAttempts: false,
                canEscalate: false,
                canAcknowledge: true,
            };
        case 'CENTRE_IN_CHARGE':
            return {
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
                canAcknowledge: true,
            };
    }
}
