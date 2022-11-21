const fs = require("fs");
const yargs = require("yargs");

const argv = yargs.alias("f", "file").describe("f", "Path to users file").demandOption(["f"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const usersFilePath = argv.file;

fs.readFile(usersFilePath, (_err, rawData) => {
    const data = JSON.parse(rawData);
    const lData = Object.entries(data);
    const lNewData = lData.map(([_key, user]) => {
        return [user.login, user]
    });
    const newData = Object.fromEntries(lNewData);

    if (argv.w) {
        fs.writeFileSync(usersFilePath, JSON.stringify(newData, null, 2));
    } else {
        console.log(newData);
    }
});
