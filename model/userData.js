const fs = require("fs");
const path = require("path");

const ULID = require("ulid");
const { z } = require("zod");

const { cleanupConnection, getKnexConnection } = require("./utils");
const { readMainConfig } = require("./config");

const UserDataObject = z
    .object({
        id: z.number().positive().optional(),
        data_type: z.string(),
        data_label: z.string().default(""),
        data_comment: z.string().default(""),
        data_group: z.string().default(""),
        data_tool: z.string().default(""),
        data_source: z.string().default(""),
        data_content: z.record(z.string(), z.any()).default({}),
        is_shared: z.boolean().default(false),
        shared_profiles: z.string().array().default([]),
        shared_users: z.string().array().default([]),
        owned_by: z.string().optional(),
    })
    .strict();

class UserDataModel {
    constructor(dataPath = "data") {
        this._dataPath = dataPath;
        this._mainConfig = readMainConfig();
    }

    /**
     * Check if the specified text if allowed by the backend
     *
     * @param {string} text - the text to check
     * @returns {boolean} - true if the text is allowed, false otherwise
     */
    _allowedStringLength = (text) => {
        const size = new TextEncoder().encode(text).length;
        return size <= this._mainConfig.userData.maximumFileSize;
    };

    /**
     * Run zod to validate the received data
     *
     * @param {UserData} data - the user data to validate
     * @returns {UserData} - the response from the zod parser if success
     */
    _check = (data) => {
        const check = UserDataObject.safeParse(data);
        if (!check.success) {
            throw Error(`The user data do not follow the standard: ${JSON.stringify(check.error.issues)}`, { cause: 400 });
        }
        return check.data;
    };

    _checkIdentifier = (identifier) => {
        const checkId = z.number().positive().safeParse(identifier);
        if (!checkId.success) {
            throw Error("Wrong format for the identifier", { cause: 400 });
        }
    };

    /**
     * Convert the attributes with wrong type for testing purpose
     *
     * @param {UserData} data - the user data to convert
     * @returns {UserData} - the converted object with the correct types
     */
    _convertToJSON = (data) => ({
        ...data,
        data_content: (typeof data.data_content === "string" ? JSON.parse(data.data_content) : data.data_content) || {},
        is_shared: (typeof data.is_shared === "number" ? data.is_shared === 1 : data.is_shared) || false,
        shared_profiles: (typeof data.shared_profiles === "string" ? JSON.parse(data.shared_profiles) : data.shared_profiles) || [],
        shared_users: (typeof data.shared_users === "string" ? JSON.parse(data.shared_users) : data.shared_users) || [],
    });

    /**
     * Helper to retrieve the path to the data files storage
     *
     * @param {String} filename - the name of the file
     * @returns {String} - the absolute path to the file in the storage
     */
    _getStorage = (filename) => {
        return path.resolve(this._dataPath, "user_data", filename);
    };

    /**
     * Helper to have the admin user if the authentication was disabled
     *
     * @param {User} user – the user received from the request content
     * @returns {User} – the user from the request, an admin account otherwise
     */
    _getUser = (user) => {
        if ((user === undefined) & (this._mainConfig.auth === "disabled")) {
            return { login: "admin", groups: ["admin"] };
        }
        return user;
    };

    all = async (user) => {
        const connection = getKnexConnection(this._mainConfig.database);
        const currentUser = this._getUser(user);
        let currentUserData = await connection.select("*").from("user_data_list").where("owned_by", currentUser.login).orWhere("is_shared", true);

        currentUserData = currentUserData
            .map((data) => this._convertToJSON(data))
            .filter((data) => {
                const isOwner = data.owned_by === currentUser.login;
                const isSharedWithUser = data.is_shared && data.shared_users.includes(currentUser.login);
                const isSharedWithGroup = data.is_shared && new Set(currentUser.groups.filter((grp) => new Set(data.shared_profiles).has(grp))).size;
                return isOwner || isSharedWithUser || isSharedWithGroup;
            });

        cleanupConnection(connection);
        return currentUserData;
    };

    file = async (identifier, user) => {
        if (this._mainConfig.userData.location === "database") {
            throw Error("This function can only be used with the 'file' system", { cause: 405 });
        }

        this._checkIdentifier(identifier);

        const connection = getKnexConnection(this._mainConfig.database);
        let results = await connection.select("*").from("user_data_list").where("id", identifier).first();
        if (results === undefined) {
            cleanupConnection(connection);
            throw Error("The specified identifier do not exists", { cause: 404 });
        }

        results = await connection.select("*").from("users").where("login", user.login).first();
        if (results === undefined) {
            cleanupConnection(connection);
            throw Error("The specified owned_by do not exists", { cause: 404 });
        }

        const response = await connection
            .select("user_data.data_path")
            .from("user_data")
            .join("users", "users.id", "=", "user_data.owned_by")
            .where({
                "user_data.id": identifier,
                "users.login": this._getUser(user).login,
            })
            .orWhere({
                "user_data.id": identifier,
                "user_data.is_shared": true,
            })
            .first();
        if (response === undefined) {
            cleanupConnection(connection);
            throw Error("You are not allowed to see this file", { cause: 403 });
        }

        cleanupConnection(connection);

        const filePath = this._getStorage(response.data_path);
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath));
        } else {
            console.error(`The file ${filePath} was not found on the file system`);
            return {};
        }
    };

    find = async (identifier) => {
        this._checkIdentifier(identifier);

        const connection = getKnexConnection(this._mainConfig.database);
        const results = await connection.select("*").from("user_data").where("id", identifier).first();
        if (results === undefined) {
            cleanupConnection(connection);
            throw Error("The specified identifier do not exists", { cause: 404 });
        }

        cleanupConnection(connection);
        return results;
    };

    insert = async (userData) => {
        const data = this._check(userData);

        if (this._mainConfig.userData.location === "database" && !this._allowedStringLength(data.data_content)) {
            throw Error(`The specified content is too large for the database`, { cause: 413 });
        }

        const connection = getKnexConnection(this._mainConfig.database);
        const results = await connection.select("id").from("users").where("id", data.owned_by).first();
        if (results === undefined) {
            cleanupConnection(connection);
            throw Error("The specified owned_by username do not exists", { cause: 404 });
        }
        data.owned_by = results.id;

        // Store this value to write it later in a dedicated file
        const dataContent = data.data_content;

        // These attributes will be managed by the backend
        delete data.id;
        delete data.data_path;

        if (this._mainConfig.userData.location === "file") {
            delete data.data_content;
        }

        const insertedData = await connection.insert([data], ["id"]).into("user_data");
        const identifier = insertedData[0].id;

        if (this._mainConfig.userData.location === "file") {
            const fileName = `${identifier}-${results.id}-${ULID.ulid()}.json`;
            const filePath = this._getStorage(fileName);

            if (dataContent !== undefined) {
                if (!fs.existsSync(filePath)) {
                    // Create the data file in the storage directory
                    fs.writeFileSync(filePath, JSON.stringify(dataContent, null, 2));
                    // Update the data_path for the entry
                } else {
                    console.error(`The file ${filePath} exists, but this is a new entry`);
                }
            }

            await connection("user_data").where("id", identifier).update({ data_path: fileName });
        }

        cleanupConnection(connection);
        return identifier;
    };

    remove = async (identifier, user) => {
        this._checkIdentifier(identifier);

        const connection = getKnexConnection(this._mainConfig.database);
        const results = await connection.select("*").from("user_data").where("id", identifier).first();
        if (results === undefined) {
            cleanupConnection(connection);
            throw Error("The specified identifier do not exists", { cause: 404 });
        }
        if (user.login !== "admin" && user.id.toString() !== results.owned_by.toString()) {
            cleanupConnection(connection);
            throw Error(`The resources is not owned by ${user.login}`, { cause: 404 });
        }

        if (this._mainConfig.userData.location === "file") {
            const filePath = this._getStorage(results.data_path);
            if (fs.existsSync(filePath)) {
                fs.rmSync(filePath);
            } else {
                console.error(`The file ${filePath} was not found for the entry ${identifier}`);
            }
        }

        await connection.from("user_data").where("id", identifier).del();
        cleanupConnection(connection);
        return true;
    };

    update = async (userData) => {
        if (Object.hasOwn(userData, "created_at")) {
            delete userData.created_at;
        }
        const data = this._check(userData);

        if (this._mainConfig.userData.location === "database" && !this._allowedStringLength(data.data_content)) {
            throw Error(`The specified content is too large for the database`, { cause: 413 });
        }

        const connection = getKnexConnection(this._mainConfig.database);
        const results = await connection.select("id", "data_path").from("user_data").where("id", data.id).first();
        if (results === undefined) {
            cleanupConnection(connection);
            throw Error("The specified identifier do not exists", { cause: 404 });
        }

        const dataPath = results.data_path;

        const user = await connection.select("*").from("users").where("id", data.owned_by).first();
        if (user === undefined) {
            cleanupConnection(connection);
            throw Error("The specified owned_by do not exists", { cause: 404 });
        }
        data.owned_by = user.id;

        if (this._mainConfig.userData.location === "file") {
            // Only update the data content when the attribute is in the request
            if (data.data_content !== undefined) {
                const filePath = this._getStorage(dataPath);
                fs.writeFileSync(filePath, JSON.stringify(userData.data_content, null, 2));
            }

            delete data.data_content;
        }

        // This attribute cannot be updated manually!
        delete data.data_path;

        await connection.update(data).into("user_data").where("id", data.id);

        cleanupConnection(connection);
        return true;
    };
}

const userDataModel = new UserDataModel();
module.exports = { UserDataModel, userDataModel };
