const { knex } = require("knex");
const { z } = require("zod");

const { readMainConfig } = require("./config");
const { userModel } = require("./users");
const { profileModel } = require("./profiles");

const UserDataObject = z
    .object({
        id: z.number().positive().optional(),
        data_path: z.string(),
        data_type: z.string(),
        data_label: z.string().default(""),
        data_comment: z.string().default(""),
        data_group: z.string().default(""),
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

    _remove_not_existing_users_from_shared_users = async (shared_users) => {
        const all_users = await userModel.getUserAccounts();
        const existing_login = Object.values(all_users).map((u) => u.login);
        const results = shared_users.filter((shared_user) => {
            if (existing_login.includes(shared_user)) {
                return true;
            }
        });
        return results;
    };

    _remove_not_existing_profiles_from_shared_profiles = async (shared_profiles) => {
        const all_profiles = await profileModel.getAllProfiles();
        const existing_profiles = Object.values(all_profiles).map((p) => p.name);
        const results = shared_profiles.filter((shared_profile) => {
            if (existing_profiles.includes(shared_profile)) {
                return true;
            }
        });
        return results;
    };

    _checkIdentifier = (identifier) => {
        const checkId = z.number().positive().safeParse(identifier);
        if (!checkId.success) {
            throw Error("Wrong format for the identifier", { cause: 400 });
        }
    };

    /**
     * Retrieve the Postgres connection from the configuration information
     *
     * @returns {knex} - the knex connection instance configure to use Postgres
     */
    _getConnection = () => {
        return knex({ client: "pg", connection: this._mainConfig.database });
    };

    all = async (currentUser) => {
        const connection = this._getConnection();
        if ((currentUser === undefined) & (this._mainConfig.auth === "disabled")) {
            currentUser = { login: "admin", groups: ["admin"] };
        }
        let currentUserData = await connection.select("*").from("user_data_list").where("owned_by", currentUser.login).orWhere("is_shared", true);

        currentUserData = currentUserData.filter((data) => {
            const isOwner = data.owned_by === currentUser.login;
            const isSharedWithUser = data.is_shared && data.shared_users.includes(currentUser.login);
            const isSharedWithGroup = data.is_shared && new Set(currentUser.groups.filter((grp) => new Set(data.shared_profiles).has(grp))).size;
            return isOwner || isSharedWithUser || isSharedWithGroup;
        });

        connection.destroy();
        return currentUserData;
    };

    find = async (identifier) => {
        this._checkIdentifier(identifier);

        const connection = this._getConnection();
        const results = await connection.select("*").from("user_data_list").where("id", identifier).first();
        if (results === undefined) {
            connection.destroy();
            throw Error("The specified identifier do not exists", { cause: 404 });
        }

        connection.destroy();
        return results;
    };

    insert = async (userData) => {
        const data = this._check(userData);

        const connection = this._getConnection();
        const results = await connection.select("id").from("users").where("login", data.owned_by).first();
        if (results === undefined) {
            connection.destroy();
            throw Error("The specified owned_by username do not exists", { cause: 404 });
        }
        data.shared_users = await this._remove_not_existing_users_from_shared_users(data.shared_users);
        data.shared_profiles = await this._remove_not_existing_profiles_from_shared_profiles(data.shared_profiles);
        data.owned_by = results.id;
        await connection.insert(data).into("user_data");
        connection.destroy();
    };

    remove = async (identifier) => {
        this._checkIdentifier(identifier);

        const connection = this._getConnection();
        const results = await connection.select("id").from("user_data").where("id", identifier).first();
        if (results === undefined) {
            connection.destroy();
            throw Error("The specified identifier do not exists", { cause: 404 });
        }

        await connection("user_data").where("id", identifier).del();
        connection.destroy();
    };

    update = async (userData) => {
        const data = this._check(userData);

        const connection = this._getConnection();
        let results = await connection.select("id").from("user_data").where("id", data.id).first();
        if (results === undefined) {
            connection.destroy();
            throw Error("The specified identifier do not exists", { cause: 404 });
        }

        results = await connection.select("id").from("users").where("login", data.owned_by).first();
        if (results === undefined) {
            connection.destroy();
            throw Error("The specified owned_by do not exists", { cause: 404 });
        }
        data.shared_users = await this._remove_not_existing_users_from_shared_users(data.shared_users);
        data.shared_profiles = await this._remove_not_existing_profiles_from_shared_profiles(data.shared_profiles);
        data.owned_by = results.id;
        await connection.update(data).into("user_data").where("id", data.id);
        connection.destroy();
    };
}

const userDataModel = new UserDataModel();
module.exports = { UserDataModel, userDataModel };
