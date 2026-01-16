import path from "path";
import fs from "fs";
import ulid from "ulid";
const sources = path.resolve("config/sources.json");
const profiles = path.resolve("config/profiles.json");
const users = path.resolve("config/users/users.json");
import bcrypt from "bcrypt";

async function sanitize(resource) {
    try {
        fs.readFile(resource, (_err, data) => {
            const parsedData = JSON.parse(data);
            const sanitizedData = Object.fromEntries(Object.entries(parsedData).map(([key, val]) => addFields(key, val)));
            //.reduce((obj, item) => ({ ...obj, [item.id]: item }), {})
            fs.writeFile(resource, JSON.stringify(sanitizedData, null, 2), (err) => {
                if (err) {
                    console.log(err);
                }
                console.log("Data successfully sanitized");
            });
        });
    } catch (e) {
        console.log("Err:", e);
    }
}

function hashPasswords() {
    try {
        fs.readFile(users, (_err, data) => {
            const hashedPassword = Object.fromEntries(
                Object.entries(JSON.parse(data)).map(([key, val]) => (val.password && !val.password.startsWith("$2b$") ? [key, { ...val, password: bcrypt.hashSync(val.password, 10) }] : [key, val]))
            );
            fs.writeFile(users, JSON.stringify(hashedPassword, null, 2), (err) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Password successfully hashed", hashedPassword);
                }
            });
        });
    } catch (e) {
        console.log("Err:", e);
    }
}

function addFields(key, val) {
    const id = ulid.ulid();
    const addId = val.id === undefined ? { ...val, id } : val;
    const addName = addId.name === undefined ? { ...val, name: key } : val;

    return [id, addName];
}
sanitize(sources);
sanitize(profiles);
sanitize(users);
hashPasswords();
