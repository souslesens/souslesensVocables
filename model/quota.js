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
     * Add a quota entry for a given user and route.
     *
     * @param {string} route - The API route that was called (e.g., "/api/data").
     * @param {UserAccount} user - A user account
     * @returns {Promise<number>} The generated identifier of the inserted quota row.
     * @throws {Error} If the parameters are invalid or the database operation fails.
     */
    async add(route, user) {
        if (!route || typeof route !== "string") {
            throw new Error("Invalid route supplied to QuotaModel.add");
        }
        if (!user || user.id === undefined || user.id === null) {
            throw new Error("User object with a valid id must be provided to QuotaModel.add");
        }

        const conn = getKnexConnection(this._mainConfig.database);
        try {
            const result = await conn.insert({ route, user_id: user.id, timestamp: new Date() }).into("quota");
            return Array.isArray(result) ? result[0] : result;
        } finally {
            cleanupConnection(conn);
        }
    }
}

const quotaModel = new QuotaModel();
export { QuotaModel, quotaModel };
