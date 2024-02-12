const fs = require("fs");
const { Lock } = require("async-await-mutex-lock");

const { configDatabasesPath } = require("./config");

const lock = new Lock();

class DatabaseModel {
    /**
     * @param {string} path - path of the databases.json file
     */
    constructor(path) {
        this.path = path;
    }

    /**
     * @param {string} identifier -  a database identifier
     */
    _deleteDatabase = async (identifier) => {
        await lock.acquire("DatabasesThread");
        try {
            const databases = await this._read();
            const { [identifier]: databaseToDelete, ...remainingDatabases } = databases;
            if (!databaseToDelete) {
                return false;
            }
            await this._write(remainingDatabases);
            return true;
        } finally {
            lock.release("DatabasesThread");
        }
    };

    /**
     * @returns {Promise<Record<string, Database>>} a collection of databases
     */
    _read = async () => {
        return fs.promises.readFile(this.path).then((data) => JSON.parse(data.toString()));
    };

    /**
     * @param {Record<string, Database>} databases - a collection of databases
     */
    _write = async (databases) => {
        await fs.promises.writeFile(this.path, JSON.stringify(databases, null, 2));
    };

    /**
     * @param {string} identifier -  a database identifier
     */
    deleteDatabase = async (identifier) => {
        const databases = await this._read();
        const filteredDatabases = databases.filter((database) => database.id !== identifier);

        await lock.acquire("DatabasesThread");
        try {
            await this._write(filteredDatabases);
        } finally {
            lock.release("DatabasesThread");
        }
    };

    /**
     * @returns {Promise<Record<string, Database>>} a collection of databases
     */
    getAllDatabases = async () => {
        return await this._read();
    };
}

const databaseModel = new DatabaseModel(configDatabasesPath);

module.exports = { DatabaseModel, databaseModel };
