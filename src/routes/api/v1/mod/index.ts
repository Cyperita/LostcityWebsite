import { db, toDbDate } from "#/db/query.js";
import { DB } from "#/db/types.js";
import { requiresStaffLevel } from "#/util/Authentication.js";
import LoggerEventType from "#/util/LoggerEventType.js";
import { toDisplayCoord } from "#/util/Map.js";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { SelectQueryBuilder } from "kysely";

type AccountIdParam = {
    id: number
};

type PaginationQuery = {
    amount?: number;
    offset?: number;
    filter?: string;
    before?: string;
    after?: string;
}

function populateDefaultValues(query: PaginationQuery) {
    const amount = Number(query.amount ?? 10),
          offset = Number(query.offset ?? 0);

    const popualtedQuery: any = {
        amount: isNaN(amount) ? 10 : amount,
        offset: isNaN(offset) ? 0 : offset
    };

    if (query.filter) {
        popualtedQuery.filter = query.filter.toString();
    }
    if (query.before) {
        popualtedQuery.before = new Date(query.before).toISOString();
    }
    if (query.after) {
        popualtedQuery.after = new Date(query.after).toISOString();
    }

    return popualtedQuery;
}

export default function(fastify: FastifyInstance): void {
    /**
     * GET /api/v1/mod/session/:accountId?amount=<number>&offset=<number>&filter=<string>&before=<string>&after=<string>
     * Returns a paginated list of sessions from a given user, applying optional date and text filtering
     */
    fastify.get('/session/:id', { onRequest: requiresStaffLevel(1) }, async (req: FastifyRequest<{ Params: AccountIdParam, Querystring: PaginationQuery }>, res: FastifyReply) => {
        const { id } = req.params;
        const populatedQuery = populateDefaultValues(req.query);

        let sessionData: SelectQueryBuilder<DB, 'session', {}> = db.selectFrom('session')
            .selectAll()
            .where('account_id', '=', id);
        
        if (populatedQuery.filter) {
            sessionData = sessionData.where('uid', '=', populatedQuery.filter);
        }
        if (populatedQuery.before) {
            sessionData = sessionData.where('timestamp', '<', toDbDate(populatedQuery.before));
        }
        if (populatedQuery.after) {
            sessionData = sessionData.where('timestamp', '>', toDbDate(populatedQuery.after));
        }
        
        sessionData = sessionData
            .orderBy('timestamp desc')
            .limit(populatedQuery.amount)
            .offset(populatedQuery.offset);
        
        const results = await sessionData.execute();
        return res.status(200).send({
            data: results
            // TODO: Get paginated numbers (total filtered, total unfiltered)
        });
    });

    /**
     * GET /api/v1/mod/chat/public/:accountId?amount=<number>&offset=<number>&filter=<string>&before=<string>&after=<string>
     * Returns a paginated list of public chat messages from a specific user, applying optional date and text filtering
     */
    fastify.get('/chat/public/:id', { onRequest: requiresStaffLevel(1) }, async (req: FastifyRequest<{ Params: AccountIdParam, Querystring: PaginationQuery }>, res: FastifyReply) => {
        const { id } = req.params;
        const populatedQuery = populateDefaultValues(req.query);

        let publicChats: SelectQueryBuilder<DB, 'public_chat', {}> = db.selectFrom('public_chat')
            .selectAll()
            .where('account_id', '=', id);
        
        if (populatedQuery.filter) {
            publicChats = publicChats.where('message', 'like', `%${populatedQuery.filter}%`);
        }

        if (populatedQuery.before) {
            publicChats = publicChats.where('timestamp', '<', toDbDate(populatedQuery.before));
        }
        if (populatedQuery.after) {
            publicChats = publicChats.where('timestamp', '>', toDbDate(populatedQuery.after));
        }

        publicChats = publicChats
            .orderBy('timestamp desc')
            .limit(populatedQuery.amount)
            .offset(populatedQuery.offset);
        
        const results: any = await publicChats.execute();
        const processedResults = results.map((e: any) => {
            e.coord = toDisplayCoord(e.coord);
            return e;
        });
        return res.status(200).send({
            data: processedResults
        });
    });

    /**
     * GET /api/v1/mod/chat/public/:accountId?amount=<number>&offset=<number>&filter=<string>&before=<string>&after=<string>
     * Returns a paginated list of prviate chat messages from a specific user, applying optional date and text filtering
     */
    fastify.get('/chat/private/:id', { onRequest: requiresStaffLevel(1) }, async (req: FastifyRequest<{ Params: AccountIdParam, Querystring: PaginationQuery }>, res: FastifyReply) => {
        const { id } = req.params;
        const populatedQuery = populateDefaultValues(req.query);

        let privateChats: SelectQueryBuilder<DB, 'private_chat', {}> = db.selectFrom('private_chat')
            .selectAll()
            .where('account_id', '=', id);
        
        if (populatedQuery.filter) {
            privateChats = privateChats.where('message', 'like', `%${populatedQuery.filter}%`);
        }

        if (populatedQuery.before) {
            privateChats = privateChats.where('timestamp', '<', toDbDate(populatedQuery.before));
        }
        if (populatedQuery.after) {
            privateChats = privateChats.where('timestamp', '>', toDbDate(populatedQuery.after));
        }

        privateChats = privateChats
            .orderBy('timestamp')
            .limit(populatedQuery.amount)
            .offset(populatedQuery.offset);
        
        const results: any = await privateChats.execute();
        return res.status(200).send(results.map((e: any) => {
            e.coord = toDisplayCoord(e.coord);
            return e;
        }));
    });

    /**
     * GET /api/v1/mod/events/server/:accountId?amount=<number>&offset=<number>&filter=<string>&before=<string>&after=<string>
     * Returns a paginated list of server-related events from a specific user, applying optional date and text filtering
     * 
     * Examples of server-related events include: login/logout, server check-ins, socket info, etc.
     */
    fastify.get('/events/server/:id', { onRequest: requiresStaffLevel(1) }, async (req: FastifyRequest<{ Params: AccountIdParam, Querystring: PaginationQuery }>, res: FastifyReply) => {
        const { id } = req.params;
        const populatedQuery = populateDefaultValues(req.query);

        let serverEvents: SelectQueryBuilder<DB, 'account_session', {}> = db.selectFrom('account_session')
            .selectAll()
            .where('account_id', '=', id)
            .where('event_type', '!=', LoggerEventType.WEALTH);
        
        if (populatedQuery.filter) {
            serverEvents = serverEvents.where('event', 'like', `%${populatedQuery.filter}%`);
        }

        if (populatedQuery.before) {
            serverEvents = serverEvents.where('timestamp', '<', toDbDate(populatedQuery.before));
        }
        if (populatedQuery.after) {
            serverEvents = serverEvents.where('timestamp', '>', toDbDate(populatedQuery.after));
        }

        serverEvents = serverEvents
            .orderBy('timestamp desc')
            .limit(populatedQuery.amount)
            .offset(populatedQuery.offset);
        
        const results: any = await serverEvents.execute();
        return res.status(200).send(results.map((e: any) => {
            e.coord = toDisplayCoord(e.coord);
            return e;
        }));
    });

    /**
     * GET /api/v1/mod/events/wealth/:accountId?amount=<number>&offset=<number>&filter=<string>&before=<string>&after=<string>
     * Returns a paginated list of wealth-related events from a specific user, applying optional date and text filtering
     * 
     * Examples of wealth-related events include: picking up/dropping/placing items, trading, etc.
     */
    fastify.get('/events/wealth/:id', { onRequest: requiresStaffLevel(1) }, async (req: FastifyRequest<{ Params: AccountIdParam, Querystring: PaginationQuery }>, res: FastifyReply) => {
        /*await db.selectFrom('account_session').where('account_id', '=', account.id).where('event_type', '=', LoggerEventType.WEALTH)
                    .orderBy('timestamp desc').limit(100).selectAll().execute(), */
        const { id } = req.params;
        const populatedQuery = populateDefaultValues(req.query);

        let wealthEvents: SelectQueryBuilder<DB, 'account_session', {}> = db.selectFrom('account_session')
            .selectAll()
            .where('account_id', '=', id)
            .where('event_type', '=', LoggerEventType.WEALTH);
        
        if (populatedQuery.filter) {
            wealthEvents = wealthEvents.where('event', 'like', `%${populatedQuery.filter}%`);
        }

        if (populatedQuery.before) {
            wealthEvents = wealthEvents.where('timestamp', '<', toDbDate(populatedQuery.before));
        }
        if (populatedQuery.after) {
            wealthEvents = wealthEvents.where('timestamp', '>', toDbDate(populatedQuery.after));
        }

        wealthEvents = wealthEvents
            .orderBy('timestamp')
            .limit(populatedQuery.amount)
            .offset(populatedQuery.offset);
        
        const results = await wealthEvents.execute();
        return res.status(200).send(results);
    });
}