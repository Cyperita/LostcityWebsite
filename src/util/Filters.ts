import { toDbDate } from '#/db/query.js';
import { SelectQueryBuilder } from 'kysely';

export function extractFilters(query: Record<string, any>, keys: string[]): Record<string, string> {
    return keys.reduce((acc, key) => {
        if (query[key]) acc[key] = query[key];
        return acc;
    }, {} as Record<string, string>);
}

// Could probably combine this into 1 function and just pass an array of expected columns, but oh well
export function applyChatFilters<DB>(
    query: SelectQueryBuilder<DB, keyof DB, any>,
    filters: Record<string, string>,
    defaultSort: string = 'timestamp',
    defaultOrder: 'asc' | 'desc' = 'desc'
) {
    if (filters.start) query = query.where('timestamp' as any, '>=', toDbDate(filters.start));
    if (filters.end) query = query.where('timestamp' as any, '>=', toDbDate(filters.end));
    if (filters.world) query = query.where('world' as any, '=', filters.world);
    if (filters.message) query = query.where('message' as any, 'like', `%${filters.message}%`);

    const sortField = filters.sort ?? defaultSort;
    const sortOrder = filters.order === 'asc' || filters.order === 'desc' ? filters.order : defaultOrder;

    query = query.orderBy(sortField, sortOrder);
    return query;
}

export function applyReportFilters<DB>(
    query: SelectQueryBuilder<DB, keyof DB, any>,
    filters: Record<string, string>,
    defaultSort: string = 'timestamp',
    defaultOrder: 'asc' | 'desc' = 'desc'
) {
    if (filters.start) query = query.where('timestamp' as any, '>=', toDbDate(filters.start));
    if (filters.end) query = query.where('timestamp' as any, '<=', toDbDate(filters.end));
    if (filters.reason) query = query.where('reason' as any, '=', filters.reason);
    if (filters.username) query = query.where('account.username' as any, '=', filters.username);
    if (filters.offender) query = query.where('offender' as any, '=', filters.offender);

    const sortField = filters.sort ?? defaultSort;
    const sortOrder = filters.order === 'asc' || filters.order === 'desc' ? filters.order : defaultOrder;

    query = query.orderBy(sortField, sortOrder);
    return query;
}