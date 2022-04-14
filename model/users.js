const path = require("path");
const fs = require("fs");
const usersJSON = path.resolve("config/users/users.json");
const bcrypt = require("bcrypt");

const getUsers = () => {
    fs.readFile(usersJSON, "utf8", (err, data) => {
        if (err) {
            throw Error("I couldn't read users.json");
        } else {
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
        }
    });
};

module.exports = { getUsers };
