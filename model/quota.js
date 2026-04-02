import { readMainConfig } from "./config.js";
import { getKnexConnection, cleanupConnection } from "./utils.js";

/**
 * @typedef {import("./UserTypes").UserAccount} UserAccount
 */

class QuotaModel {
    constructor() {
        this._mainConfig = readMainConfig();
    }

    /**
     * Add a quota entry for a given user, route and method.
     *
     * @param {string} route - The API route that was called (e.g., "/api/data").
     * @param {string} method - The HTTP method (e.g., "GET", "POST").
     * @param {UserAccount} user - A user account
     * @returns {Promise<number>} The generated identifier of the inserted quota row.
     * @throws {Error} If the parameters are invalid or the database operation fails.
     */
    async add(route, method, user) {
        if (!route || typeof route !== "string") {
            throw new Error("Invalid route supplied to QuotaModel.add");
        }
        if (!method || typeof method !== "string") {
            throw new Error("Invalid method supplied to QuotaModel.add");
        }
        if (!user || user.id === undefined || user.id === null) {
            throw new Error("User object with a valid id must be provided to QuotaModel.add");
        }

        const conn = getKnexConnection(this._mainConfig.database);
        try {
            const result = await conn.insert({ route, method, user_id: user.id, timestamp: new Date() }).into("quota");
            return Array.isArray(result) ? result[0] : result;
        } finally {
            cleanupConnection(conn);
        }
    }

    /**
     * Get the number of times a given route and method has been used by a user
     * within the last *N* minutes.
     *
     * @param {string} route - API route (e.g., "/api/data").
     * @param {string} method - HTTP method (e.g., "GET", "POST").
     * @param {UserAccount} user - User object (must contain `id`).
     * @param {number} [lastMinutes=1] - Time window in minutes (default 1).
     * @param {boolean} [wholeProfile=false] - If true, count usage for all users sharing the same profile.
     * @param {string|null} [profileName=null] - The profile name to use when wholeProfile is true.
     * @returns {Promise<number>} Count of matching quota entries; returns 0 if none.
     * @throws {Error} If parameters are invalid or the DB query fails.
     */
    async getRouteUsage(route, method, user, lastMinutes = 1, wholeProfile = false, profileName = null) {
        if (!route || typeof route !== "string") {
            throw new Error("Invalid route supplied to QuotaModel.getRouteUsage");
        }
        if (!method || typeof method !== "string") {
            throw new Error("Invalid method supplied to QuotaModel.getRouteUsage");
        }
        if (!user || user.id === undefined || user.id === null) {
            throw new Error("User object with a valid id must be provided to QuotaModel.getRouteUsage");
        }
        if (typeof lastMinutes !== "number" || lastMinutes <= 0) {
            throw new Error("lastMinutes must be a positive number");
        }

        const conn = getKnexConnection(this._mainConfig.database);
        try {
            let query = conn
                .count("* as cnt")
                .from("quota")
                .where({ route, method })
                .andWhere("timestamp", ">=", conn.raw(`now() - interval '${lastMinutes} minute'`));

            if (wholeProfile && profileName) {
                query = query.andWhere(
                    "user_id",
                    "in",
                    conn
                        .select("id")
                        .from("users")
                        .andWhere("profiles", "@>", conn.raw(`ARRAY['${profileName}']`)),
                );
            } else {
                query = query.andWhere({ user_id: user.id });
            }

            const rows = await query;

            const count = parseInt(rows[0].cnt, 10);
            return Number.isNaN(count) ? 0 : count;
        } finally {
            cleanupConnection(conn);
        }
    }

    /**
     * Get the total number of times a given route and method has been used by ALL users
     * within the last *N* minutes (global quota, no user filter).
     *
     * @param {string} route - API route (e.g., "/api/data").
     * @param {string} method - HTTP method (e.g., "GET", "POST").
     * @param {number} [lastMinutes=1] - Time window in minutes (default 1).
     * @returns {Promise<number>} Count of matching quota entries; returns 0 if none.
     * @throws {Error} If parameters are invalid or the DB query fails.
     */
    async getGlobalRouteUsage(route, method, lastMinutes = 1) {
        if (!route || typeof route !== "string") {
            throw new Error("Invalid route supplied to QuotaModel.getGlobalRouteUsage");
        }
        if (!method || typeof method !== "string") {
            throw new Error("Invalid method supplied to QuotaModel.getGlobalRouteUsage");
        }
        if (typeof lastMinutes !== "number" || lastMinutes <= 0) {
            throw new Error("lastMinutes must be a positive number");
        }

        const conn = getKnexConnection(this._mainConfig.database);
        try {
            const rows = await conn
                .count("* as cnt")
                .from("quota")
                .where({ route, method })
                .andWhere("timestamp", ">=", conn.raw(`now() - interval '${lastMinutes} minute'`));

            const count = parseInt(rows[0].cnt, 10);
            return Number.isNaN(count) ? 0 : count;
        } finally {
            cleanupConnection(conn);
        }
    }
}

const quotaModel = new QuotaModel();
export { QuotaModel, quotaModel };
