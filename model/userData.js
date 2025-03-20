const { z } = require("zod");
const { cleanupConnection, getKnexConnection } = require("./utils");
const { readMainConfig } = require("./config");

const UserDataObject = z
    .object({
        id: z.number().positive().optional(),
        data_path: z.string(),
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
        owned_by: z.string(),
    })
    .strict();

class UserDataModel {
    constructor() {
        this._mainConfig = readMainConfig();
    }

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

    all = async (currentUser) => {
        const connection = getKnexConnection(this._mainConfig.database);
        if ((currentUser === undefined) & (this._mainConfig.auth === "disabled")) {
            currentUser = { login: "admin", groups: ["admin"] };
        }
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

        const connection = getKnexConnection(this._mainConfig.database);
        data.owned_by = parseInt(data.owned_by);
        const results = await connection.insert(data, ["id"]).into("user_data");
        cleanupConnection(connection);
        return results;
    };

    remove = async (identifier) => {
        this._checkIdentifier(identifier);

        const connection = getKnexConnection(this._mainConfig.database);
        const results = await connection.select("id").from("user_data").where("id", identifier).first();
        if (results === undefined) {
            cleanupConnection(connection);
            throw Error("The specified identifier do not exists", { cause: 404 });
        }

        // using select here allows mocking in tests
        await connection.select("*").from("user_data").where("id", identifier).del();
        cleanupConnection(connection);
        return true;
    };

    update = async (userData) => {
        if (Object.hasOwn(userData, "created_at")) {
            delete userData.created_at;
        }
        const data = this._check(userData);

        const connection = getKnexConnection(this._mainConfig.database);
        let results = await connection.select("id").from("user_data").where("id", data.id).first();
        if (results === undefined) {
            cleanupConnection(connection);
            throw Error("The specified identifier do not exists", { cause: 404 });
        }

        results = await connection.select("*").from("users").where("login", data.owned_by).first();
        if (results === undefined) {
            cleanupConnection(connection);
            throw Error("The specified owned_by do not exists", { cause: 404 });
        }
        data.owned_by = results.id;
        await connection.update(data).into("user_data").where("id", data.id);
        cleanupConnection(connection);
        return true;
    };
}

const userDataModel = new UserDataModel();
module.exports = { UserDataModel, userDataModel };
