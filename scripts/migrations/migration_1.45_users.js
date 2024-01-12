const fs = require("fs");
const path = require("path");
const yargs = require("yargs");
const ULID = require("ulid");
const { createHash } = require("crypto");

const argv = yargs.alias("c", "config").describe("c", "Path to config directory").demandOption(["c"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const usersFilePath = path.resolve(argv.config + "/users/users.json");

fs.readFile(usersFilePath, (_err, rawData) => {
    const data = JSON.parse(rawData);
    const lData = Object.entries(data);
    const lNewData = lData.map(([key, user]) => {
        if (!user.token) {
            const hashedLogin = createHash("sha256").update(key).digest("hex");
            const ulid = ULID.ulid();
            user.token = `sls-${ulid.toLowerCase()}${hashedLogin.substring(0, 5)}`;
        }
        return [user.login, user];
    });
    const newData = Object.fromEntries(lNewData);

    if (argv.w) {
        fs.writeFileSync(usersFilePath, JSON.stringify(newData, null, 2));
    } else {
        console.log(newData);
    }
});
