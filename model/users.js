const fs = require("fs");
const bcrypt = require("bcrypt");
const { configPath: defaultConfigPath } = require("./config");
const { Lock } = require("async-await-mutex-lock");
/**
 * @typedef {import("./UserTypes").UserAccountWithPassword} UserAccountWithPassword
 * @typedef {import("./UserTypes").UserAccount} UserAccount
 */
const lock = new Lock();
/**
 * UserModel provides add/get/update/remove operations on the
 * user database (the JSON file at `<configPath>/users/users.json`)
 */

class UserModel {
    /**
     * @param {string} configPath - path of the config directory
     */
    constructor(configPath) {
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

const userModel = new UserModel(defaultConfigPath);

module.exports = { userModel, UserModel };
