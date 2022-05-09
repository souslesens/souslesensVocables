const fs = require("fs");
const { configPath: defaultConfigPath } = require("./config");

/**
 * @typedef {import("./UserTypes").UserAccounts} UserAccounts
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
     * @returns {Promise<UserAccounts>} a collection of UserAccount
     */
    getUserAccounts = async () => {
        const data = await fs.promises.readFile(this.userPath);
        /**
         * @type {UserAccounts}
         */
        const users = {};
        Object.entries(JSON.parse(data.toString())).map(([key, value]) => {
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

const userModel = new UserModel(defaultConfigPath);

module.exports = { userModel, UserModel };
