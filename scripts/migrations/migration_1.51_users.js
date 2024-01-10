const fs = require("fs");
const yargs = require("yargs");
const path = require("path");

const argv = yargs.alias("c", "config").describe("c", "Path to config directory").demandOption(["c"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const sourcesFilePath = path.resolve(argv.config + "/sources.json");
const usersFilePath = path.resolve(argv.config + "/users/users.json");

fs.readFile(sourcesFilePath, (_err, rawData) => {
    const data = JSON.parse(rawData);
    const lData = Object.entries(data);
    const lNewData = lData.map(([id, source]) => {
        if (!source.hasOwnProperty("owner")) {
            source.owner = "admin";
        }
        if (!source.hasOwnProperty("published")) {
            source.published = true;
        }
        return [id, source];
    });
    const newData = Object.fromEntries(lNewData);

    if (argv.w) {
        fs.writeFileSync(sourcesFilePath, JSON.stringify(newData, null, 2));
    } else {
        console.log(newData);
    }
});

fs.readFile(usersFilePath, (_err, rawData) => {
    const data = JSON.parse(rawData);
    const lData = Object.entries(data);
    const lNewData = lData.map(([id, user]) => {
        if (!user.hasOwnProperty("allowSourceCreation")) {
            user.allowSourceCreation = false;
        }
        if (!user.hasOwnProperty("maxNumberCreatedSource")) {
            user.maxNumberCreatedSource = 5;
        }
        return [id, user];
    });
    const newData = Object.fromEntries(lNewData);

    if (argv.w) {
        fs.writeFileSync(usersFilePath, JSON.stringify(newData, null, 2));
    } else {
        console.log(newData);
    }
});
