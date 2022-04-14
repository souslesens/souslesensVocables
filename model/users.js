const path = require("path");
const fs = require("fs");
const usersJSON = path.resolve("config/users/users.json");

const getUsers = () => {
    const data = fs.readFileSync(usersJSON, "utf8");
    const users = {};
    Object.entries(JSON.parse(data)).map(([key, value]) => {
        users[key] = {
            id: value.id,
            login: value.login,
            groups: value.groups,
            _type: value._type,
        };
    });
    return users;
};

module.exports = { getUsers };
