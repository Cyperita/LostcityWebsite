import { toDbDate } from '#/db/query.js';
import { SelectQueryBuilder } from 'kysely';

export function extractFilters(query: Record<string, any>, keys: string[]): Record<string, string> {
    return keys.reduce((acc, key) => {
        if (query[key]) acc[key] = query[key];
        return acc;
    }, {} as Record<string, string>);
}

export function applyFilters<DB>(
    query: SelectQueryBuilder<DB, keyof DB, any>,
    filters: Record<string, string>
) {
    if (filters.start) query = query.where('timestamp' as any, '>=', toDbDate(filters.start));
    if (filters.end) query = query.where('timestamp' as any, '<=', toDbDate(filters.end));
    if (filters.reason) query = query.where('reason' as any, '=', filters.reason);
    if (filters.username) query = query.where('account.username' as any, '=', filters.username);
    if (filters.offender) query = query.where('offender' as any, '=', filters.offender);

    return query;
}