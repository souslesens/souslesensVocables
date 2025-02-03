const fs = require("fs");
const bcrypt = require("bcrypt");
const { readMainConfig, configUsersPath } = require("./config");
const { cleanupConnection, getKnexConnection } = require("./utils");
const { Lock } = require("async-await-mutex-lock");
const ULID = require("ulid");
const { createHash } = require("crypto");
const z = require("zod");

/**
 * @typedef {import("./UserTypes").UserAccountWithPassword} UserAccountWithPassword
 * @typedef {import("./UserTypes").UserAccount} UserAccount
 * @typedef {import("./UserTypes").SqlConfig} SqlConfig
 */

const UserObject = z
    .object({
        id: z.string().default(""), // Support for the ULID legacy system
        login: z.string(),
        password: z.string().optional(),
        groups: z.string().array().optional(),
        token: z.string().optional(),
        source: z.string().default("database"),
        allowSourceCreation: z.boolean().default(false),
        maxNumberCreatedSource: z.number().default(5),
        _type: z.string().default("user"),
    })
    .strict();

/**
 * UserModel provides add/get/update/remove operations on the
 * user database
 */

class UserModel {
    constructor() {
        this._mainConfig = readMainConfig();
    }

    /**
     * Run zod to validate the received user
     *
     * @param {User} user - the user to validate
     * @returns {User} - the response from the zod parser if success
     */
    _checkUser = (user) => {
        const check = UserObject.safeParse(user);
        if (!check.success) {
            throw Error(`The user do not follow the standard: ${JSON.stringify(check.error.issues)}`);
        }
        return check.data;
    };

    /**
     * Convert the user to follow the database schema
     *
     * @param {User} user - the user to convert
     * @returns {UserDatabase} - the converted object with the correct fields
     */
    _convertToDatabase = (user) => ({
        login: user.login,
        password: user.password || "",
        token: user.token || "",
        profiles: user.groups || [],
        create_source: user.allowSourceCreation || false,
        maximum_source: user.maxNumberCreatedSource || 5,
        auth: user.source || "database",
    });

    /**
     * Convert the user to restore the legacy JSON schema
     *
     * @param {User} user - the user to convert
     * @returns {User} - the converted object with the correct fields
     */
    _convertToLegacy = (user) => [
        user.login,
        {
            id: `${user.id}`,
            login: user.login,
            password: user.password || "",
            token: user.token || "",
            groups: user.profiles || [],
            allowSourceCreation: user.create_source || false,
            maxNumberCreatedSource: user.maximum_source || 5,
            source: user.auth || "database",
        },
    ];

    /**
     * @param {string} login - the user login
     * @returns {string} a token
     */
    _genToken = (login) => {
        const hashedLogin = createHash("sha256").update(login).digest("hex");
        const ulid = ULID.ulid();
        return `sls-${ulid.toLowerCase()}${hashedLogin.substring(0, 5)}`;
    };

    _comparePasswords = (password1, password2) => {
        if (password1.startsWith("$2b$") && bcrypt.compareSync(password2, password1)) {
            return true;
        }
        return password1 === password2;
    };

    _hashPassword = (password) => {
        if (password && !password.startsWith("$2b$")) {
            return bcrypt.hashSync(password, 10);
        }
        return password;
    };

    /**
     * @returns {Promise<Record<string,UserAccount>>} a collection of UserAccount
     */
    getUserAccounts = async () => {
        const conn = getKnexConnection(this._mainConfig.database);
        const results = await conn.select("*").from("public_users_list");
        cleanupConnection(conn);

        return Object.fromEntries(results.map((user) => this._convertToLegacy(user)));
    };

    getUserAccount = async (login) => {
        const conn = getKnexConnection(this._mainConfig.database);
        const user = await conn.select("*").from("users").where("login", login).first();
        cleanupConnection(conn);

        return user !== undefined ? this._convertToLegacy(user) : undefined;
    };

    /**
     * @param {string} login
     * @returns {Promise<UserAccount | undefined>} a user account
     */
    findUserAccount = async (login) => {
        if (login === undefined) {
            return undefined;
        }
        const conn = getKnexConnection(this._mainConfig.database);
        const user = await conn.select("*").from("users").where("login", login).first();
        cleanupConnection(conn);

        return user !== undefined ? this._convertToLegacy(user) : undefined;
    };

    /**
     * @param {string} token
     * @returns {Promise<UserAccount | undefined>} a user account
     */
    findUserAccountFromToken = async (token) => {
        const conn = getKnexConnection(this._mainConfig.database);
        const user = await conn.select("*").from("users").where("token", token).first();
        cleanupConnection(conn);

        return user !== undefined ? this._convertToLegacy(user) : undefined;
    };

    /**
     * @param {string} login
     * @param {string} password
     * @returns {boolean} true if login and password match, otherwise false
     */
    checkUserPassword = async (login, password) => {
        const conn = getKnexConnection(this._mainConfig.database);
        const user = await conn.select("password", "auth").from("users").where("login", login).first();
        cleanupConnection(conn);

        if (user === undefined) {
            return false; // The login do not exists in the database
        }

        if (user.auth === "database" || user.auth === "local") {
            return this._comparePasswords(user.password, password);
        }

        return false; // This is not managed by the SLS authenticator
    };

    /**
     * @param {UserAccountWithPassword} user
     */
    addUserAccount = async (user) => {
        const data = this._checkUser(user);
        data.password = this._hashPassword(data.password);
        data.token = this._genToken(data.login);

        const conn = getKnexConnection(this._mainConfig.database);
        const results = await conn.select("login").from("users").where("login", data.login).first();
        if (results !== undefined) {
            cleanupConnection(conn);
            throw Error("The user already exists, try updating it");
        }

        await conn.insert(this._convertToDatabase(data)).into("users");
        cleanupConnection(conn);
    };

    /**
     * @param {string} login - the user login
     * @returns {Promise<string>} the new user token
     */
    generateUserToken = async (login) => {
        const user = await this.findUserAccount(login);
        if (user === undefined) {
            throw Error("UserAccount does not exist");
        }

        user.token = this._genToken(login);
        await this.updateUserAccount(user);

        return user.token;
    };

    /**
     * @param {UserAccount} modifiedUserAccount
     */
    updateUserAccount = async (user) => {
        const data = this._checkUser(user);
        data.password = this._hashPassword(data.password);

        const conn = getKnexConnection(this._mainConfig.database);
        const results = await conn.select("login").from("users").where("login", data.login).first();
        if (results === undefined) {
            cleanupConnection(conn);
            throw Error("UserAccount does not exist, try adding it.");
        }

        await conn.update(this._convertToDatabase(data)).into("users").where("login", data.login);
        cleanupConnection(conn);
    };

    /**
     * @param {string} login - the user login
     */
    deleteUserAccount = async (login) => {
        const conn = getKnexConnection(this._mainConfig.database);
        const results = await conn.select("login").from("users").where("login", login).first();
        if (results === undefined) {
            cleanupConnection(conn);
            return false;
        }

        await conn("users").where("login", login).del();
        cleanupConnection(conn);
        return true;
    };

    /**
     * @param {string} login - the user login
     * @returns {boolean} the administrator status of the user
     */
    isAdmin = async (login) => {
        const conn = getKnexConnection(this._mainConfig.database);
        const user = await conn.select("login", "profiles").from("public_users_list").where("login", login).first();
        cleanupConnection(conn);

        if (user === undefined) {
            throw Error("UserAccount does not exist");
        }

        return user.login === "admin" || user.profiles.includes("admin");
    };
}

const userModel = new UserModel();

module.exports = { UserModel, userModel };
