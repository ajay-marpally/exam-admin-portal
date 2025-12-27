import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, GeographicScope } from '../types/auth';

interface ScopeFilter {
    districtId?: string;
    mandalId?: string;
    centreId?: string;
}

interface UseRoleScopeResult {
    scope: GeographicScope;
    role: UserRole | null;
    buildFilter: (baseFilter?: ScopeFilter) => ScopeFilter;
    canViewDistrict: (districtId: string) => boolean;
    canViewMandal: (mandalId: string) => boolean;
    canViewCentre: (centreId: string) => boolean;
    isSuperAdmin: boolean;
    isDistrictLevel: boolean;
    isMandalLevel: boolean;
    isCentreLevel: boolean;
}

export function useRoleScope(): UseRoleScopeResult {
    const { user, scope } = useAuth();

    const result = useMemo(() => {
        const role = user?.role || null;
        const isSuperAdmin = role === 'SUPER_ADMIN';
        const isDistrictLevel = role === 'DISTRICT_IN_CHARGE';
        const isMandalLevel = role === 'MANDAL_IN_CHARGE';
        const isCentreLevel = role === 'CENTRE_IN_CHARGE';

        // Build filter based on role scope
        const buildFilter = (baseFilter?: ScopeFilter): ScopeFilter => {
            if (isSuperAdmin) {
                return baseFilter || {};
            }

            const filter: ScopeFilter = { ...baseFilter };

            if (isDistrictLevel && scope.districtId) {
                filter.districtId = scope.districtId;
            } else if (isMandalLevel && scope.mandalId) {
                filter.mandalId = scope.mandalId;
            } else if (isCentreLevel && scope.centreId) {
                filter.centreId = scope.centreId;
            }

            return filter;
        };

        // Check if user can view specific district
        const canViewDistrict = (districtId: string): boolean => {
            if (isSuperAdmin) return true;
            if (isDistrictLevel) return scope.districtId === districtId;
            return false;
        };

        // Check if user can view specific mandal
        const canViewMandal = (mandalId: string): boolean => {
            if (isSuperAdmin) return true;
            if (isDistrictLevel) {
                // Would need to check if mandal belongs to user's district
                // This would require additional data fetching
                return true; // For now, allow if district level
            }
            if (isMandalLevel) return scope.mandalId === mandalId;
            return false;
        };

        // Check if user can view specific centre
        const canViewCentre = (centreId: string): boolean => {
            if (isSuperAdmin) return true;
            if (isDistrictLevel || isMandalLevel) return true; // Simplified for now
            if (isCentreLevel) return scope.centreId === centreId;
            return false;
        };

        return {
            scope,
            role,
            buildFilter,
            canViewDistrict,
            canViewMandal,
            canViewCentre,
            isSuperAdmin,
            isDistrictLevel,
            isMandalLevel,
            isCentreLevel,
        };
    }, [user, scope]);

    return result;
}

// Hook for building Supabase query filters
export function useScopedQuery() {
    const { scope, role } = useRoleScope();

    const applyScope = useMemo(() => {
        return <T extends { eq: (column: string, value: string) => T }>(
            query: T,
            options?: {
                districtColumn?: string;
                mandalColumn?: string;
                centreColumn?: string;
            }
        ): T => {
            const {
                districtColumn = 'district_id',
                mandalColumn = 'mandal_id',
                centreColumn = 'centre_id',
            } = options || {};

            if (role === 'SUPER_ADMIN') {
                return query;
            }

            if (role === 'DISTRICT_IN_CHARGE' && scope.districtId) {
                return query.eq(districtColumn, scope.districtId);
            }

            if (role === 'MANDAL_IN_CHARGE' && scope.mandalId) {
                return query.eq(mandalColumn, scope.mandalId);
            }

            if (role === 'CENTRE_IN_CHARGE' && scope.centreId) {
                return query.eq(centreColumn, scope.centreId);
            }

            return query;
        };
    }, [scope, role]);

    return { applyScope };
}
