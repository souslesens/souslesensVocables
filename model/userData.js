const { knex } = require("knex");
const { z } = require("zod");

const { readMainConfig } = require("./config");

const UserDataObject = z
    .object({
        id: z.number().positive().optional(),
        data_path: z.string(),
        data_type: z.string(),
        data_label: z.string().default(""),
        data_comment: z.string().default(""),
        data_group: z.string().default(""),
        data_content: z.record(z.string(), z.string()).default({}),
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
     * Retrieve the Postgres connection from the configuration information
     *
     * @returns {knex} - the knex connection instance configure to use Postgres
     */
    _getConnection = () => {
        return knex({ client: "pg", connection: this._mainConfig.database });
    };

    all = async () => {
        const connection = this._getConnection();
        const results = await connection.select("*").from("user_data_list");
        connection.destroy();
        return results;
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

        data.owned_by = results.id;
        await connection.update(data).into("user_data").where("id", data.id);
        connection.destroy();
    };
}

const userDataModel = new UserDataModel();
module.exports = { UserDataModel, userDataModel };
