import bcrypt from 'bcrypt';
import fs from 'fs';

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { db } from '#/db/query.js';

import { profiles, resolveSelectedProfile } from '#/util/Profile.js';
import { toSafeName } from '#/jstring/JString.js';
import { LoginPageQuery, LoginRequestBody, requiresLogin } from '#/util/Authentication.js';
import { sanitize_account } from '#/db/types.js';

export default async function (app: FastifyInstance) {
    app.get('/', { onRequest: requiresLogin(true) }, async (req: FastifyRequest, res: FastifyReply) => {
        const profile = resolveSelectedProfile(req);

        const { success, error} = req.session;
        delete req.session.success;
        delete req.session.error;

        return res.view('account/index', {
            success,
            error,
            profile,
            profiles
        });
    });

    app.get('/login', async (req: FastifyRequest, res: FastifyReply) => {
        const { success, error} = req.session;
        delete req.session.success;
        delete req.session.error;

        return res.view('account/login', {
            success,
            error
        });
    });

    app.get('/logout', async (req: FastifyRequest, res: FastifyReply) => {
        req.session.destroy();
        return res.redirect('/account/login', 302);
    });

    app.get('/forgot', async (req: FastifyRequest, res: FastifyReply) => {
        const { success, error} = req.session;
        delete req.session.success;
        delete req.session.error;

        return res.view('account/forgot', {
            success,
            error
        });
    });

    app.post('/login', async (req: FastifyRequest<{ Body: LoginRequestBody, Querystring: LoginPageQuery }>, res: FastifyReply) => {
        const { username, password } = req.body;

        const account = await db.selectFrom('account')
                .where('username', '=', toSafeName(username))
                .selectAll()
                .executeTakeFirst();

        if (!account || !(await bcrypt.compare(password.toLowerCase(), account.password))) {
            req.session.error = 'Invalid username or password.';
            return res.redirect('/account/login', 302);
        }

        req.session.account = sanitize_account(account);

        const redirect_uri = req.query.redirectUrl;
        if (redirect_uri) {
            return res.redirect(redirect_uri);
        }

        return res.redirect('/account', 302);
    });

    app.post('/password', { onRequest: requiresLogin(true) }, async (req: any, res: any) => {
        const { password, password2 } = req.body;

        if (!password || password.length < 5 || password.length > 20) {
            req.session.error = 'Your password must be between 5 and 20 characters long.';
            return res.redirect('/account', 302);
        }

        if (password !== password2) {
            req.session.error = 'Your passwords do not match.';
            return res.redirect('/account', 302);
        }

        const hash = await bcrypt.hash(password.toLowerCase(), 10);
        await db.updateTable('account').set({ password: hash }).where('id', '=', req.session.account.id).execute();

        req.session.success = 'Your password has been updated.';
        return res.redirect('/account', 302);
    });

    app.post('/forgot', async (req: FastifyRequest, res: FastifyReply) => {
        return res.redirect('/account/forgot', 302);
    });

    app.post('/export', async (req: FastifyRequest, reply: FastifyReply) => {
        // todo: move to input validation
        // todo: make `requiresLogin()` support custom redirect
        if (!req.session.account) {
            return reply.redirect('/account', 302);
        }

        const profile = resolveSelectedProfile(req);
        if (!fs.existsSync(`data/players/${profile.id}/${req.session.account.username}.sav`)) {
            return reply.redirect('/account', 302);
        }

        reply.header('Content-Disposition', `attachment; filename=${req.session.account.username}.sav`);   
        return fs.readFileSync(`data/players/${profile.id}/${req.session.account.username}.sav`);
    });
}
