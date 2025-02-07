import { FastifyReply, FastifyRequest } from "fastify";


export type LoginPageQuery = {
    redirectUrl: string | undefined
};

export type LoginRequestBody = {
    username: string,
    password: string
};

function isLoggedIn(request: FastifyRequest) {
    return request.session.account !== undefined;
};

function handleResponse(req: FastifyRequest, reply: FastifyReply, redirect: boolean) {
    if (redirect) {
        return reply.redirect(`/account/login?redirectUrl=${encodeURI(req.url)}`, 302);
    } else {
        return reply.status(401).send({ error: 'Unauthorized' });
    }
}

export function requiresLogin(redirect: boolean = false) {
    return (request: FastifyRequest, reply: FastifyReply, done: (error?: Error) => void) => {
        if (!isLoggedIn(request)) {
            return handleResponse(request, reply, redirect);
        }
        done();
    }
}

export function requiresStaffLevel(staffLevel: number, redirect: boolean = false) {
    return (request: FastifyRequest, reply: FastifyReply, done: (error?: Error) => void) => {
        if (!isLoggedIn(request) || request.session.account.staffmodlevel < staffLevel) {
            return handleResponse(request, reply, redirect);
        }
        done();
    }
}