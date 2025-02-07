import { requiresStaffLevel } from "#/util/Authentication.js";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

type PaginationQuery = {
    amount?: number;
    offset?: number;
    filter?: string;
    before?: string;
    after?: string;
}

export default function(fastify: FastifyInstance): void {
    /**
     * GET /api/v1/mod/session/:accountId?amount=<number>&offset=<number>&filter=<string>&before=<string>&after=<string>
     * Returns a paginated list of sessions from a given user, applying optional date and text filtering
     */
    fastify.get('/session/:id', { onRequest: requiresStaffLevel(1) }, async (req: FastifyRequest<{ Querystring: PaginationQuery }>, res: FastifyReply) => {
        
        return res.status(418).send('Not yet implemented!');
    });

    /**
     * GET /api/v1/mod/chat/public/:accountId?amount=<number>&offset=<number>&filter=<string>&before=<string>&after=<string>
     * Returns a paginated list of public chat messages from a specific user, applying optional date and text filtering
     */
    fastify.get('/chat/public/:id', { onRequest: requiresStaffLevel(1) }, async (req: FastifyRequest<{ Querystring: PaginationQuery }>, res: FastifyReply) => {
        return res.status(418).send('Not yet implemented!');
    });

    /**
     * GET /api/v1/mod/chat/public/:accountId?amount=<number>&offset=<number>&filter=<string>&before=<string>&after=<string>
     * Returns a paginated list of prviate chat messages from a specific user, applying optional date and text filtering
     */
    fastify.get('/chat/private/:id', { onRequest: requiresStaffLevel(1) }, async (req: FastifyRequest<{ Querystring: PaginationQuery }>, res: FastifyReply) => {
        return res.status(418).send('Not yet implemented!');
    });

    /**
     * GET /api/v1/mod/events/server/:accountId?amount=<number>&offset=<number>&filter=<string>&before=<string>&after=<string>
     * Returns a paginated list of server-related events from a specific user, applying optional date and text filtering
     * 
     * Examples of server-related events include: login/logout, server check-ins, socket info, etc.
     */
    fastify.get('/events/server/:id', { onRequest: requiresStaffLevel(1) }, async (req: FastifyRequest<{ Querystring: PaginationQuery }>, res: FastifyReply) => {
        return res.status(418).send('Not yet implemented!');
    });

    /**
     * GET /api/v1/mod/events/wealth/:accountId?amount=<number>&offset=<number>&filter=<string>&before=<string>&after=<string>
     * Returns a paginated list of wealth-related events from a specific user, applying optional date and text filtering
     * 
     * Examples of wealth-related events include: picking up/dropping/placing items, trading, etc.
     */
    fastify.get('/events/wealth/:id', { onRequest: requiresStaffLevel(1) }, async (req: FastifyRequest<{ Querystring: PaginationQuery }>, res: FastifyReply) => {
        return res.status(418).send('Not yet implemented!');
    });
}