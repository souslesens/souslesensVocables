const fs = require("fs");
const bcrypt = require("bcrypt");
const { config, configPath: defaultConfigPath } = require("./config");
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
        const userAccounts = await this.getUserAccounts();
        const findUserKey = Object.keys(userAccounts).find((key) => userAccounts[key].login == login);
        return findUserKey ? userAccounts[findUserKey] : undefined;
    };

    /**
     * @param {string} login
     * @param {string} password
     * @returns {boolean} true if login and password match, otherwise false
     */
    checkUserPassword = async (login, password) => {
        const userAccountsWithPassword = await this._read();
        const userKey = Object.keys(userAccountsWithPassword).find((key) => userAccountsWithPassword[key].login == login);
        if (!userKey) {
            // console.debug(`user ${login} not found`);
            return false;
        }
        const userAccount = userAccountsWithPassword[userKey];
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
     * @param {string} configPath - path of the config directory
     */
    constructor(configPath) {
        super();
        this.configPath = configPath;
        this.userPath = this.configPath + "/users/users.json";
    }

    /**
     * @returns {Promise<Record<string, UserAccountWithPassword>>} a collection of UserAccount
     */
    _read = async () => {
        return fs.promises.readFile(this.userPath).then((data) => JSON.parse(data.toString()));
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
            console.log("userAccount", userAccount);
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
            console.log("userAccounts", userAccounts);
            console.log("modifiedUserAccount", modifiedUserAccount);
            if (!Object.keys(userAccounts).includes(modifiedUserAccount.login)) {
                throw Error("UserAccount does not exist, try adding it.");
            }
            await this._updateOne(modifiedUserAccount);
        } finally {
            lock.release("UsersThread");
        }
    };
}

const userModelJson = new UserModelJson(defaultConfigPath);
const userModelDatabase = new UserModelDatabase(config.authenticationDatabase);
const userModel = config.auth === "database" ? userModelDatabase : userModelJson;

module.exports = { UserModelJson, UserModelDatabase, userModel };
