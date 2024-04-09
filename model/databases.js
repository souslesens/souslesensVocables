const fs = require("fs");
const knex = require("knex");
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
     * @returns {Promise<Record<string, string>[]>} - a list of database name
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
     * @param {string} databaseId - the database id
     * @param {string} query - a sql query
     * @returns {Promise<any>} query result
     */
    query = async (databaseId, query) => {
        const database = await this.getDatabase(databaseId);
        const dbClient = this.getClientDriver(database.driver);
        const conn = knex({
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

        const result = await conn.raw(query);
        return { rowCount: result.rowCount, rows: result.rows };
    };
}

const databaseModel = new DatabaseModel(configDatabasesPath);

module.exports = { DatabaseModel, databaseModel };
