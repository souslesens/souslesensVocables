import { readMainConfig } from "./config.js";
import { Lock } from "async-await-mutex-lock";

/**
 * @typedef {import("./UserTypes").UserAccount} UserAccount
 */

class QuotaStore {
    constructor(windowMs = 60000) {
        this._store = new Map();
        this._configCache = new Map();
        this._windowMs = windowMs;
        this._cleanupInterval = 10000;
        this._locks = new Map();

        this._cleanupTimer = setInterval(() => this._cleanup(), this._cleanupInterval);

        if (this._cleanupTimer.unref) {
            this._cleanupTimer.unref();
        }
    }

    _getKey(type, id, route, method) {
        return `${type}:${id || "all"}:${route}:${method}`;
    }

    _getLock(key) {
        if (!this._locks.has(key)) {
            this._locks.set(key, new Lock());
        }
        return this._locks.get(key);
    }

    async increment(type, id, route, method, capacity = 100) {
        const key = this._getKey(type, id, route, method);
        const lock = this._getLock(key);

        await lock.acquire();
        try {
            const now = Date.now();
            const refillRate = capacity / (this._windowMs / 1000);

            let entry = this._store.get(key);

            if (!entry) {
                entry = {
                    tokens: capacity,
                    lastRefill: now,
                    capacity: capacity,
                    refillRate: refillRate,
                };
            } else if (entry.capacity !== capacity) {
                entry.capacity = capacity;
                entry.refillRate = capacity / (this._windowMs / 1000);
            }

            const elapsed = (now - entry.lastRefill) / 1000;
            entry.tokens = Math.min(entry.tokens + elapsed * entry.refillRate, entry.capacity);
            entry.lastRefill = now;

            let consumed = false;
            if (entry.tokens >= 1) {
                entry.tokens -= 1;
                consumed = true;
            }

            this._store.set(key, entry);

            return {
                consumed,
                remaining: entry.tokens,
                capacity: entry.capacity,
            };
        } finally {
            lock.release();
        }
    }

    getTokenCount(type, id, route, method, capacity) {
        const key = this._getKey(type, id, route, method);
        const entry = this._store.get(key);

        if (!entry) {
            return { remaining: capacity, capacity: capacity };
        }

        const now = Date.now();
        const elapsed = (now - entry.lastRefill) / 1000;
        const tokens = Math.min(entry.tokens + elapsed * entry.refillRate, entry.capacity);

        return {
            remaining: tokens,
            capacity: entry.capacity,
        };
    }

    async getProfileConfig(profileName, fetchCallback) {
        const key = `profile:${profileName}`;
        const cached = this._configCache.get(key);

        if (cached && Date.now() < cached.expiresAt) {
            return cached.data;
        }

        const data = await fetchCallback();
        this._configCache.set(key, {
            data,
            expiresAt: Date.now() + this._windowMs,
        });
        return data;
    }

    async getGeneralConfig(fetchCallback) {
        const key = "general";
        const cached = this._configCache.get(key);

        if (cached && Date.now() < cached.expiresAt) {
            return cached.data;
        }

        const data = await fetchCallback();
        this._configCache.set(key, {
            data,
            expiresAt: Date.now() + this._windowMs,
        });
        return data;
    }

    clearConfigCache() {
        this._configCache.clear();
    }

    _cleanup() {
        const now = Date.now();
        const maxIdle = this._windowMs * 2;

        for (const [key, entry] of this._store.entries()) {
            if (now - entry.lastRefill > maxIdle && entry.tokens >= entry.capacity) {
                this._store.delete(key);
                this._locks.delete(key);
            }
        }

        const configNow = Date.now();
        for (const [key, entry] of this._configCache.entries()) {
            if (configNow > entry.expiresAt) {
                this._configCache.delete(key);
            }
        }
    }
}

class QuotaModel {
    constructor(quotaStore = null) {
        this._mainConfig = readMainConfig();
        this._store = quotaStore || new QuotaStore(60000);
    }

    async _getQuotaForRoute(route, method, user, profileName, wholeProfile) {
        if (wholeProfile && profileName) {
            const profileQuota = await this.getProfileConfig(profileName, async () => {
                const profileModel = (await import("./profiles.js")).profileModel;
                const profiles = await profileModel.getAllProfiles();
                return profiles[profileName]?.quota || {};
            });

            if (profileQuota && profileQuota[route] && profileQuota[route][method]) {
                const limit = profileQuota[route][method];
                if (typeof limit === "number") {
                    return limit;
                } else if (typeof limit === "object" && limit !== null && "quota" in limit) {
                    return limit.quota;
                }
            }
        }

        if (this._mainConfig.generalQuota?.[route]?.[method]) {
            return this._mainConfig.generalQuota[route][method];
        }

        return Infinity;
    }

    async add(route, method, user, wholeProfile = false, profileName = null) {
        if (!route || typeof route !== "string") {
            throw new Error("Invalid route supplied to QuotaModel.add");
        }
        if (!method || typeof method !== "string") {
            throw new Error("Invalid method supplied to QuotaModel.add");
        }
        if (!user || user.id === undefined || user.id === null) {
            throw new Error("User object with a valid id must be provided to QuotaModel.add");
        }

        const quota = await this._getQuotaForRoute(route, method, user, profileName, wholeProfile);

        const userResult = await this._store.increment("user", user.id, route, method, quota);

        if (wholeProfile && profileName) {
            await this._store.increment("profile", profileName, route, method, quota);
        }

        await this._store.increment("global", null, route, method, quota);

        return userResult;
    }

    async tryConsume(route, method, user, wholeProfile = false, profileName = null, quotaOverride = null) {
        if (!route || typeof route !== "string") {
            throw new Error("Invalid route supplied to QuotaModel.tryConsume");
        }
        if (!method || typeof method !== "string") {
            throw new Error("Invalid method supplied to QuotaModel.tryConsume");
        }
        if (!user || user.id === undefined || user.id === null) {
            throw new Error("User object with a valid id must be provided to QuotaModel.tryConsume");
        }

        const quota = quotaOverride !== null ? quotaOverride : await this._getQuotaForRoute(route, method, user, profileName, wholeProfile);

        if (quota === Infinity) {
            return { consumed: true, remaining: Infinity, capacity: Infinity };
        }

        const userResult = await this._store.increment("user", user.id, route, method, quota);

        if (wholeProfile && profileName) {
            await this._store.increment("profile", profileName, route, method, quota);
        }

        await this._store.increment("global", null, route, method, quota);

        return userResult;
    }

    async getProfileConfig(profileName, fetchCallback) {
        return await this._store.getProfileConfig(profileName, fetchCallback);
    }

    async getGeneralConfig(fetchCallback) {
        return await this._store.getGeneralConfig(fetchCallback);
    }

    clearConfigCache() {
        this._store.clearConfigCache();
    }

    async getRateLimitHeaders(route, method, user, wholeProfile = false, profileName = null) {
        const quota = await this._getQuotaForRoute(route, method, user, profileName, wholeProfile);
        const result = this._store.getTokenCount(wholeProfile && profileName ? "profile" : "user", wholeProfile && profileName ? profileName : user.id, route, method, quota);

        const retryAfter = result.remaining < 1 ? Math.ceil((1 - result.remaining) / (result.capacity / (this._store._windowMs / 1000))) : 0;

        return {
            "X-RateLimit-Limit": result.capacity === Infinity ? "unlimited" : Math.floor(result.capacity),
            "X-RateLimit-Remaining": result.remaining === Infinity ? "unlimited" : Math.floor(result.remaining),
            "X-RateLimit-Reset": Math.ceil((Date.now() + this._store._windowMs) / 1000),
            "Retry-After": retryAfter > 0 ? Math.floor(retryAfter) : undefined,
        };
    }
}

const quotaStore = new QuotaStore(60000);
const quotaModel = new QuotaModel(quotaStore);

export { QuotaModel, quotaModel, quotaStore, QuotaStore };
