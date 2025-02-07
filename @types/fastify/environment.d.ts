import { sanitized_account } from "#/db/types.ts";
import fastify from "fastify";

declare module "fastify" {
    interface Session {
        account: sanitized_account,
        success?: string,
        error?: string
    }
}

export {}