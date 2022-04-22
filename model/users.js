const fs = require("fs");

/**
 * @typedef {Object} UserAccount
 * @prop {string} id
 * @prop {string} login
 * @prop {string[]} groups
 * @prop {string} source
 * @prop {"user"} _type
 */

class UserModel {
    constructor(configPath) {
        this.configPath = configPath;
        this.userPath = this.configPath + "/users/users.json";
    }

    /**
     * @returns {Promise<Record<string, UserAccount>>} a collection of UserAccount
     */

    getUserAccounts = async () => {
        const data = await fs.promises.readFile(this.userPath);
        const users = {};
        Object.entries(JSON.parse(data)).map(([key, value]) => {
            users[key] = {
                id: value.id,
                login: value.login,
                groups: value.groups,
                source: value.source,
                _type: value._type,
            };
        });
        return users;
    };
}

const userModel = new UserModel("config");

module.exports = { userModel, UserModel };
