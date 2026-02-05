import bcrypt from "bcrypt";
import { readMainConfig } from "./config.js";
import { cleanupConnection, getKnexConnection } from "./utils.js";
import { userDataModel } from "./userData.js";
import ULID from "ulid";
import { createHash } from "crypto";
import z from "zod";

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
     * Note: Use `typeof` to retrieve the correct value when the test are
     * running with the sqlite backend.
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
            groups: (typeof user.profiles === "string" ? JSON.parse(user.profiles) : user.profiles) || [],
            allowSourceCreation: (typeof user.create_source === "number" ? user.create_source === 1 : user.create_source) || false,
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
     * @param {boolean} hideSensitiveData - don't return passwords and tokens
     * @returns {Promise<Record<string,UserAccount>>} a collection of UserAccount
     */
    getUserAccounts = async (hideSensitiveData = true) => {
        const conn = getKnexConnection(this._mainConfig.database);
        const table = hideSensitiveData ? "public_users_list" : "users";
        const results = await conn.select("*").from(table);
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
        if (token.trim().length === 0) {
            throw Error("The token cannot be empty or set with space only");
        }

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
     * @returns {number} the index in the database of the new user
     */
    addUserAccount = async (user) => {
        const data = this._checkUser(user);
        data.password = this._hashPassword(data.password);
        data.token = this._genToken(data.login);

        const conn = getKnexConnection(this._mainConfig.database);
        let results = await conn.select("login").from("users").where("login", data.login).first();
        if (results !== undefined) {
            cleanupConnection(conn);
            throw Error("The user already exists, try updating it");
        }

        results = await conn.insert(this._convertToDatabase(data)).into("users");
        cleanupConnection(conn);
        return results[0];
    };

    /**
     * @param {string} login - the user login
     * @returns {Promise<string>} the new user token
     */
    generateUserToken = async (login) => {
        const conn = getKnexConnection(this._mainConfig.database);

        const results = await conn.select("login").from("users").where("login", login).first();
        if (results === undefined) {
            cleanupConnection(conn);
            throw Error("UserAccount does not exist");
        }

        const token = this._genToken(login);

        await conn.update({ token: token }).into("users").where("login", login);
        cleanupConnection(conn);

        return token;
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
        const results = await conn.select("*").from("users").where("login", login).first();
        if (results === undefined) {
            cleanupConnection(conn);
            return false;
        }
        // remove userData owned by deleted user
        await conn.select("*").from("user_data").where("owned_by", results.id).del();
        // remove user login from userData.shared_user
        const allUserData = await conn.select("*").from("user_data");
        Object.values(allUserData).map((userData) => {
            if (userData.shared_users.includes(login)) {
                userData.shared_users = userData.shared_users.filter((u) => u !== login);
                userDataModel.update(userData);
            }
        });
        // remove user account
        // using select here allows mocking in tests
        await conn.select("*").from("users").where("login", login).del();
        cleanupConnection(conn);
        return true;
    };

    /**
     * @param {string} login - the user login
     * @returns {boolean} the administrator status of the user
     */
    isAdmin = async (login) => {
        // user is admin if auth is disabled
        if (login === "admin" && this._mainConfig.auth === "disabled") {
            return true;
        }

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

export { UserModel, userModel };
