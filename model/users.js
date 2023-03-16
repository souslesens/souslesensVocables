const fs = require("fs");
const bcrypt = require("bcrypt");
const { config, configUsersPath } = require("./config");
const { Lock } = require("async-await-mutex-lock");
const mariadb = require("mariadb");

/**
 * @typedef {import("./UserTypes").UserAccountWithPassword} UserAccountWithPassword
 * @typedef {import("./UserTypes").UserAccount} UserAccount
 * @typedef {import("./UserTypes").SqlConfig} SqlConfig
 */
const lock = new Lock();
/**
 * UserModel provides add/get/update/remove operations on the
 * user database
 */

class UserModel {
    /**
     * @returns {Promise<Record<string, UserAccountWithPassword>>} a collection of UserAccount
     */
    _read = async () => {
        throw Error("Not implemented");
    };

    /**
     * @returns {Promise<Record<string,UserAccount>>} a collection of UserAccount
     */
    getUserAccounts = async () => {
        const userAccountsWithPassword = await this._read();
        /**
         * @type {Record<string, UserAccount>}
         */
        const usersNoPasswords = {};
        Object.entries(userAccountsWithPassword).map(([key, value]) => {
            usersNoPasswords[key] = { id: value.id, login: value.login, groups: value.groups, _type: value._type, source: value.source };
        });
        return usersNoPasswords;
    };

    /**
     * @param {string} login
     */
    findUserAccount = async (login) => {
        const userAccount = await this._readOne(login);
        if (userAccount) {
            return {
                id: userAccount.id,
                login: userAccount.login,
                groups: userAccount.groups,
                source: userAccount.source,
                _type: userAccount._type,
            };
        }
        return undefined;
    };

    /**
     * @param {string} login
     * @param {string} password
     * @returns {boolean} true if login and password match, otherwise false
     */
    checkUserPassword = async (login, password) => {
        const userAccount = await this._readOne(login);
        if (userAccount === undefined) {
            // console.debug(`user ${login} not found`);
            return false;
        }
        if (userAccount.password === undefined) {
            // console.debug(`no password defined for user ${login}`);
            return false;
        }
        if (userAccount.password === "") {
            return false;
        } else if (userAccount.password.startsWith("$2b$") && bcrypt.compareSync(password, userAccount.password)) {
            return true;
        } else if (userAccount.password == password) {
            return true;
        }
        // console.debug(`password does not match for user ${login}`);
        return false;
    };

    /**
     * @param {UserAccount} newUserAccount
     */
    addUserAccount = async (newUserAccount) => {
        await lock.acquire("UsersThread");
        try {
            const userAccounts = await this._read();
            if (newUserAccount.id === undefined) newUserAccount.id = newUserAccount.login;
            // hash password
            newUserAccount.password = bcrypt.hashSync(newUserAccount.password, 10);
            if (Object.keys(userAccounts).includes(newUserAccount.id)) {
                throw Error("UserAccount exists already, try updating it.");
            }
            userAccounts[newUserAccount.login] = newUserAccount;
            await this._write(userAccounts);
        } finally {
            lock.release("UsersThread");
        }
    };

    /**
     * @param {UserAccount} modifiedUserAccount
     */
    updateUserAccount = async (modifiedUserAccount) => {
        await lock.acquire("UsersThread");
        try {
            // hash password if exists
            if (Object.keys(modifiedUserAccount).includes("password")) {
                modifiedUserAccount.password = bcrypt.hashSync(modifiedUserAccount.password, 10);
            }
            const userAccounts = await this._read();
            if (!Object.keys(userAccounts).includes(modifiedUserAccount.login)) {
                throw Error("UserAccount does not exist, try adding it.");
            }
            userAccounts[modifiedUserAccount.login] = { ...userAccounts[modifiedUserAccount.login], ...modifiedUserAccount };
            await this._write(userAccounts);
        } finally {
            lock.release("UsersThread");
        }
    };
}

class UserModelJson extends UserModel {
    /**
     * @param {string} configUsersPath - path of the users.json file
     */
    constructor(configUsersPath) {
        super();
        this.userPath = configUsersPath;
    }

    /**
     * @returns {Promise<Record<string, UserAccountWithPassword>>} a collection of UserAccount
     */
    _read = async () => {
        return fs.promises.readFile(this.userPath).then((data) => JSON.parse(data.toString()));
    };

    /**
     * @param {string} login - user login
     * @returns {Promise<UserAccountWithPassword|undefined>} a UserAccount
     */

    _readOne = async (login) => {
        const users = await this._read();
        return Object.entries(users)
            .map(([_id, user]) => user)
            .find((user) => user.login === login);
    };

    /**
     * @param {Record<string,UserAccount>} userAccounts - a collection of UserAccount
     */
    _write = async (userAccounts) => {
        await fs.promises.writeFile(this.userPath, JSON.stringify(userAccounts, null, 2));
    };
}

class UserModelDatabase extends UserModel {
    /**
     * @param {SqlConfig} sqlConfig - SQL configuration
     */
    constructor(sqlConfig) {
        super();
        // check sql columns are alphanum to avoid sql injection
        if (!(this._isAlphaNum(sqlConfig.loginColumn) && this._isAlphaNum(sqlConfig.passwordColumn) && this._isAlphaNum(sqlConfig.groupsColumn))) {
            throw Error("sqlConfig.loginColumn, sqlConfig.passwordColumn and sqlConfig.groupsColumn MUST BE alphanumeric string");
        }
        this.sqlConfig = sqlConfig;
        this.poolParams = {
            host: sqlConfig.host,
            port: sqlConfig.port,
            user: sqlConfig.user,
            database: sqlConfig.database,
            password: sqlConfig.password,
            connectionLimit: 5,
        };
    }

    /**
     * @returns {Promise<Record<string, UserAccountWithPassword>>} a collection of UserAccount
     */
    _read = async () => {
        const pool = mariadb.createPool(this.poolParams);
        let conn;
        try {
            conn = await pool.getConnection();
            const query = `SELECT ${this.sqlConfig.loginColumn}, ${this.sqlConfig.passwordColumn}, ${this.sqlConfig.groupsColumn} FROM ${this.sqlConfig.table}`;
            const rows = await conn.query(query);
            const users = rows.map((row) => {
                return [
                    row[this.sqlConfig.loginColumn],
                    {
                        id: row[this.sqlConfig.loginColumn],
                        _type: "user",
                        password: row[this.sqlConfig.passwordColumn],
                        login: row[this.sqlConfig.loginColumn],
                        groups: row[this.sqlConfig.groupsColumn].split(","),
                        source: "database",
                    },
                ];
            });
            return Object.fromEntries(users);
        } finally {
            if (conn) conn.release();
        }
    };

    /**
     * @param {string} login - user login
     * @returns {Promise<UserAccountWithPassword | undefined>} a UserAccount
     */
    _readOne = async (login) => {
        const pool = mariadb.createPool(this.poolParams);
        let conn;
        try {
            conn = await pool.getConnection();
            const query = `SELECT ${this.sqlConfig.loginColumn}, ${this.sqlConfig.passwordColumn}, ${this.sqlConfig.groupsColumn} FROM ${this.sqlConfig.table} WHERE ${this.sqlConfig.loginColumn} = ?`;
            const rows = await conn.query(query, [login]);
            if (rows.length === 1) {
                return {
                    id: rows[0].login,
                    _type: "user",
                    password: rows[0][this.sqlConfig.passwordColumn],
                    login: rows[0][this.sqlConfig.loginColumn],
                    groups: rows[0][this.sqlConfig.groupsColumn].split(","),
                    source: "database",
                };
            }
            return undefined;
        } finally {
            if (conn) conn.release();
        }
    };

    /**
     * @param {string} str
     */
    _isAlphaNum = (str) => {
        const exp = /^([0-9]|[a-z])+([0-9a-z]+)$/i;
        if (!str.match(exp)) {
            return false;
        }
        return true;
    };

    /**
     * @param {UserAccountWithPassword} userAccount
     */
    _writeOne = async (userAccount) => {
        const pool = mariadb.createPool(this.poolParams);
        let conn;
        try {
            conn = await pool.getConnection();
            const groupsString = userAccount.groups.join(",");
            const query = `INSERT INTO user (${this.sqlConfig.loginColumn}, ${this.sqlConfig.passwordColumn}, ${this.sqlConfig.groupsColumn}) VALUES (?, ?, ?)`;
            await conn.query(query, [userAccount.login, userAccount.password, groupsString]);
        } finally {
            if (conn) conn.release();
        }
    };

    /**
     * @param {UserAccountWithPassword} userAccount
     */
    _updateOne = async (userAccount) => {
        const pool = mariadb.createPool(this.poolParams);
        let conn;
        conn = await pool.getConnection();
        try {
            const groupsString = userAccount.groups.join(",");
            let query, values;
            if (Object.keys(userAccount).includes("password")) {
                query = `UPDATE user SET ${this.sqlConfig.passwordColumn} = ?, ${this.sqlConfig.groupsColumn} = ? WHERE ${this.sqlConfig.loginColumn} = '${userAccount.login}'`;
                values = [userAccount.password, groupsString];
            } else {
                query = `UPDATE user SET ${this.sqlConfig.groupsColumn} = ? WHERE ${this.sqlConfig.loginColumn} = '${userAccount.login}'`;
                values = [groupsString];
            }
            await conn.query(query, values);
        } finally {
            if (conn) conn.release();
        }
    };

    /**
     * @param {UserAccountWithPassword} newUserAccount
     */
    addUserAccount = async (newUserAccount) => {
        await lock.acquire("UsersThread");
        try {
            const userAccounts = await this._read();
            if (newUserAccount.id === undefined) newUserAccount.id = newUserAccount.login;
            // hash password
            newUserAccount.password = bcrypt.hashSync(newUserAccount.password, 10);
            if (Object.keys(userAccounts).includes(newUserAccount.id)) {
                throw Error("UserAccount exists already, try updating it.");
            }
            await this._writeOne(newUserAccount);
        } finally {
            lock.release("UsersThread");
        }
    };

    /**
     * @param {UserAccountWithPassword} modifiedUserAccount
     */
    updateUserAccount = async (modifiedUserAccount) => {
        await lock.acquire("UsersThread");
        try {
            // hash password if exists
            if (Object.keys(modifiedUserAccount).includes("password")) {
                modifiedUserAccount.password = bcrypt.hashSync(modifiedUserAccount.password, 10);
            }
            const userAccounts = await this._read();
            if (!Object.keys(userAccounts).includes(modifiedUserAccount.login)) {
                throw Error("UserAccount does not exist, try adding it.");
            }
            await this._updateOne(modifiedUserAccount);
        } finally {
            lock.release("UsersThread");
        }
    };
}

const userModel = config.auth === "database" ? new UserModelDatabase(config.authenticationDatabase) : new UserModelJson(configUsersPath);

module.exports = { UserModelJson, UserModelDatabase, userModel };
