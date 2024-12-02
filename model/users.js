const fs = require("fs");
const bcrypt = require("bcrypt");
const { readMainConfig, configUsersPath } = require("./config");
const { Lock } = require("async-await-mutex-lock");
const mariadb = require("mariadb");
const ULID = require("ulid");
const { createHash } = require("crypto");

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
            usersNoPasswords[key] = {
                id: value.id,
                login: value.login,
                groups: value.groups,
                _type: value._type,
                source: value.source,
                allowSourceCreation: value.allowSourceCreation,
                maxNumberCreatedSource: value.maxNumberCreatedSource,
            };
        });
        return usersNoPasswords;
    };

    /**
     * @param {string} login
     * @returns {Promise<UserAccount | undefined>} a user account
     */
    findUserAccount = async (login) => {
        const userAccount = await this._readOne(login);
        if (userAccount) {
            return {
                id: userAccount.id,
                login: userAccount.login,
                groups: userAccount.groups,
                source: userAccount.source,
                token: userAccount.token,
                _type: userAccount._type,
                allowSourceCreation: userAccount.allowSourceCreation,
                maxNumberCreatedSource: userAccount.maxNumberCreatedSource,
            };
        }
        return undefined;
    };

    /**
     * @param {string} token
     * @returns {Promise<UserAccount | undefined>} a user account
     */
    findUserAccountFromToken = async (token) => {
        const users = await this._read();

        return Object.entries(users)
            .map(([_id, user]) => user)
            .find((user) => user.token !== undefined && user.token === token);
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
     * @param {UserAccountWithPassword} newUserAccount
     */
    addUserAccount = async (newUserAccount) => {
        await lock.acquire("UsersThread");
        try {
            const userAccounts = await this._read();
            if (newUserAccount.id === undefined) newUserAccount.id = newUserAccount.login;
            if (newUserAccount.password) {
                // hash password
                newUserAccount.password = bcrypt.hashSync(newUserAccount.password, 10);
            }
            // add a token
            newUserAccount.token = this._genToken(newUserAccount.login);
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
     * @param {string} login - the user login
     * @returns {string} a token
     */
    _genToken = (login) => {
        const hashedLogin = createHash("sha256").update(login).digest("hex");
        const ulid = ULID.ulid();
        return `sls-${ulid.toLowerCase()}${hashedLogin.substring(0, 5)}`;
    };

    /**
     * @param {string} login - the user login
     * @returns {Promise<string>} the new user token
     */
    generateUserToken = async (login) => {
        const user = await this.findUserAccount(login);
        if (user) {
            user.token = this._genToken(login);
            await this.updateUserAccount(user);
            return user.token;
        }
        throw Error("UserAccount does not exist");
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

    /**
     * @param {string} login - the user login
     * @returns {boolean} the administrator status of the user
     */
    isAdmin = async (login) => {
        const user = await this.findUserAccount(login);
        if (!user) {
            throw Error("UserAccount does not exist");
        }

        return user.id === "admin" || user.groups.includes("admin");
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
        /*
        return Object.entries(users)
            .map(([_id, user]) => user)
            .find((user) => {
                user.login === login});
        */
        var ok = false;
        for (var key in users) {
            if (users[key].login === login) {
                ok = users[key];
            }
        }
        return ok;
    };

    /**
     * @param {Record<string,UserAccount>} userAccounts - a collection of UserAccount
     */
    _write = async (userAccounts) => {
        await fs.promises.writeFile(this.userPath, JSON.stringify(userAccounts, null, 2));
    };
}

const config = readMainConfig();
const userModel = new UserModelJson(configUsersPath);

module.exports = { UserModelJson, userModel };
