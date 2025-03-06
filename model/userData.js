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
<<<<<<< HEAD
            throw Error(
                `The user data do not follow the standard: ${JSON.stringify(check.error.issues)}`,
                { cause: 400 },
            );
=======
            throw Error(`The user data do not follow the standard: ${JSON.stringify(check.error.issues)}`, { cause: 400 });
>>>>>>> origin/master
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

<<<<<<< HEAD
    all = async () => {
        const connection = this._getConnection();
        const results = await connection.select("*").from("user_data_list");
        connection.destroy();
        return results;
=======
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
>>>>>>> origin/master
    };

    find = async (identifier) => {
        this._checkIdentifier(identifier);

        const connection = this._getConnection();
<<<<<<< HEAD
        const results = await connection
            .select("*")
            .from("user_data_list")
            .where("id", identifier)
            .first();
=======
        const results = await connection.select("*").from("user_data_list").where("id", identifier).first();
>>>>>>> origin/master
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
<<<<<<< HEAD
        const results = await connection
            .select("id")
            .from("users")
            .where("login", data.owned_by)
            .first();
=======
        const results = await connection.select("id").from("users").where("login", data.owned_by).first();
>>>>>>> origin/master
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
<<<<<<< HEAD
        const results = await connection
            .select("id")
            .from("user_data")
            .where("id", identifier)
            .first();
=======
        const results = await connection.select("id").from("user_data").where("id", identifier).first();
>>>>>>> origin/master
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
<<<<<<< HEAD
        let results = await connection
            .select("id")
            .from("user_data")
            .where("id", data.id)
            .first();
=======
        let results = await connection.select("id").from("user_data").where("id", data.id).first();
>>>>>>> origin/master
        if (results === undefined) {
            connection.destroy();
            throw Error("The specified identifier do not exists", { cause: 404 });
        }

<<<<<<< HEAD
        results = await connection
            .select("id")
            .from("users")
            .where("login", data.owned_by)
            .first();
=======
        results = await connection.select("id").from("users").where("login", data.owned_by).first();
>>>>>>> origin/master
        if (results === undefined) {
            connection.destroy();
            throw Error("The specified owned_by do not exists", { cause: 404 });
        }

        data.owned_by = results.id;
<<<<<<< HEAD
        await connection
            .update(data)
            .into("user_data")
            .where("id", data.id);
=======
        await connection.update(data).into("user_data").where("id", data.id);
>>>>>>> origin/master
        connection.destroy();
    };
}

const userDataModel = new UserDataModel();
module.exports = { UserDataModel, userDataModel };
