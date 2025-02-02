import { FastifyInstance } from 'fastify';

import { db } from '#/db/query.js';
import { toDisplayName } from '#/jstring/JString.js';

function toDisplayCoord(coord: number) {
    const level = (coord >> 28) & 0x3;
    const x = (coord >> 14) & 0x3fff;
    const z = coord & 0x3fff;

    const mx = (x / 64) | 0;
    const mz = (z / 64) | 0;
    const lx = x % 64;
    const lz = z % 64;
    return `${level}_${mx}_${mz}_${lx}_${lz}`;
}

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

export default async function (app: FastifyInstance) {
    app.get('/overview/:username',  async (req: any, res: any) => {
        try {
            if (!req.session.account) {
                return res.redirect('/account/login', 302);
            }

            const { username } = req.params;
    
            const account = await db.selectFrom('account').where('username', '=', username).selectAll().executeTakeFirstOrThrow();

            return res.view('mod/overview', {
                toDisplayName,
                toDisplayCoord,
                account,
                sessions: await db.selectFrom('session').where('account_id', '=', account.id).orderBy('timestamp desc').limit(100).selectAll().execute(),
                logs: await db.selectFrom('account_session').where('account_id', '=', account.id).orderBy('timestamp desc').limit(100).selectAll().execute(),
                chats: await db.selectFrom('public_chat').where('account_id', '=', account.id).orderBy('timestamp desc').limit(100).selectAll().execute(),
                pms: await db.selectFrom('private_chat').where('account_id', '=', account.id).leftJoin('account', 'private_chat.to_account_id', 'account.id').orderBy('timestamp desc').limit(100).selectAll().execute()
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });

    app.get('/reports',  async (req: any, res: any) => {
        try {
            if (!req.session.account) {
                return res.redirect('/account/login', 302);
            }

            return res.view('mod/reports', {
                toDisplayName,
                toDisplayCoord,
                reports: await db.selectFrom('report').selectAll('report')
                    .innerJoin('account', 'report.account_id', 'account.id').select('account.username')
                    .orderBy('timestamp desc').execute(),
                reasons
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });
}
