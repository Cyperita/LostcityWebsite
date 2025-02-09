import fs from 'fs';

import { FastifyInstance } from 'fastify';

import { db, toDbDate, buildQueryString } from '#/db/query.js';
import { toDisplayName, toSafeName } from '#/jstring/JString.js';
import LoggerEventType from '#/util/LoggerEventType.js';
import { isUsernameExplicit, isUsernameValid } from '#/util/Username.js';
import { requiresStaffLevel } from '#/util/Authentication.js';
import { toAbsolute, toCoord, toDisplayCoord } from '#/util/Map.js';
import { fromNow, formatTime } from '#/util/Timestamp.js';

const reasons = [
    'Offensive language',
    'Item scamming',
    'Password scamming',
    'Bug abuse',
    'Staff impersonation',
    'Account sharing/trading',
    'Macroing',
    'Multiple logging in',
    'Encouraging others to break rules',
    'Misuse of customer support',
    'Advertising / website',
    'Real world item trading'
];

const tempHardcodedSidebar = [
    { icon: 'layout-grid', title: 'Overview', link: '/mod' , active: true },
    { icon: 'flag', title: 'Reports', badge: '26', link: '/mod/reports' },
    { icon: 'user-search' , title: 'Search Users' , link: '/mod/search' }
];

const tempHardcodedDashboardCards = [
    { title: 'Reports Made', value: '+56', icon: 'flag', color: 'error' },
    { title: 'Accounts Created', value: '+827', icon: 'user-plus', color: 'success' },
    { title: 'Wealth Added', value: '+3M', icon: 'coins', color: 'warning' }
];

export default async function (app: FastifyInstance) {
    app.get('/', { onRequest: requiresStaffLevel(1, true) }, async (req: any, res: any) => {
        try {
            return res.view('mod/index', {
                account: req.session.account,
                breadcrumbs: [],
                sidebarItems: tempHardcodedSidebar,
                exampleDashboardCards: tempHardcodedDashboardCards,
                title: 'Overview'
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });

    app.get('/overview/:username', { onRequest: requiresStaffLevel(1, true) }, async (req: any, res: any) => {
        const { username } = req.params;
        const account = await db.selectFrom('account').where('username', '=', username).selectAll().executeTakeFirst();

        if (!account) {
            return res.view('mod/notfound', {
                username
            });
        }

        return res.view('mod/overview', {
            toDisplayName,
            toDisplayCoord,
            account,
            title: `${toDisplayName(account.username)} Overview`,
            breadcrumbs: [],
            sidebarItems: tempHardcodedSidebar,
        });
    });

    app.get('/overview-old/:username', { onRequest: requiresStaffLevel(1, true) }, async (req: any, res: any) => {
        try {
            const { username } = req.params;
            const account = await db.selectFrom('account').where('username', '=', username).selectAll().executeTakeFirst();

            if (!account) {
                return res.view('mod/notfound', {
                    username
                });
            }

            return res.view('mod/overview-old', {
                toDisplayName,
                toDisplayCoord,
                account,
                sessions: await db.selectFrom('session').where('account_id', '=', account.id)
                    .orderBy('timestamp desc').selectAll().execute(),
                chats: await db.selectFrom('public_chat').where('account_id', '=', account.id)
                    .orderBy('timestamp desc').limit(100).selectAll().execute(),
                pms: await db.selectFrom('private_chat').where('account_id', '=', account.id)
                    .leftJoin('account', 'private_chat.to_account_id', 'account.id')
                    .orderBy('timestamp desc').limit(100).selectAll().execute(),
                logs: await db.selectFrom('account_session').where('account_id', '=', account.id).where('event_type', '!=', LoggerEventType.WEALTH)
                    .orderBy('timestamp desc').limit(100).selectAll().execute(),
                wealth: await db.selectFrom('account_session').where('account_id', '=', account.id).where('event_type', '=', LoggerEventType.WEALTH)
                    .orderBy('timestamp desc').limit(100).selectAll().execute(),
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });

    app.get('/reports', { onRequest: requiresStaffLevel(1, true) }, async (req: any, res: any) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 20;

            const filters = {
                start: req.query.start || '',
                end: req.query.end || '',
                reason: req.query.reason || '',
                username: req.query.username || '',
                offender: req.query.offender || ''
            };

            let baseQuery = db.selectFrom('report')
            .innerJoin('account', 'report.account_id', 'account.id');

            if (filters.start) {
                baseQuery = baseQuery.where('timestamp', '>=', toDbDate(filters.start));
            }
            if (filters.end) {
                baseQuery = baseQuery.where('timestamp', '<=', toDbDate(filters.end));
            }
            if (filters.reason) {
                baseQuery = baseQuery.where('reason', '=', filters.reason);
            }
            if (filters.username) {
                baseQuery = baseQuery.where('account.username', '=', filters.username);
            }
            if (filters.offender) {
                baseQuery = baseQuery.where('offender', '=', filters.offender);
            }

            const totalRecords = await baseQuery
                .select(({ fn }) => fn.countAll().as('count'))
                .executeTakeFirst();

            const reports = await baseQuery
                .selectAll('report')
                .select('account.username')
                .orderBy('timestamp desc')
                .limit(limit)
                .offset((page - 1) * limit)
                .execute();

            const totalPages = totalRecords ? Math.ceil(Number(totalRecords.count) / limit) : 0;

            return res.view('mod/reports', {
                toDisplayName,
                toDisplayCoord,
                fromNow,
                formatTime,
                account: req.session.account,
                breadcrumbs: [],
                sidebarItems: tempHardcodedSidebar,
                exampleDashboardCards: tempHardcodedDashboardCards,
                title: 'Reports',
                reports,
                reasons,
                currentPage: page,
                totalPages,
                filters,
                filtersQuery: buildQueryString(filters, ['page'])
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });

    app.get('/uid/:uid', { onRequest: requiresStaffLevel(1, true) }, async (req: any, res: any) => {
        try {
            const { uid } = req.params;

            const sessions = await db.selectFrom('session').select('uid')
                .where('uid', '=', uid)
                .groupBy('account_id')
                .leftJoin('account', 'session.account_id', 'account.id').select('account.username')
                .execute();

            return res.view('mod/uid', {
                toDisplayName,
                sessions
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });

    app.get('/ip/:ip', { onRequest: requiresStaffLevel(1, true) }, async (req: any, res: any) => {
        try {
            const { ip } = req.params;

            const sessions = await db.selectFrom('session').select('ip')
                .where('ip', '=', ip)
                .groupBy('account_id')
                .leftJoin('account', 'session.account_id', 'account.id').select('account.username')
                .execute();

            return res.view('mod/ip', {
                toDisplayName,
                sessions
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });

    app.post('/ban/:id', { onRequest: requiresStaffLevel(1) }, async (req: any, res: any) => {
        const { id } = req.params;
        const { banned_until } = req.body;

        if (!banned_until) {
            return res.status(400).send({ error: `Missing 'banned_until' in body` });
        }

        const account = db.selectFrom('account')
            .where('id', '=', id)
            .selectAll()
            .executeTakeFirst();
        
        if (!account) {
            return res.status(400).send({ error: `Account with ID '${id}' does not exist` });
        }

        const bannedDate = new Date(banned_until);
        const isInvalidDate = isNaN(bannedDate.getTime()) || bannedDate.getTime() - (new Date()).getTime() < 0;

        await db.updateTable('account')
            .set({ banned_until: isInvalidDate ? null : toDbDate(banned_until), logged_in: 0 })
            .where('id', '=', id)
            .execute();

        return res.status(200).send({ success: true });
    });

    app.post('/unban/:id', { onRequest: requiresStaffLevel(1) }, async (req: any, res: any) => {
        const { id } = req.params;
        const account = db.selectFrom('account')
            .where('id', '=', id)
            .selectAll()
            .executeTakeFirst();
        
        if (!account) {
            return res.status(400).send({ error: `Account with ID '${id}' does not exist` });
        }

        await db.updateTable('account')
            .set({ banned_until: null, logged_in: 0 })
            .where('id', '=', id)
            .execute();
        
        return res.status(200).send({ success: true });
    });

    app.post('/mute/:id', { onRequest: requiresStaffLevel(1) }, async (req: any, res: any) => {
        const { id } = req.params;
        const { muted_until } = req.body;

        if (!muted_until) {
            return res.status(400).send({ error: `Missing 'muted_until' in body` });
        }

        const account = db.selectFrom('account')
            .where('id', '=', id)
            .selectAll()
            .executeTakeFirst();
        
        if (!account) {
            return res.status(400).send({ error: `Account with ID '${id}' does not exist` });
        }

        const mutedDate = new Date(muted_until);
        const isInvalidDate = isNaN(mutedDate.getTime()) || mutedDate.getTime() - (new Date()).getTime() < 0;

        await db.updateTable('account')
            .set({ muted_until: isInvalidDate ? null : toDbDate(muted_until) })
            .where('id', '=', id)
            .execute();

        return res.status(200).send({ success: true });
    });

    app.post('/unmute/:id', { onRequest: requiresStaffLevel(1) }, async (req: any, res: any) => {
        const { id } = req.params;
        const account = db.selectFrom('account')
            .where('id', '=', id)
            .selectAll()
            .executeTakeFirst();
        
        if (!account) {
            return res.status(400).send({ error: `Account with ID '${id}' does not exist` });
        }

        await db.updateTable('account')
            .set({ muted_until: null, logged_in: 0 })
            .where('id', '=', id)
            .execute();
        
        return res.status(200).send({ success: true });
    });

    app.post('/kick/:id', { onRequest: requiresStaffLevel(1) }, async (req: any, res: any) => {
        const { id } = req.params;
        const account = db.selectFrom('account')
            .where('id', '=', id)
            .selectAll()
            .executeTakeFirst();
        
        if (!account) {
            return res.status(400).send({ error: `Account with ID '${id}' does not exist` });
        }

        await db.updateTable('account')
            .set({ logged_in: 0 })
            .where('id', '=', id)
            .execute();
        
        return res.status(200).send({ success: true });
    });

    app.post('/change-name/:id', { onRequest: requiresStaffLevel(1) }, async (req: any, res: any) => {
        const { id } = req.params;
        const { new_username, unban } = req.body;

        if (!new_username) {
            return res.status(400).send({ error: `Missing 'new_username' in body` });
        }

        const nameCheck = isUsernameValid(new_username);
        if (!nameCheck.success) {
            return res.status(400).send({ error: nameCheck.message });
        }

        const profanityCheck = isUsernameExplicit(new_username);
        if (!profanityCheck.success) {
            return res.status(400).send({ error: nameCheck.message });
        }

        const account = await db.selectFrom('account')
            .where('id', '=', id)
            .selectAll()
            .executeTakeFirst();

        if (!account) {
            return res.status(400).send({ error: `User with '${id}' does not exist.` });
        }

        const safeNewName = toSafeName(new_username);
        const existingAccount = await db.selectFrom('account')
            .where('username', '=', safeNewName)
            .selectAll()
            .executeTakeFirst();

        if (existingAccount) {
            return res.status(400).send({ error: `User with ${new_username} already exists - please select a new name.` });
        }

        let updatePlayerModel: any = { username: safeNewName };
        if (unban === true) {
            updatePlayerModel.banned_until = null;
            updatePlayerModel.logged_in = 0;
        }

        await db.updateTable('account')
            .set(updatePlayerModel)
            .where('id', '=', id)
            .execute();

        await db.insertInto('account')
            .values({
                username: account.username,
                password: 'blocked'
            })
            .execute();

        // todo: profiles
        if (fs.existsSync(`data/players/beta/${account.username}.sav`)) {
            fs.renameSync(`data/players/beta/${account.username}.sav`, `data/players/beta/${safeNewName}.sav`);
        }

        return res.status(200).send({ success: true });
    });

    app.get('/wealth/:username', async (req: any, res: any) => {
        try {
            const { username } = req.params;

            if (!req.session.account || req.session.account.staffmodlevel < 1) {
                return res.redirect(`/account/login?redirectUrl=/mod/wealth/${username}`, 302);
            }

            return res.view('mod/wealth', {
                toDisplayName,
                toDisplayCoord,
                username,
                logs: await db.selectFrom('account_session').select(['timestamp', 'coord', 'event', 'world'])
                    .innerJoin('account', 'account_session.account_id', 'account.id').select('account.username')
                    .where('profile', '=', 'beta')
                    .where('username', '=', username)
                    .where('event_type', '=', LoggerEventType.WEALTH)
                    .orderBy('timestamp desc').execute()
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });

    app.get('/chat', async (req: any, res: any) => {
        try {
            const { coord, world, timestamp } = req.query;

            if (!req.session.account || req.session.account.staffmodlevel < 1) {
                return res.redirect(`/account/login?redirectUrl=/mod/chat?coord=${coord}&world=${world}&timestamp=${timestamp}`, 302);
            }

            if (typeof coord === 'undefined' || typeof world === 'undefined' || typeof timestamp === 'undefined') {
                return res.redirect('/', 302);
            }

            const center = toAbsolute(coord);
            const topLeft = { level: center.level, x: center.x - 15, z: center.z - 15 };
            const bottomRight = { level: center.level, x: center.x + 15, z: center.z + 15 };

            const allCoords: number[] = [];
            for (let x = topLeft.x; x <= bottomRight.x; x++) {
                for (let z = topLeft.z; z <= bottomRight.z; z++) {
                    allCoords.push(toCoord(center.level, x, z));
                }
            }

            const oneHourBefore = toDbDate(parseInt(timestamp) - (1000 * 60 * 60));
            const tenMinutesAfter = toDbDate(parseInt(timestamp) + (1000 * 60 * 10));

            const logs = await db.selectFrom('public_chat').select(['timestamp', 'coord', 'message', 'world'])
                .innerJoin('account', 'public_chat.account_id', 'account.id').select('account.username')
                .where('profile', '=', 'beta')
                .where('world', '=', world)
                .where((eb: any) => eb.or(
                    allCoords.map(c =>
                        eb('coord', '=', c)
                    )
                ))
                .where('timestamp', '<', tenMinutesAfter)
                .where('timestamp', '>', oneHourBefore)
                .orderBy('timestamp desc').execute();

            return res.view('mod/chat', {
                toDisplayName,
                toDisplayCoord,
                logs
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });
}
