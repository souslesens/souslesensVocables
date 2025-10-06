const fs = require("fs");
const knex = require("knex");
const { Lock } = require("async-await-mutex-lock");

const { configDatabasesPath } = require("./config");
const { profileModel } = require("./profiles");

/**
 * @typedef {import("./UserTypes").UserAccount} UserAccount
 */

const lock = new Lock();

class DatabaseModel {
    /**
     * @param {string} path - path of the databases.json file
     */
    constructor(path) {
        this.path = path;
        this.knexClients = {};
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
     * @param {Database} newDatabase -  the new database to insert
     */
    addDatabase = async (newDatabase) => {
        const databases = await this._read();

        if (databases.map((db) => db.id).includes(newDatabase.id)) {
            throw Error("This identifier already exists in the storage");
        }

        databases.push(newDatabase);

        await lock.acquire("DatabasesThread");
        try {
            await this._write(databases);
        } finally {
            lock.release("DatabasesThread");
        }
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
     * @param {string} identifier - a database identifier
     * @returns {Database} - the database related to the specified identifier
     */
    getDatabase = async (identifier) => {
        const databases = await this._read();

        const filteredDatabases = databases.filter((db) => db.id === identifier);
        if (filteredDatabases.length === 0) {
            throw new Error("The database cannot be found", { cause: 404 });
        }

        return filteredDatabases[0];
    };

    /**
     * @param {string} identifier -  a database identifier
     * @returns {Promise<Record<string, string>>} - a database with minimal info
     */
    getDatabaseMinimal = async (identifier) => {
        const database = await this.getDatabase(identifier);

        return {
            id: database.id,
            name: database.name,
            driver: database.driver,
            database: database.database,
        };
    };

    /**
     * @param {UserAccount} user -  a user account
     * @param {string} identifier -  a database identifier
     * @returns {Promise<Record<string, string>>} - a database with minimal info
     */
    getUserDatabaseMinimal = async (user, identifier) => {
        const databases = await this._getUserDatabases(user);
        return databases
            .map((database) => {
                return {
                    id: database.id,
                    name: database.name,
                    driver: database.driver,
                    database: database.database,
                };
            })
            .find((database) => database.id == identifier);
    };

    /**
     * @returns {Promise<Record<string, string>[]>} - a list of database name
     */
    getDatabasesName = async () => {
        const databases = await this._read();
        return databases.map((db) => {
            return { id: db.id, name: db.name };
        });
    };

    /**
     * @returns {Promise<Record<string, Database>>} a collection of databases
     */
    getAllDatabases = async () => {
        return await this._read();
    };

    /**
     * @param {UserAccount} user -  a user account
     * @returns {Promise<Record<string, Database>>} a collection of databases
     */
    _getUserDatabases = async (user) => {
        const allDatabases = await this.getAllDatabases();
        if (user.login === "admin" || user.groups.includes("admin")) {
            return allDatabases;
        }
        const userProfiles = await profileModel.getUserProfiles(user);
        const allowedDatabasesId = Object.entries(userProfiles).flatMap(([profileName, profile]) => {
            return profile.allowedDatabases;
        });

        const allowedDatabases = allDatabases.filter((database) => {
            return allowedDatabasesId.includes(database.id);
        });

        return allowedDatabases;
    };

    /**
     * @param {UserAccount} user -  a user account
     * @returns {Promise<Record<string, Database>>} a collection of databases
     */
    getUserDatabasesName = async (user) => {
        const databases = await this._getUserDatabases(user);
        return databases.map((database) => {
            return { id: database.id, database: database.database };
        });
    };

    /**
     * @param {string} driverName - the driver name
     * @returns {string} the knex version of the database driver
     */
    getClientDriver = (driverName) => {
        switch (driverName) {
            case "sqlserver":
                return "mssql";
            case "postgres":
                return "pg";
        }
    };

    /**
     * @param {string} identifier -  a database identifier
     */
    updateDatabase = async (updatedDatabase) => {
        const databases = await this._read();

        const updatedDatabases = databases.map((database) => {
            return database.id == updatedDatabase.id ? updatedDatabase : database;
        });

        await lock.acquire("DatabasesThread");
        try {
            await this._write(updatedDatabases);
        } finally {
            lock.release("DatabasesThread");
        }
    };

    /**
     * @param {UserAccount} user -  a user account
     * @param {string} databaseId - the database id
     * @returns {Promise<boolean>} true if the database is allowed
     */
    isDatabaseAllowed = async (user, databaseId) => {
        if (user.login === "admin" || user.groups.includes("admin")) {
            return true;
        }
        const userProfiles = await profileModel.getUserProfiles(user);
        const allowedDatabasesId = Object.entries(userProfiles).flatMap(([profileName, profile]) => {
            return profile.allowedDatabases;
        });
        return allowedDatabasesId.includes(databaseId);
    };

    /**
     * @param {string} databaseId - the database id
     * @returns {Promise<any>} database connection
     */
    getAdminRestrictedConnection = async (databaseId) => {
        if (!this.knexClients[databaseId]) {
            const database = await this.getDatabase(databaseId);
            const dbClient = this.getClientDriver(database.driver);
            this.knexClients[databaseId] = knex({
                acquireConnectionTimeout: 5000,
                client: dbClient,
                connection: {
                    host: database.host,
                    port: database.port,
                    user: database.user,
                    password: database.password,
                    database: database.database,
                },
            });
        }

        return this.knexClients[databaseId];
    };

    /**
     * @param {UserAccount} user -  a user account
     * @param {string} databaseId - the database id
     * @returns {Promise<any>} database connection
     */
    getUserConnection = async (user, databaseId) => {
        // return null if database is not allowed
        if (!(await this.isDatabaseAllowed(user, databaseId))) {
            return null;
        }

        return await this.getAdminConnection(databaseId);
    };

    /*
     * @param {string} databaseId - a database identifier
     * @param {function} callback - a function callback
     */
    refreshAdminConnection = async (databaseId, callback) => {
        const client = this.knexClients[databaseId];
        if (client) {
            await client.destroy();
            delete this.knexClients[databaseId];
            console.log(`Connexion fermée pour la base ${databaseId}`);
        }
        await this.getAdminConnection(databaseId);
        console.log(`Connexion ouverte pour la base ${databaseId}`);
        if (callback) {
            callback();
        }
        return;
    };
    /*
     * @param {UserAccount} user -  a user account
     * @param {string} databaseId - a database identifier
     * @param {function} callback - a function callback
     */
    refreshUserConnection = async (user, databaseId, callback) => {
        if (!(await this.isDatabaseAllowed(user, databaseId))) {
            return null;
        }
        this.refreshAdminConnection(databaseId, callback);
    };

    /**
     * @param {any} connection - a database connection
     * @param {string} query - a sql query
     * @returns {Promise<any>} query result
     */
    query = async (connection, query) => {
        const result = await connection.raw(query);
        return { rowCount: result.rowCount, rows: result.rows };
    };

    /**
     * @param {any} connection - a database connection
     * @param {string} tableName - the database table name
     * @param {any[]} values - array of rows
     * @params {string} select - select query
     * @params {number} offset - query offset
     * @params {number} limit - query limit
     * @returns {Promise<any[]>} query result
     */
    batchSelect = async (connection, tableName, { values = [], select = "*", offset = 0, limit = 1000, noRecurs = false }) => {
        return await this.recurseBatchSelect(connection, databaseId, tableName, { values: values, select: select, offset: offset, limit: limit, noRecurs: noRecurs });
    };

    /**
     * @param {any} connection - the knex connection
     * @param {string} databaseId - the database id
     * @param {string} tableName - the database table name
     * @param {any[]} values - array of rows
     * @params {string} select - select query
     * @params {number} offset - query offset
     * @params {number} limit - query limit
     * @returns {Promise<any[]>} query result
     */
    recurseBatchSelect = async (connection, databaseId, tableName, { values = [], select = "*", offset = 0, limit = 1000, noRecurs = false }) => {
        let res = null;
        const columns = await connection(tableName).columnInfo();
        const columnsKeys = Object.keys(columns);
        res = await connection.select(select).from(tableName).orderBy(columnsKeys).limit(limit).offset(offset);

        const concat = values.concat(res);

        if (noRecurs || res.length == 0) {
            return concat;
        }

        return await this.recurseBatchSelect(connection, databaseId, tableName, { values: concat, select: select, offset: offset + limit, limit: limit });
    };
}
const databaseModel = new DatabaseModel(configDatabasesPath);

module.exports = { DatabaseModel, databaseModel };
