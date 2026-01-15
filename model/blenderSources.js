import fs from 'fs';
import { Lock } from 'async-await-mutex-lock';

/**
 * @typedef {Object} BlenderSource
 * @prop {boolean} editable
 * @prop {string} controller
 * @prop {SparqlServer} sparql_server
 * @prop {string} graphUri
 * @prop {Predicates} predicates
 * @prop {boolean} protected
 * @prop {string} color
 * @prop {boolean} isBlenderTemplate
 */

/**
 * @typedef {Object} Predicates
 * @prop {string} lang
 */

/**
 * @typedef {Object} SparqlServer
 * @prop {string} url
 */
/**
 * @typedef {Record<string, BlenderSource>} BlenderSourcesMap
 */
class BlenderSources {
    /**
     * @param {string} configPath - path of the config directory
     */

    constructor(configPath) {
        this.configPath = configPath;
        this.blenderSourcePath = this.configPath + "/blenderSources.json";
    }

    /**
     * @returns {Promise<BlenderSourcesMap>} a collection of blenderSources
     */

    get = async () => {
        const data = await fs.promises.readFile(this.blenderSourcePath);
        const blenderSources = JSON.parse(data.toString());
        return blenderSources;
    };
    create = async (newUserAccount) => {
        const lock = new Lock();
        await lock.acquire("UsersThread");
        try {
            const userAccounts = await this._read();
            if (newUserAccount.id === undefined) newUserAccount.id = newUserAccount.login;
            if (Object.keys(userAccounts).includes(newUserAccount.id)) {
                throw Error("UserAccount exists already, try updating it.");
            }
            userAccounts[newUserAccount.id] = newUserAccount;
            await this._write(userAccounts);
        } finally {
            lock.release("UsersThread");
        }
    };
}

const blenderSources = new BlenderSources("config");

export {  blenderSources, BlenderSources  };
