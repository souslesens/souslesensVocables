const path = require("path");
const fs = require("fs");
const usersJSON = path.resolve("config/users/users.json");

/**
 * @typedef {Object} UserAccount
 * @prop {string} id
 * @prop {string} login
 * @prop {string[]} groups
 * @prop {string} source
 * @prop {"user"} _type
 */

/**
 * @returns {Promise<Record<string, UserAccount>>} a collection of UserAccount
 */
const getUsers = async () => {
    const data = await fs.promises.readFile(usersJSON);
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

module.exports = { getUsers };
