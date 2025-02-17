import { db, toDbDate } from '#/db/query.js';
import { toSafeName } from '#/jstring/JString.js';
import { SelectQueryBuilder } from 'kysely';

export function extractFilters(query: Record<string, any>, keys: string[]): Record<string, string> {
    return keys.reduce((acc, key) => {
        if (query[key]) acc[key] = query[key];
        return acc;
    }, {} as Record<string, string>);
}

// Could probably combine this into 1 function and just pass an array of expected columns, but oh well
export function applyOverviewFilters<DB>(
    query: SelectQueryBuilder<DB, keyof DB, any>,
    filters: Record<string, string>,
    defaultSort: string = 'timestamp',
    defaultOrder: 'asc' | 'desc' = 'desc'
) {
    if (filters.start) query = query.where('timestamp' as any, '>=', toDbDate(filters.start));
    if (filters.end) query = query.where('timestamp' as any, '<=', toDbDate(filters.end));
    if (filters.world) query = query.where('world' as any, '=', parseInt(filters.world) + 9);
    if (filters.message) query = query.where('message' as any, 'like', `%${filters.message}%`);
    if (filters.ip) query = query.where('ip' as any, '=', filters.ip);
    if (filters.uid) query = query.where('uid' as any, '=', filters.uid);

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
    if (filters.username) query = query.where('account.username' as any, '=', toSafeName(filters.username));
    if (filters.offender) query = query.where('offender' as any, '=', toSafeName(filters.offender));

    const sortField = filters.sort ?? defaultSort;
    const sortOrder = filters.order === 'asc' || filters.order === 'desc' ? filters.order : defaultOrder;

    query = query.orderBy(sortField, sortOrder);
    return query;
}

export function applyUserFilters<DB>(
    query: SelectQueryBuilder<DB, keyof DB, any>,
    filters: Record<string, string>,
    defaultSort: string = 'registration_date',
    defaultOrder: 'asc' | 'desc' = 'desc'
) {
    if (filters.start) query = query.where('registration_date' as any, '>=', toDbDate(filters.start));
    if (filters.end) query = query.where('registration_date' as any, '<=', toDbDate(filters.end));
    if (filters.username) query = query.where('account.username' as any, 'like', `%${toSafeName(filters.username)}%`);

    // TODO: Change the select to use more appropriate values
    if (filters.active === '0') {
        query = query.where('account.logged_in' as any, '!=', 0);
    } else if (filters.active === '1') {
        query = query.where('account.logged_in' as any, '=', 0);
    }

    if (filters.ip) {
        query = query.where(db.dynamic.ref('account.id'), 'in',
            db.selectFrom('session')
                .select('account_id')
                .where('session.ip', '=', filters.ip)
        );
    }

    if (filters.uid) {
        query = query.where(db.dynamic.ref('account.id'), 'in',
            db.selectFrom('session')
            .select('account_id')
            .where('session.uid', '=', parseInt(filters.uid, 10))
        );
    }

    const sortField = filters.sort ?? defaultSort;
    const sortOrder = filters.order === 'asc' || filters.order === 'desc' ? filters.order : defaultOrder;

    query = query.orderBy(sortField, sortOrder);
    return query;
}